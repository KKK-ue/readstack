/* ============================================================
   阅栈 ReadStack · 文本识别批量录入
   粘贴多条书籍信息（每行一本）→ 一键识别 → 预览可删 → 批量入库。
   解析逻辑在 store.js 的 RS.parseBookText（纯函数，可单测）。
   ============================================================ */
(function (global) {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return Charts.esc(s); };
  function today() { return new Date().toISOString().slice(0, 10); }
  function statusLabel(k) {
    for (var i = 0; i < RS.STATUS.length; i++) if (RS.STATUS[i].k === k) return RS.STATUS[i].t;
    return '';
  }

  global.Views.openTextImport = function (target) {
    target = target === 'reading' ? 'reading' : 'stock';
    var isStock = target === 'stock';
    var parsed = [];

    var hint = isStock
      ? '每行一本书，字段用<b>空格 / 逗号 / 制表符</b>隔开，顺序不限、均可省略：<br>' +
        '<b>书名　作者　分类　价格　状态　页数　日期</b>' +
        '<code>百年孤独 加西亚·马尔克斯 文学 ¥55 已读</code>' +
        '<code>人类简史,尤瓦尔·赫拉利,历史,68,在读</code>'
      : '每行一本书，字段用<b>空格 / 逗号 / 制表符</b>隔开，顺序不限、均可省略：<br>' +
        '<b>书名　作者　分类　评分　读完日期</b>' +
        '<code>百年孤独 加西亚·马尔克斯 文学 5星 2026-02-08</code>' +
        '<code>活着,余华,文学,4</code>';

    var body = '<div class="form">' +
      '<div class="ti-hint">' + hint + '</div>' +
      '<div class="field"><textarea class="textarea" id="ti-text" ' +
        'placeholder="粘贴或输入多条书籍信息，每行一本…"></textarea></div>' +
      '<div id="ti-result"></div>' +
      '</div>';

    var v = App.pushView({
      title: '文本识别录入',
      body: body,
      footer: '<button class="btn btn-ghost" style="flex:1" data-cancel>取消</button>' +
              '<button class="btn btn-ghost" style="flex:1.2" data-parse>' + UI.icon('search') + '识别</button>' +
              '<button class="btn btn-primary" style="flex:1.5" data-save disabled>' + UI.icon('check') + '录入</button>'
    });

    var ta = $('#ti-text', v.el), resultBox = $('#ti-result', v.el), saveBtn = $('[data-save]', v.el);

    function toStock(it) {
      return {
        title: it.title, author: it.author, category: it.category || '其他',
        publisher: it.publisher, price: it.price || 0, pages: it.pages || 0,
        status: it.status || 'unread', purchaseDate: it.date || today(), note: it.note || ''
      };
    }
    function toReading(it) {
      // 阅读记录无价格字段：把被解析进 price 的 1–5 整数视作评分
      var rating = it.rating ||
        ((it.price >= 1 && it.price <= 5 && Math.floor(it.price) === it.price) ? it.price : 0);
      return {
        title: it.title, author: it.author, category: it.category || '其他',
        source: 'paper', startDate: '', finishDate: it.date || today(),
        rating: rating, reflection: ''
      };
    }
    function metaOf(it) {
      var parts = [];
      if (it.category) parts.push(it.category);
      if (isStock) {
        if (it.price) parts.push('¥' + it.price);
        if (it.pages) parts.push(it.pages + '页');
        if (it.status) parts.push(statusLabel(it.status));
      } else {
        var r = toReading(it).rating;
        if (r) parts.push(r + '星');
      }
      if (it.date) parts.push(it.date);
      return parts.join(' · ');
    }

    function renderResult() {
      if (!parsed.length) {
        resultBox.innerHTML = '';
        saveBtn.disabled = true;
        saveBtn.innerHTML = UI.icon('check') + '录入';
        return;
      }
      resultBox.innerHTML = '<div class="ti-count">识别到 <b>' + parsed.length + '</b> 本，点右侧可删除误判项：</div>' +
        parsed.map(function (it, i) {
          var meta = metaOf(it);
          return '<div class="ti-row">' +
            '<div class="ti-main"><b>' + esc(it.title) + '</b>' +
            '<span>' + esc(it.author || '佚名') + (meta ? ' · ' + esc(meta) : '') + '</span></div>' +
            '<div class="ti-del" data-del="' + i + '">' + UI.icon('close') + '</div>' +
            '</div>';
        }).join('');
      saveBtn.disabled = false;
      saveBtn.innerHTML = UI.icon('check') + '录入 ' + parsed.length + ' 本';
      $$('[data-del]', resultBox).forEach(function (n) {
        n.onclick = function () { UI.haptic(8); parsed.splice(+n.dataset.del, 1); renderResult(); };
      });
    }

    $('[data-cancel]', v.el).onclick = function () { App.popView(); };
    $('[data-parse]', v.el).onclick = function () {
      var text = ta.value.trim();
      if (!text) { UI.toast('请先粘贴或输入书籍信息'); ta.focus(); return; }
      parsed = RS.parseBookText(text);
      UI.haptic(12);
      if (!parsed.length) { UI.toast('未识别到有效书籍，请检查格式'); renderResult(); return; }
      renderResult();
      UI.toast('识别到 ' + parsed.length + ' 本');
    };
    saveBtn.onclick = function () {
      if (!parsed.length) return;
      var n = 0;
      parsed.forEach(function (it) {
        if (!it.title) return;
        if (isStock) RS.Stock.add(toStock(it)); else RS.Reading.add(toReading(it));
        n++;
      });
      UI.haptic(20);
      App.popView();
      if (isStock) Views.renderStock(); else Views.renderReading();
      UI.toast('已录入 ' + n + ' 本到' + (isStock ? '库存台账' : '阅读清单'));
    };
  };
})(window);
