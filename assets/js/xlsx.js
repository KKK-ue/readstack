/* ============================================================
   阅栈 ReadStack · 零依赖 Excel(.xlsx) 读写
   设计原则：
   1) 不依赖任何第三方库，纯 JS 实现。
   2) 写入采用 OOXML + ZIP(store 存储方式，无压缩) + CRC32，
      生成可被 Excel / WPS / 安卓端表格 App 直接打开的文件。
   3) 单元格统一使用 inlineStr（t="inlineStr"），避免 sharedStrings
      表，简化写入与读取。
   4) 读取端仅做 store 方式解包 + 正则解析工作表，不依赖 DOM，
      因此可在浏览器与 Node(vm) 中复用，便于回归测试。
   仅依赖 Uint8Array / Array，兼容性良好。
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- UTF-8 编解码（避免依赖 TextEncoder，保证跨环境一致） ---------- */
  function utf8Encode(str) {
    var bytes = [], i, c;
    str = String(str);
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
      else if (c >= 0xD800 && c < 0xDC00) {           // 代理对
        var c2 = str.charCodeAt(++i);
        var cp = 0x10000 + ((c & 0x3FF) << 10) + (c2 & 0x3FF);
        bytes.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
      } else bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
    return bytes;
  }
  function utf8Decode(bytes) {
    var out = '', i = 0, n = bytes.length, c, c2, c3, c4, cp;
    while (i < n) {
      c = bytes[i++];
      if (c < 0x80) out += String.fromCharCode(c);
      else if (c >= 0xC0 && c < 0xE0) { c2 = bytes[i++]; out += String.fromCharCode(((c & 0x1F) << 6) | (c2 & 0x3F)); }
      else if (c >= 0xE0 && c < 0xF0) {
        c2 = bytes[i++]; c3 = bytes[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) | ((c2 & 0x3F) << 6) | (c3 & 0x3F));
      } else if (c >= 0xF0) {
        c2 = bytes[i++]; c3 = bytes[i++]; c4 = bytes[i++];
        cp = ((c & 0x07) << 18) | ((c2 & 0x3F) << 12) | ((c3 & 0x3F) << 6) | (c4 & 0x3F);
        cp -= 0x10000;
        out += String.fromCharCode(0xD800 + ((cp >> 10) & 0x3FF), 0xDC00 + (cp & 0x3FF));
      } else out += String.fromCharCode(c);
    }
    return out;
  }

  /* ---------- CRC32 ---------- */
  function crc32(bytes) {
    var table = crc32.table || (crc32.table = (function () {
      var t = [], n, k, c;
      for (n = 0; n < 256; n++) {
        c = n;
        for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
      }
      return t;
    })());
    var crc = 0xFFFFFFFF, i;
    for (i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  /* ---------- 小端字节写入 ---------- */
  function pushU16(a, n) { a.push(n & 0xff, (n >>> 8) & 0xff); }
  function pushU32(a, n) { a.push(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff); }
  function u32le(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  /* ---------- ZIP（store 方式，无压缩） ---------- */
  function zip(files) {
    var out = [], central = [], offset = 0, i;
    for (i = 0; i < files.length; i++) {
      var f = files[i];
      var localOffset = offset;
      var nameBytes = utf8Encode(f.name);
      var data = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data);
      var size = data.length;
      var crc = crc32(data);
      var lh = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
      pushU32(lh, crc); pushU32(lh, size); pushU32(lh, size);
      pushU16(lh, nameBytes.length); pushU16(lh, 0);
      out = out.concat(lh, nameBytes, Array.prototype.slice.call(data));
      var ch = [0x50, 0x4b, 0x01, 0x02, 0x14, 0x00, 0x14, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
      pushU32(ch, crc); pushU32(ch, size); pushU32(ch, size);
      pushU16(ch, nameBytes.length); pushU16(ch, 0); pushU16(ch, 0); pushU16(ch, 0); pushU16(ch, 0);
      pushU32(ch, 0); pushU32(ch, localOffset);
      central.push({ head: ch, name: nameBytes });
      offset = out.length;
    }
    var cdStart = out.length;
    for (i = 0; i < central.length; i++) out = out.concat(central[i].head, central[i].name);
    var cdSize = out.length - cdStart;
    var eo = [0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00];
    pushU16(eo, files.length); pushU16(eo, files.length); pushU32(eo, cdSize); pushU32(eo, cdStart); pushU16(eo, 0);
    out = out.concat(eo);
    return new Uint8Array(out);
  }

  function unzip(buf) {
    if (!(buf instanceof Uint8Array)) buf = new Uint8Array(buf);
    var files = {}, off = 0, n = buf.length;
    while (off + 4 <= n) {
      if (buf[off] !== 0x50 || buf[off + 1] !== 0x4b || buf[off + 2] !== 0x03 || buf[off + 3] !== 0x04) break;
      var method = buf[off + 8] | (buf[off + 9] << 8);
      var compSize = u32le(buf, off + 18);
      var nameLen = buf[off + 26] | (buf[off + 27] << 8);
      var extraLen = buf[off + 28] | (buf[off + 29] << 8);
      var name = utf8Decode(buf.subarray(off + 30, off + 30 + nameLen));
      var dataStart = off + 30 + nameLen + extraLen;
      var data = buf.subarray(dataStart, dataStart + compSize);
      if (method === 0) files[name] = data;
      off = dataStart + compSize;
    }
    return files;
  }

  /* ---------- XML 辅助 ---------- */
  function escXml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function decodeXml(s) {
    return String(s == null ? '' : s)
      .replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<').replace(/&amp;/g, '&');
  }
  function colLetter(idx) {            // 0-based → A, B, ... Z, AA ...
    var s = ''; idx++;
    while (idx > 0) {
      var r = idx % 26; if (r === 0) { r = 26; idx--; }
      s = String.fromCharCode(64 + r) + s; idx = Math.floor(idx / 26);
    }
    return s;
  }
  function cellXml(ri, ci, val) {
    var ref = colLetter(ci) + (ri + 1);
    if (typeof val === 'number' && isFinite(val)) return '<c r="' + ref + '"><v>' + val + '</v></c>';
    var txt = (val == null ? '' : String(val));
    return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + escXml(txt) + '</t></is></c>';
  }
  function sheetXml(rows) {
    var body = '';
    for (var ri = 0; ri < rows.length; ri++) {
      var cells = '', row = rows[ri] || [];
      for (var ci = 0; ci < row.length; ci++) cells += cellXml(ri, ci, row[ci]);
      body += '<row r="' + (ri + 1) + '">' + cells + '</row>';
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + body + '</sheetData></worksheet>';
  }

  /* ---------- 工作簿结构 ---------- */
  function write(sheets) {
    sheets = sheets || [];
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>';
    var sheetEls = '', relEls = '';
    for (var i = 0; i < sheets.length; i++) {
      var sid = i + 1, rid = 'rId' + sid;
      ct += '<Override PartName="/xl/worksheets/sheet' + sid + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      sheetEls += '<sheet name="' + escXml(sheets[i].name) + '" sheetId="' + sid + '" r:id="' + rid + '"/>';
      relEls += '<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + sid + '.xml"/>';
    }
    ct += '</Types>';
    var rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>';
    var workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheetEls + '</sheets></workbook>';
    var workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + relEls + '</Relationships>';

    var files = [
      { name: '[Content_Types].xml', data: utf8Encode(ct) },
      { name: '_rels/.rels', data: utf8Encode(rootRels) },
      { name: 'xl/workbook.xml', data: utf8Encode(workbook) },
      { name: 'xl/_rels/workbook.xml.rels', data: utf8Encode(workbookRels) }
    ];
    for (var j = 0; j < sheets.length; j++) {
      files.push({ name: 'xl/worksheets/sheet' + (j + 1) + '.xml', data: utf8Encode(sheetXml(sheets[j].rows || [])) });
    }
    return zip(files);
  }

  /* ---------- 读取 ---------- */
  function parseWorkbook(xml) {
    var out = [], re = /<sheet\b([^>]*)>/g, m;
    while ((m = re.exec(xml))) {
      var a = m[1];
      var name = /name="([^"]*)"/.exec(a);
      var rid = /r:id="([^"]*)"/.exec(a);
      out.push({ name: name ? name[1] : '', rid: rid ? rid[1] : '' });
    }
    return out;
  }
  function parseRels(xml) {
    var map = {}, re = /<Relationship\b([^>]*)\/?>/g, m;
    while ((m = re.exec(xml))) {
      var a = m[1];
      var id = /Id="([^"]*)"/.exec(a);
      var tgt = /Target="([^"]*)"/.exec(a);
      if (id && tgt) map[id[1]] = tgt[1];
    }
    return map;
  }
  function parseCells(s) {
    var cells = [], re = /<c\b[^>]*>([\s\S]*?)<\/c>/g, m;
    while ((m = re.exec(s))) {
      var inner = m[1];
      var t = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner);
      if (t) { cells.push(decodeXml(t[1])); continue; }
      var v = /<v>([\s\S]*?)<\/v>/.exec(inner);
      if (v) { var num = Number(v[1]); cells.push(isNaN(num) ? v[1] : num); continue; }
      cells.push('');
    }
    return cells;
  }
  function parseSheet(xml) {
    var rows = [], re = /<row\b[^>]*>([\s\S]*?)<\/row>/g, m;
    while ((m = re.exec(xml))) rows.push(parseCells(m[1]));
    return rows;
  }
  function read(buf) {
    var files = unzip(buf);
    var wb = files['xl/workbook.xml'];
    if (!wb) throw new Error('不是有效的 Excel 文件');
    var meta = parseWorkbook(utf8Decode(wb));
    var rels = files['xl/_rels/workbook.xml.rels'];
    var map = rels ? parseRels(utf8Decode(rels)) : {};
    var result = [];
    for (var i = 0; i < meta.length; i++) {
      var target = map[meta[i].rid] || '';
      var key = 'xl/' + target.replace(/^\.\//, '');
      var data = files[key];
      if (!data) continue;
      result.push({ name: meta[i].name, rows: parseSheet(utf8Decode(data)) });
    }
    if (!result.length) throw new Error('Excel 中未找到工作表');
    return result;
  }

  global.RS = global.RS || {};
  global.RS.XLSX = { write: write, read: read, _zip: zip, _unzip: unzip };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
