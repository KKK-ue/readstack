/* ============================================================
   阅栈 ReadStack · 纯 SVG 图表引擎（零依赖，单次字符串渲染）
   ============================================================ */
(function (global) {
  'use strict';

  var PALETTE = [
    '#8CBEFB', '#B0A9F5', '#FFA6CC', '#7FD1C0', '#FFC98B',
    '#A9CDFF', '#D3A6E8', '#FF9EB5', '#96DCC4', '#C6D2FF',
    '#F5B8D8', '#BFD4F0'
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------- 渐变定义 ---------- */
  function defs(id) {
    return '<defs>' +
      '<linearGradient id="' + id + '" x1="0" y1="1" x2="0" y2="0">' +
        '<stop offset="0%" stop-color="#A9D3FF"/>' +
        '<stop offset="55%" stop-color="#C0BEFF"/>' +
        '<stop offset="100%" stop-color="#FFB4D6"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + id + '-h" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0%" stop-color="#93C6FF"/>' +
        '<stop offset="100%" stop-color="#FFAED2"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + id + '-a" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="rgba(147,198,255,.34)"/>' +
        '<stop offset="100%" stop-color="rgba(255,174,210,.02)"/>' +
      '</linearGradient>' +
    '</defs>';
  }

  /* ============================================================
     环形图（分类占比）
     ============================================================ */
  function donut(data, opts) {
    opts = opts || {};
    var size = opts.size || 128, sw = opts.stroke || 20;
    var r = (size - sw) / 2, cx = size / 2, cy = size / 2;
    var total = data.reduce(function (s, d) { return s + d.value; }, 0);
    if (!total) return '';
    var C = 2 * Math.PI * r, acc = 0, seg = '';

    data.forEach(function (d, i) {
      var frac = d.value / total;
      var len = frac * C;
      var color = d.color || PALETTE[i % PALETTE.length];
      seg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" ' +
        'stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="butt" ' +
        'stroke-dasharray="' + (len - 1.6).toFixed(2) + ' ' + (C - len + 1.6).toFixed(2) + '" ' +
        'stroke-dashoffset="' + (-acc).toFixed(2) + '" ' +
        'transform="rotate(-90 ' + cx + ' ' + cy + ')">' +
        '<animate attributeName="stroke-dasharray" from="0 ' + C + '" ' +
        'to="' + (len - 1.6).toFixed(2) + ' ' + (C - len + 1.6).toFixed(2) + '" dur="0.6s" fill="freeze"/>' +
        '</circle>';
      acc += len;
    });

    var center = '';
    if (opts.centerTop || opts.centerBottom) {
      center =
        '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" ' +
        'font-size="21" font-weight="800" fill="#1B2439" letter-spacing="-.5">' + esc(opts.centerTop) + '</text>' +
        '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" font-size="10" fill="#8B96AE">' +
        esc(opts.centerBottom) + '</text>';
    }
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + seg + center + '</svg>';
  }

  function legend(data, total) {
    return '<div class="legend">' + data.map(function (d, i) {
      var c = d.color || PALETTE[i % PALETTE.length];
      var pc = total ? Math.round(d.value / total * 100) : 0;
      return '<div class="legend-item">' +
        '<i class="dot" style="background:' + c + '"></i>' +
        '<span class="nm">' + esc(d.name) + '</span>' +
        '<span class="vl">' + d.value + '</span>' +
        '<span class="pc">' + pc + '%</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ============================================================
     柱状图（月度分布 / 评分分布）
     ============================================================ */
  function bars(values, labels, opts) {
    opts = opts || {};
    var w = opts.width || 342, h = opts.height || 132;
    var n = values.length;
    var gap = opts.gap == null ? 6 : opts.gap;
    var bw = (w - gap * (n - 1)) / n;
    var max = Math.max.apply(null, values.concat([1]));
    var id = 'g' + Math.random().toString(36).slice(2, 7);
    var body = '';
    var hlIdx = opts.highlight;

    values.forEach(function (v, i) {
      var bh = max ? Math.max(v > 0 ? 4 : 2, (v / max) * (h - 22)) : 2;
      var x = i * (bw + gap), y = h - bh;
      var fill = v > 0 ? 'url(#' + id + ')' : 'rgba(140,166,201,.13)';
      var stroke = (hlIdx === i) ? '<rect x="' + (x - 1.5) + '" y="' + (y - 1.5) + '" width="' + (bw + 3) + '" height="' + (bh + 3) +
        '" rx="' + ((bw + 3) / 2.6) + '" fill="none" stroke="#FF9EC8" stroke-width="1.5"/>' : '';
      body += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) +
        '" rx="' + Math.min(bw / 2, 5).toFixed(1) + '" fill="' + fill + '">' +
        '<animate attributeName="height" from="0" to="' + bh.toFixed(1) + '" dur="0.55s" fill="freeze"/>' +
        '<animate attributeName="y" from="' + h + '" to="' + y.toFixed(1) + '" dur="0.55s" fill="freeze"/>' +
        '</rect>' + stroke;
      if (v > 0 && opts.showValue !== false) {
        body += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" ' +
          'font-size="10" font-weight="700" fill="#56637F">' + v + '</text>';
      }
    });

    var svg = '<svg width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      defs(id) + body + '</svg>';
    var xs = labels ? '<div class="chart-x">' + labels.map(function (l, i) {
      return '<span' + (hlIdx === i ? ' style="color:#E0729C;font-weight:700"' : '') + '>' + esc(l) + '</span>';
    }).join('') + '</div>' : '';
    return svg + xs;
  }

  /* ============================================================
     折线 + 面积图（年度趋势）
     ============================================================ */
  function line(points, opts) {
    opts = opts || {};
    var w = opts.width || 342, h = opts.height || 120;
    var pad = 14;
    var n = points.length;
    if (!n) return '';
    if (n === 1) {
      return bars([points[0].value], [points[0].name], { width: w, height: h });
    }
    var max = Math.max.apply(null, points.map(function (p) { return p.value; }).concat([1]));
    var id = 'l' + Math.random().toString(36).slice(2, 7);
    var stepX = (w - pad * 2) / (n - 1);
    var yOf = function (v) { return h - 20 - (v / max) * (h - 38); };

    var d = '', area = '', dots = '';
    points.forEach(function (p, i) {
      var x = pad + i * stepX, y = yOf(p.value);
      d += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.4" fill="#fff" stroke="url(#' + id + '-h)" stroke-width="2.4"/>' +
        '<text x="' + x.toFixed(1) + '" y="' + (y - 10).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#56637F">' + p.value + '</text>';
    });
    area = d + ' L' + (pad + (n - 1) * stepX).toFixed(1) + ' ' + (h - 16) + ' L' + pad + ' ' + (h - 16) + ' Z';

    var xs = '<div class="chart-x">' + points.map(function (p) { return '<span>' + esc(p.name) + '</span>'; }).join('') + '</div>';

    return '<svg width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + defs(id) +
      '<path d="' + area + '" fill="url(#' + id + '-a)"/>' +
      '<path d="' + d + '" fill="none" stroke="url(#' + id + '-h)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots + '</svg>' + xs;
  }

  /* ============================================================
     排行条
     ============================================================ */
  function rank(items, unit) {
    if (!items.length) return '';
    var max = items[0].value || 1;
    return '<div class="rank-list">' + items.map(function (it, i) {
      return '<div class="rank-item">' +
        '<span class="rank-no">' + (i + 1) + '</span>' +
        '<div class="rank-body">' +
          '<div class="top"><span class="nm">' + esc(it.name) + '</span><span class="vl">' + it.value + (unit || '') + '</span></div>' +
          '<div class="rank-bar"><i style="width:' + Math.max(6, it.value / max * 100) + '%"></i></div>' +
        '</div></div>';
    }).join('') + '</div>';
  }

  /* ============================================================
     月度阅读日历热力图
     ============================================================ */
  function heatmap(ym, dayMap) {
    var y = parseInt(ym.slice(0, 4), 10), m = parseInt(ym.slice(5, 7), 10);
    var first = new Date(y, m - 1, 1);
    var startWd = (first.getDay() + 6) % 7;              // 周一为首列
    var days = new Date(y, m, 0).getDate();
    var maxV = 0;
    Object.keys(dayMap).forEach(function (k) { maxV = Math.max(maxV, dayMap[k]); });

    var cells = [];
    for (var i = 0; i < startWd; i++) cells.push(null);
    for (var d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);

    var lvl = function (v) {
      if (!v) return '';
      if (maxV <= 1) return 'l3';
      var r = v / maxV;
      return r <= .34 ? 'l1' : r <= .6 ? 'l2' : r <= .85 ? 'l3' : 'l4';
    };

    var rows = '';
    for (var r0 = 0; r0 < cells.length; r0 += 7) {
      rows += '<div class="heat-row">' + cells.slice(r0, r0 + 7).map(function (d) {
        if (d == null) return '<i class="heat-cell out"></i>';
        var v = dayMap[d] || 0;
        return '<i class="heat-cell ' + lvl(v) + '" title="' + m + '月' + d + '日 · ' + v + '本"></i>';
      }).join('') + '</div>';
    }

    return '<div class="heat-wk">' + ['一', '二', '三', '四', '五', '六', '日']
      .map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</div>' +
      '<div class="heat">' + rows + '</div>' +
      '<div class="heat-legend">少' +
        '<i style="background:rgba(140,166,201,.10)"></i>' +
        '<i style="background:rgba(147,198,255,.42)"></i>' +
        '<i style="background:rgba(147,198,255,.75)"></i>' +
        '<i style="background:linear-gradient(135deg,#93C6FF,#C6B6FF)"></i>' +
        '<i style="background:linear-gradient(135deg,#A78CF0,#FF9EC8)"></i>多</div>';
  }

  global.Charts = {
    donut: donut, legend: legend, bars: bars, line: line,
    rank: rank, heatmap: heatmap, PALETTE: PALETTE, esc: esc
  };
})(window);
