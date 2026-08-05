/* ============================================================
   阅栈 ReadStack · 应用外壳
   路由 / 标签栏 / 折叠导航 / 栈视图 / 侧滑返回 / 全局搜索
   ============================================================ */
(function (global) {
  'use strict';

  var App = {
    tab: 'stock',
    stack: [],          // 栈视图队列
    filters: {
      stock: { status: 'all', cat: 'all', sort: 'new' },
      reading: { seg: 'list', cat: 'all', sort: 'new' }
    }
  };
  global.App = App;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  App.$ = $; App.$$ = $$;

  var TAB_TITLE = { stock: '库存台账', reading: '阅读记录', report: '数据报告', me: '我的' };

  /* ---------------- 状态栏时间 ---------------- */
  function tickTime() {
    var d = new Date();
    $('#sbTime').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* ---------------- 标签切换 ---------------- */
  function switchTab(tab) {
    if (App.tab === tab) {
      var p = $('#page-' + tab);
      if (p) p.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    App.tab = tab;
    $$('.tab').forEach(function (t) { t.classList.toggle('on', t.dataset.tab === tab); });
    $$('.page').forEach(function (p) { p.classList.remove('active'); });
    $('#page-' + tab).classList.add('active');
    $('#hdTitle').textContent = TAB_TITLE[tab];
    $('#fab').classList.toggle('hide', tab === 'report' || tab === 'me');
    $('#btnHdMore').style.display = (tab === 'stock' || tab === 'reading') ? '' : 'none';
    UI.haptic(10);
    render(tab);
    syncHeader($('#page-' + tab));
  }
  App.switchTab = switchTab;

  /* ---------------- 折叠导航 ---------------- */
  function syncHeader(page) {
    var y = page ? page.scrollTop : 0;
    $('#appHeader').classList.toggle('solid', y > 34);
  }

  /* ---------------- 渲染分发 ---------------- */
  function render(tab) {
    tab = tab || App.tab;
    var t0 = performance.now();
    if (tab === 'stock') Views.renderStock();
    else if (tab === 'reading') Views.renderReading();
    else if (tab === 'report') Report.render();
    else if (tab === 'me') renderMe();
    App.lastRender = (performance.now() - t0).toFixed(1);
  }
  App.render = render;

  /* ============================================================
     栈视图：详情 / 编辑 / 搜索 全屏页
     ============================================================ */
  function pushView(opt) {
    var el = document.createElement('div');
    el.className = 'stack-view';
    el.innerHTML =
      '<header class="app-header solid">' +
        '<div class="hd-btn hd-back" data-back>' + UI.icon('back') + '</div>' +
        '<div class="hd-title" style="opacity:1;transform:none">' + (opt.title || '') + '</div>' +
        (opt.action ? '<div class="hd-btn" data-action>' + UI.icon(opt.action) + '</div>' : '') +
      '</header>' +
      '<div class="sv-body">' + (opt.body || '') + '</div>' +
      (opt.footer ? '<div class="sv-footer">' + opt.footer + '</div>' : '') +
      '<div class="edge-back"></div>';

    $('.device-screen').appendChild(el);
    // 强制回流后进场，保证动画稳定
    el.getBoundingClientRect();
    requestAnimationFrame(function () { el.classList.add('show'); });

    var view = { el: el, opt: opt, body: $('.sv-body', el) };
    App.stack.push(view);

    $('[data-back]', el).onclick = function () { popView(); };
    if (opt.action) $('[data-action]', el).onclick = function () { opt.onAction && opt.onAction(view); };
    bindEdgeBack(el);
    if (opt.onMount) opt.onMount(view);
    return view;
  }
  App.pushView = pushView;

  function popView(silent) {
    var v = App.stack.pop();
    if (!v) return;
    if (!silent) UI.haptic(10);
    v.el.classList.remove('show');
    setTimeout(function () { v.el.remove(); }, 420);
    if (v.opt.onPop) v.opt.onPop();
  }
  App.popView = popView;

  App.replaceTop = function (opt) { popView(true); setTimeout(function () { pushView(opt); }, 30); };

  /* 澎湃OS 左缘侧滑返回 */
  function bindEdgeBack(el) {
    var startX = 0, startY = 0, dragging = false, lock = null;
    var edge = $('.edge-back', el);

    function start(e) {
      var p = e.touches ? e.touches[0] : e;
      startX = p.clientX; startY = p.clientY; dragging = true; lock = null;
      el.classList.add('dragging');
    }
    function move(e) {
      if (!dragging) return;
      var p = e.touches ? e.touches[0] : e;
      var dx = p.clientX - startX, dy = p.clientY - startY;
      if (lock === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (lock === 'y') { dragging = false; el.classList.remove('dragging'); return; }
      }
      if (e.cancelable) e.preventDefault();
      el.style.transform = 'translateX(' + Math.max(0, dx) + 'px)';
    }
    function end(e) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      var dx = parseFloat((el.style.transform.match(/translateX\(([-\d.]+)px\)/) || [0, 0])[1]) || 0;
      el.style.transform = '';
      if (dx > 88) popView();
    }
    edge.addEventListener('touchstart', start, { passive: true });
    edge.addEventListener('touchmove', move, { passive: false });
    edge.addEventListener('touchend', end);
    edge.addEventListener('mousedown', function (e) {
      start(e);
      var mm = function (ev) { move(ev); }, mu = function (ev) { end(ev); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
      window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu);
    });
  }

  /* ============================================================
     全局搜索
     ============================================================ */
  function openSearch() {
    var v = pushView({
      title: '', body:
        '<div class="search-bar">' +
          '<div class="box">' + UI.icon('search') + '<input id="kw" placeholder="搜书名 / 作者 / 摘抄 / 感悟" autocomplete="off"></div>' +
        '</div>' +
        '<div id="sres" class="page-inner"></div>'
    });
    var head = $('.app-header', v.el);
    head.style.display = 'none';
    v.body.style.paddingTop = '8px';

    var bar = $('.search-bar', v.el);
    var cancel = document.createElement('span');
    cancel.className = 'cancel'; cancel.textContent = '取消';
    cancel.onclick = function () { popView(); };
    bar.appendChild(cancel);

    var input = $('#kw', v.el), res = $('#sres', v.el);
    renderSearchEmpty(res);
    setTimeout(function () { input.focus(); }, 380);

    var timer;
    input.oninput = function () {
      clearTimeout(timer);
      timer = setTimeout(function () { doSearch(input.value, res); }, 120);
    };
  }
  App.openSearch = openSearch;

  function renderSearchEmpty(box) {
    var hot = [];
    RS.Report.byCategory(RS.Reading.all()).slice(0, 4).forEach(function (c) { hot.push(c.name); });
    RS.Report.byAuthor(RS.Reading.all()).slice(0, 3).forEach(function (a) { hot.push(a.name); });
    box.innerHTML = hot.length
      ? '<div class="res-head">搜索建议</div><div class="kw-row">' +
        hot.map(function (h) { return '<span class="kw" data-hot="' + Charts.esc(h) + '">' + Charts.esc(h) + '</span>'; }).join('') + '</div>'
      : '<div class="empty"><div class="ico">🔍</div><h4>全局检索</h4><p>可搜索库存台账、已读清单<br>以及全部摘抄与阅读感悟</p></div>';
    $$('[data-hot]', box).forEach(function (n) {
      n.onclick = function () {
        var input = $('#kw');
        input.value = n.dataset.hot;
        doSearch(input.value, box);
      };
    });
  }

  function hl(text, kw) {
    var t = Charts.esc(text || '');
    if (!kw) return t;
    var i = t.toLowerCase().indexOf(kw.toLowerCase());
    if (i < 0) return t;
    return t.slice(0, i) + '<mark>' + t.slice(i, i + kw.length) + '</mark>' + t.slice(i + kw.length);
  }
  App.hl = hl;

  function doSearch(kw, box) {
    kw = (kw || '').trim();
    if (!kw) { renderSearchEmpty(box); return; }
    var r = RS.Search(kw);
    var total = r.stock.length + r.reading.length + r.excerpts.length + r.reflections.length;
    if (!total) {
      box.innerHTML = '<div class="empty"><div class="ico">🫥</div><h4>没有找到「' + Charts.esc(kw) + '」</h4><p>换个关键词试试</p></div>';
      return;
    }
    var html = '';
    if (r.stock.length) {
      html += '<div class="res-group"><div class="res-head">库存台账 <b>' + r.stock.length + '</b></div><div class="book-list">' +
        r.stock.map(function (b) { return Views.stockItemHTML(b, kw); }).join('') + '</div></div>';
    }
    if (r.reading.length) {
      html += '<div class="res-group"><div class="res-head">已读清单 <b>' + r.reading.length + '</b></div><div class="book-list">' +
        r.reading.map(function (b) { return Views.readingItemHTML(b, kw); }).join('') + '</div></div>';
    }
    if (r.excerpts.length) {
      html += '<div class="res-group"><div class="res-head">摘抄 <b>' + r.excerpts.length + '</b></div><div class="book-list">' +
        r.excerpts.map(function (x) {
          return '<div class="quote-card" data-open-read="' + x.bookId + '">' +
            '<div class="qt">' + hl(x.ex.text, kw) + '</div>' +
            '<div class="qf"><b>《' + Charts.esc(x.title) + '》</b><span>' + (x.ex.page ? 'P' + Charts.esc(x.ex.page) : '') + '</span></div></div>';
        }).join('') + '</div></div>';
    }
    if (r.reflections.length) {
      html += '<div class="res-group"><div class="res-head">阅读感悟 <b>' + r.reflections.length + '</b></div><div class="book-list">' +
        r.reflections.map(function (b) {
          var idx = (b.reflection || '').toLowerCase().indexOf(kw.toLowerCase());
          var snippet = (b.reflection || '').slice(Math.max(0, idx - 20), idx + 60);
          return '<div class="quote-card" data-open-read="' + b.id + '">' +
            '<div class="qt">…' + hl(snippet, kw) + '…</div>' +
            '<div class="qf"><b>《' + Charts.esc(b.title) + '》</b><span>阅读感悟</span></div></div>';
        }).join('') + '</div></div>';
    }
    box.innerHTML = html;

    $$('[data-open-stock]', box).forEach(function (n) {
      n.onclick = function () { Views.openStockDetail(n.dataset.openStock); };
    });
    $$('[data-open-read]', box).forEach(function (n) {
      n.onclick = function () { Views.openReadingDetail(n.dataset.openRead); };
    });
  }

  /* ============================================================
     「我的」页
     ============================================================ */
  function renderMe() {
    var sk = RS.Stock.stats();
    var rd = RS.Reading.all();
    var ex = RS.Reading.allExcerpts().length;
    var kb = (RS.Backup.size() / 1024).toFixed(1);
    var last = RS.Meta.get('lastBackup', 0);

    $('#page-me').innerHTML =
      '<div class="page-hero"><h2>我的<em>书房</em></h2><p>数据全部保存在本机，不联网、不上传</p></div>' +
      '<div class="profile">' +
        '<h3>阅栈 · ReadStack</h3><p>轻量化阅读管理 · Xiaomi 17 定制版</p>' +
        '<div class="pf-row">' +
          '<div><b>' + sk.total + '</b><span>库存藏书</span></div>' +
          '<div><b>' + rd.length + '</b><span>读过的书</span></div>' +
          '<div><b>' + ex + '</b><span>条摘抄</span></div>' +
          '<div><b>¥' + Math.round(sk.amount) + '</b><span>藏书投入</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="page-inner">' +
        (App._installPrompt ? '<div class="set-group">' + setItem('install', '安装到桌面', '添加到主屏，像原生应用一样使用', 'install') + '</div>' : '') +
        '<div class="set-group">' +
          setItem('download', '导出备份文件', '生成 Excel 备份(.xlsx)，建议卸载前导出', 'export') +
          setItem('upload', '从备份恢复', '支持 Excel / JSON，覆盖与合并导入', 'import') +
          setItem('shield', '存储占用', kb + ' KB · ' + (last ? new Date(last).toLocaleDateString('zh-CN') + ' 备份过' : '尚未备份过'), 'size') +
        '</div>' +
        '<div class="set-group">' +
          setItem('tag', '分类管理', RS.CATEGORIES.length + ' 个内置分类', 'cats') +
          setItem('save', '载入示例数据', '快速体验完整功能', 'seed') +
          setItem('trash', '清空全部数据', '两库同时清空，操作不可撤销', 'clear') +
        '</div>' +
        '<div class="set-group">' +
          setItem('info', '关于阅栈', 'v1.0.0 · 零三方依赖 · 本地优先', 'about') +
        '</div>' +
        '<p style="text-align:center;font-size:11px;color:var(--t4);padding:8px 0 4px;line-height:1.8">' +
          '适配 Xiaomi 17 · 2656×1220 · 澎湃OS<br>本页渲染耗时 ' + (App.lastRender || '0') + ' ms</p>' +
      '</div>';

    $$('[data-set]', $('#page-me')).forEach(function (n) {
      n.onclick = function () { onSetting(n.dataset.set); };
    });
  }

  function setItem(ico, title, sub, key) {
    return '<div class="set-item" data-set="' + key + '">' +
      '<div class="set-ico">' + UI.icon(ico) + '</div>' +
      '<div class="set-main"><b>' + title + '</b><span>' + sub + '</span></div>' +
      '<div class="arrow">' + UI.icon('right') + '</div></div>';
  }

  function downloadBlob(blob, fname) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  }

  /* 共享的文件选择器：挂到 DOM 并复用。
     安卓 WebView 的两个坑在此规避：
     ① 部分机型要求 file input 必须在 DOM 树中才能弹出选择框并回调 onchange（detached input 无效）；
     ② 过严的 accept 会让系统文件管理器把 .xlsx 灰显/隐藏，用户选不到自己的备份 → 放宽为全部类型，选中后 JS 校验。 */
  var _filePicker = null;
  function getFilePicker() {
    if (!_filePicker) {
      _filePicker = document.createElement('input');
      _filePicker.type = 'file';
      _filePicker.accept = '*/*';
      _filePicker.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(_filePicker);
    }
    return _filePicker;
  }

  function onSetting(key) {
    UI.haptic();
    if (key === 'install') {
      var pr = App._installPrompt;
      if (!pr) { UI.toast('当前已是最新安装版本'); return; }
      pr.prompt();
      pr.userChoice.then(function (r) {
        App._installPrompt = null;
        if (r.outcome === 'accepted') UI.toast('正在安装到桌面…');
        else UI.toast('已取消安装');
        renderMe();
      });
    }
    else if (key === 'export') {
      try {
        var bytes = RS.Backup.exportExcel();
        var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        var fname = 'ReadStack备份_' + new Date().toISOString().slice(0, 10) + '.xlsx';
        var file = new File([blob], fname, { type: blob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: '阅栈备份' })
            .then(function () { UI.toast('已分享 Excel 备份'); })
            .catch(function () { downloadBlob(blob, fname); UI.toast('已导出 Excel 备份'); });
        } else {
          downloadBlob(blob, fname);
          UI.toast('已导出 Excel 备份');
        }
        RS.Meta.set('lastBackup', Date.now());
        renderMe();
      } catch (e) { UI.toast('导出失败：' + e.message); }
    }
    else if (key === 'import') {
      UI.actionSheet('从备份恢复', [
        { key: 'merge', text: '合并导入（保留现有数据）', icon: 'link' },
        { key: 'cover', text: '覆盖导入（清空后写入）', icon: 'upload', danger: true }
      ]).then(function (mode) {
        if (!mode) return;
        var input = getFilePicker();
        input.value = ''; // 允许重复选择同一文件也触发 change
        input.onchange = function () {
          var f = input.files && input.files[0]; if (!f) return;
          var finish = function (c) { UI.toast('已恢复 ' + c.stock + ' 条库存 / ' + c.reading + ' 条阅读'); renderMe(); };
          var fail = function (msg) { UI.toast('恢复失败：' + msg); };
          var isXlsx = /\.xlsx?$/i.test(f.name) || (f.type && f.type.indexOf('spreadsheetml') >= 0);
          var isJson = /\.json$/i.test(f.name) || (f.type && f.type.indexOf('json') >= 0);
          if (!isXlsx && !isJson) { fail('请选择 .xlsx 或 .json 备份文件'); return; }
          var fr = new FileReader();
          fr.onload = function () {
            try {
              var r = isXlsx ? RS.Backup.importExcel(fr.result, mode) : RS.Backup.import(fr.result, mode);
              finish(r);
            } catch (e) { fail(e.message); }
          };
          fr.onerror = function () { fail('文件读取失败'); };
          if (isXlsx) fr.readAsArrayBuffer(f); else fr.readAsText(f);
          input.value = '';
        };
        input.click();
      });
    }
    else if (key === 'clear') {
      UI.confirm({
        title: '清空全部数据？', danger: true, ok: '确认清空',
        text: '库存台账与已读清单将同时被删除，包含全部摘抄与感悟。此操作无法撤销，建议先导出备份。'
      }).then(function (ok) {
        if (!ok) return;
        RS.Backup.clearAll();
        RS.Meta.set('seeded', true);
        UI.toast('数据已清空');
        renderMe();
      });
    }
    else if (key === 'seed') {
      UI.confirm({ title: '载入示例数据', text: '将追加 8 条库存记录与 6 条阅读记录，用于体验报告与图表效果。' })
        .then(function (ok) {
          if (!ok) return;
          RS.Meta.set('seeded', false);
          RS.seed();
          UI.toast('示例数据已载入');
          renderMe();
        });
    }
    else if (key === 'cats') {
      pushView({
        title: '分类管理',
        body: '<div class="page-inner"><div class="rp-empty" style="margin:0 0 14px;text-align:left">' +
          '分类为内置固定枚举，覆盖常见阅读品类，避免自由输入导致统计口径分裂。' +
          '</div><div class="opt-group">' +
          RS.CATEGORIES.map(function (c) { return '<span class="opt on">' + c + '</span>'; }).join('') +
          '</div></div>'
      });
    }
    else if (key === 'about') {
      pushView({
        title: '关于阅栈',
        body: '<div class="page-inner">' +
          '<div class="rp-hero" style="margin-left:0;margin-right:0">' +
            '<div class="lb">阅栈 ReadStack</div>' +
            '<div class="big">v1.0<i>.0</i></div>' +
            '<div class="grid"><div><b>0</b><span>三方依赖</span></div><div><b>' + (RS.Backup.size() / 1024).toFixed(0) + 'KB</b><span>数据体积</span></div><div><b>100%</b><span>本地存储</span></div></div>' +
          '</div>' +
          '<div class="rp-card" style="margin-left:0;margin-right:0"><h4>设计边界</h4>' +
          '<div class="desc" style="margin-bottom:0;line-height:1.9">' +
            '· 库存台账与已读清单为两套独立数据，不自动同步<br>' +
            '· 无广告、无推送、无开屏、无账号体系<br>' +
            '· 所有统计以「读完日期」为归属口径<br>' +
            '· 封面图统一压缩至 360×480，控制存储占用' +
          '</div></div></div>'
      });
    }
    else if (key === 'size') {
      UI.toast('当前数据 ' + (RS.Backup.size() / 1024).toFixed(1) + ' KB');
    }
  }
  App.renderMe = renderMe;

  /* ============================================================
     初始化
     ============================================================ */
  function init() {
    // PWA 安装提示捕获
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      App._installPrompt = e;
      if (App.tab === 'me') renderMe();
    });
    window.addEventListener('appinstalled', function () {
      App._installPrompt = null;
      UI.toast('已安装到桌面');
      if (App.tab === 'me') renderMe();
    });

    // 图标注入
    $('#btnSearch').innerHTML = UI.icon('search');
    $('#btnHdMore').innerHTML = UI.icon('sort');
    $('#fab').innerHTML = UI.icon('plus');
    var tabIcons = { stock: 'stock', reading: 'read', report: 'chart', me: 'me' };
    $$('.tab').forEach(function (t) { $('.ic', t).innerHTML = UI.icon(tabIcons[t.dataset.tab]); });

    tickTime(); setInterval(tickTime, 20000);

    RS.seed();

    $$('.tab').forEach(function (t) {
      t.onclick = function () { switchTab(t.dataset.tab); };
    });
    $('#btnSearch').onclick = function () { UI.haptic(); openSearch(); };
    $('#fab').onclick = function () {
      UI.haptic(16);
      if (App.tab === 'reading') Views.openReadingForm(null);
      else Views.openStockForm(null);
    };
    $('#btnHdMore').onclick = function () { Views.openSortSheet(); };

    $$('.page').forEach(function (p) {
      p.addEventListener('scroll', function () {
        if (p.classList.contains('active')) syncHeader(p);
      }, { passive: true });
    });

    global.addEventListener('rs:storage-full', function () {
      UI.toast('本机存储空间不足，请精简封面图');
    });

    if (!RS.Backup.persistent()) {
      setTimeout(function () { UI.toast('当前环境禁用了本地存储，数据仅本次会话有效'); }, 900);
    }

    $('#hdTitle').textContent = TAB_TITLE.stock;
    render('stock');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(window);
