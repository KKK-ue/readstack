/* ============================================================
   阅栈 ReadStack · 表单：藏书登记 / 阅读记录 / 摘抄 / 感悟
   ============================================================ */
(function (global) {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return Charts.esc(s); };

  function today() { return new Date().toISOString().slice(0, 10); }

  function coverField(cover) {
    return '<div class="field"><label>书籍封面</label>' +
      '<div class="cover-upload">' +
        '<div class="cover-slot" data-cover-slot>' +
          (cover ? '<img src="' + cover + '" alt="">' : UI.icon('camera') + '<span>从相册选择</span>') +
        '</div>' +
        '<div class="cover-ops">' +
          '<button type="button" class="btn btn-sm btn-ghost" data-cover-pick>' + (cover ? '替换封面' : '上传封面') + '</button>' +
          '<button type="button" class="btn btn-sm btn-ghost" data-cover-crop' + (cover ? '' : ' disabled style="opacity:.4"') + '>重新裁剪</button>' +
          '<button type="button" class="btn btn-sm btn-danger" data-cover-del' + (cover ? '' : ' disabled style="opacity:.4"') + '>删除封面</button>' +
          '<p class="field-hint" style="margin-top:2px">3:4 比例 · 自动压缩至 360×480</p>' +
        '</div>' +
      '</div></div>';
  }

  /** 封面交互统一绑定；state 为 {cover, raw} */
  function bindCover(root, state) {
    var slot = $('[data-cover-slot]', root);
    function paint() {
      slot.innerHTML = state.cover ? '<img src="' + state.cover + '" alt="">' : UI.icon('camera') + '<span>从相册选择</span>';
      ['data-cover-crop', 'data-cover-del'].forEach(function (a) {
        var b = $('[' + a + ']', root);
        b.disabled = !state.cover;
        b.style.opacity = state.cover ? '' : '.4';
      });
      $('[data-cover-pick]', root).textContent = state.cover ? '替换封面' : '上传封面';
    }
    function pick() {
      UI.pickImage().then(function (src) {
        if (!src) return;
        state.raw = src;
        return UI.cropImage(src).then(function (out) {
          if (!out) return;
          state.cover = out; paint(); UI.toast('封面已更新');
        });
      });
    }
    slot.onclick = pick;
    $('[data-cover-pick]', root).onclick = pick;
    $('[data-cover-crop]', root).onclick = function () {
      var src = state.raw || state.cover;
      if (!src) return;
      UI.cropImage(src).then(function (out) { if (out) { state.cover = out; paint(); } });
    };
    $('[data-cover-del]', root).onclick = function () {
      UI.confirm({ title: '删除封面？', text: '封面图将被移除，书籍信息保留。', danger: true, ok: '删除' })
        .then(function (ok) { if (ok) { state.cover = ''; state.raw = ''; paint(); } });
    };
  }

  /* ============================================================
     藏书登记表单
     ============================================================ */
  global.Views.openStockForm = function (id, prefill) {
    var editing = !!id;
    var b = editing ? RS.Stock.get(id) : Object.assign({
      title: '', author: '', category: '其他', publisher: '', price: '', pages: '',
      cover: '', status: 'unread', purchaseDate: today(), note: ''
    }, prefill || {});
    if (!b) return UI.toast('记录不存在');

    var state = { cover: b.cover || '', raw: '' };
    var pick = { category: b.category || '其他', status: b.status || 'unread' };

    var body = '<div class="form">' +
      '<div class="field"><label>书名<em>*</em></label>' +
        '<input class="input" id="f-title" maxlength="60" placeholder="例如：百年孤独" value="' + esc(b.title) + '"></div>' +
      '<div class="field"><label>作者</label>' +
        '<input class="input" id="f-author" maxlength="40" placeholder="例如：加西亚·马尔克斯" value="' + esc(b.author) + '"></div>' +
      coverField(state.cover) +
      '<div class="field"><label>分类</label><div class="opt-group" data-group="category">' +
        RS.CATEGORIES.map(function (c) {
          return '<span class="opt' + (pick.category === c ? ' on' : '') + '" data-v="' + c + '">' + c + '</span>';
        }).join('') + '</div></div>' +
      '<div class="field"><label>阅读状态</label><div class="opt-group" data-group="status">' +
        RS.STATUS.map(function (s) {
          return '<span class="opt' + (pick.status === s.k ? ' on' : '') + '" data-v="' + s.k + '">' +
            '<i class="dot" style="background:' + s.c + '"></i>' + s.t + '</span>';
        }).join('') + '</div>' +
        '<p class="field-hint">状态仅用于库存台账，不会自动生成阅读记录</p></div>' +
      '<div class="field-row">' +
        '<div class="field"><label>购入价格</label>' +
          '<input class="input" id="f-price" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" value="' + (b.price || '') + '"></div>' +
        '<div class="field"><label>页数</label>' +
          '<input class="input" id="f-pages" type="number" inputmode="numeric" min="0" placeholder="选填" value="' + (b.pages || '') + '"></div>' +
      '</div>' +
      '<div class="field-row">' +
        '<div class="field"><label>购入日期</label>' +
          '<input class="input" id="f-date" type="date" value="' + (b.purchaseDate || '') + '"></div>' +
        '<div class="field"><label>出版社</label>' +
          '<input class="input" id="f-pub" maxlength="30" placeholder="选填" value="' + esc(b.publisher) + '"></div>' +
      '</div>' +
      '<div class="field"><label>备注</label>' +
        '<textarea class="textarea" id="f-note" maxlength="500" placeholder="版本、品相、购于何处…">' + esc(b.note) + '</textarea></div>' +
      '<div style="height:4px"></div></div>';

    var v = App.pushView({
      title: editing ? '编辑藏书' : '登记藏书', body: body,
      footer: '<button class="btn btn-ghost" style="flex:1" data-cancel>取消</button>' +
              '<button class="btn btn-primary" style="flex:1.6" data-save>' + UI.icon('check') + '保存</button>'
    });

    bindCover(v.el, state);
    bindOptGroups(v.el, pick);

    $('[data-cancel]', v.el).onclick = function () { App.popView(); };
    $('[data-save]', v.el).onclick = function () {
      var title = $('#f-title', v.el).value.trim();
      if (!title) { UI.toast('书名不能为空'); $('#f-title', v.el).focus(); return; }
      var data = {
        title: title,
        author: $('#f-author', v.el).value.trim(),
        category: pick.category,
        status: pick.status,
        publisher: $('#f-pub', v.el).value.trim(),
        price: parseFloat($('#f-price', v.el).value) || 0,
        pages: parseInt($('#f-pages', v.el).value, 10) || 0,
        purchaseDate: $('#f-date', v.el).value,
        note: $('#f-note', v.el).value.trim(),
        cover: state.cover
      };
      if (editing) RS.Stock.update(id, data); else RS.Stock.add(data);
      UI.haptic(20);
      App.popView();
      if (editing) setTimeout(function () { App.popView(); }, 60);
      Views.renderStock();
      UI.toast(editing ? '已保存修改' : '《' + title + '》已入库');
    };
  };

  function bindOptGroups(root, pick) {
    $$('[data-group]', root).forEach(function (g) {
      var key = g.dataset.group;
      $$('.opt', g).forEach(function (o) {
        o.onclick = function () {
          UI.haptic(8);
          pick[key] = o.dataset.v;
          $$('.opt', g).forEach(function (m) { m.classList.toggle('on', m === o); });
        };
      });
    });
  }

  /* ============================================================
     阅读记录表单
     ============================================================ */
  global.Views.openReadingForm = function (id, prefill) {
    var editing = !!id;
    var b = editing ? RS.Reading.get(id) : Object.assign({
      title: '', author: '', category: '其他', source: 'paper',
      startDate: '', finishDate: today(), rating: 0, cover: '', reflection: ''
    }, prefill || {});
    if (!b) return UI.toast('记录不存在');

    var state = { cover: b.cover || '', raw: '' };
    var pick = { category: b.category || '其他', source: b.source || 'paper' };
    var rating = b.rating || 0;

    var body = '<div class="form">' +
      (prefill && prefill.title ? '<div class="rp-empty" style="margin:0;text-align:left;font-size:12px">' +
        '已从库存台账一次性填充基础信息。保存后本记录与库存记录相互独立，修改任意一方都不会影响另一方。</div>' : '') +
      '<div class="field"><label>书名<em>*</em></label>' +
        '<input class="input" id="r-title" maxlength="60" placeholder="读完的这本书叫什么" value="' + esc(b.title) + '"></div>' +
      '<div class="field"><label>作者</label>' +
        '<input class="input" id="r-author" maxlength="40" placeholder="选填" value="' + esc(b.author) + '"></div>' +
      '<div class="field"><label>我的评分</label>' +
        '<div class="star-picker" id="r-stars"></div>' +
        '<p class="field-hint">1–5 星，随时可改；未评分不计入平均分</p></div>' +
      coverField(state.cover) +
      '<div class="field"><label>分类</label><div class="opt-group" data-group="category">' +
        RS.CATEGORIES.map(function (c) {
          return '<span class="opt' + (pick.category === c ? ' on' : '') + '" data-v="' + c + '">' + c + '</span>';
        }).join('') + '</div></div>' +
      '<div class="field"><label>阅读载体</label><div class="opt-group" data-group="source">' +
        [['paper', '纸质书'], ['ebook', '电子书'], ['audio', '有声书']].map(function (s) {
          return '<span class="opt' + (pick.source === s[0] ? ' on' : '') + '" data-v="' + s[0] + '">' + s[1] + '</span>';
        }).join('') + '</div></div>' +
      '<div class="field-row">' +
        '<div class="field"><label>开始阅读</label>' +
          '<input class="input" id="r-start" type="date" value="' + (b.startDate || '') + '"></div>' +
        '<div class="field"><label>读完日期<em>*</em></label>' +
          '<input class="input" id="r-finish" type="date" value="' + (b.finishDate || '') + '"></div>' +
      '</div>' +
      '<p class="field-hint" style="margin-top:-8px">读完日期决定该记录归属哪个月度 / 年度报告</p>' +
      '<div class="field"><label>阅读感悟<span class="char-count" id="r-cc">0</span></label>' +
        '<textarea class="textarea tall" id="r-reflect" maxlength="5000" placeholder="这本书带给你什么？可以随时回来续写…">' + esc(b.reflection) + '</textarea></div>' +
      '<div style="height:4px"></div></div>';

    var v = App.pushView({
      title: editing ? '编辑阅读记录' : '登记阅读记录', body: body,
      footer: '<button class="btn btn-ghost" style="flex:1" data-cancel>取消</button>' +
              '<button class="btn btn-primary" style="flex:1.6" data-save>' + UI.icon('check') + '保存</button>'
    });

    bindCover(v.el, state);
    bindOptGroups(v.el, pick);

    var starBox = $('#r-stars', v.el);
    function paintStars() {
      var h = '';
      for (var i = 1; i <= 5; i++) h += '<span data-s="' + i + '">' + UI.star(i <= rating, 30) + '</span>';
      starBox.innerHTML = h + '<span class="val">' + (rating ? rating + '.0' : '—') + '</span>';
      $$('[data-s]', starBox).forEach(function (n) {
        n.onclick = function () {
          UI.haptic(12);
          var v2 = +n.dataset.s;
          rating = (rating === v2) ? 0 : v2;
          paintStars();
        };
      });
    }
    paintStars();

    var ta = $('#r-reflect', v.el), cc = $('#r-cc', v.el);
    function count() { cc.textContent = ta.value.length + ' 字'; }
    ta.oninput = count; count();

    $('[data-cancel]', v.el).onclick = function () { App.popView(); };
    $('[data-save]', v.el).onclick = function () {
      var title = $('#r-title', v.el).value.trim();
      if (!title) { UI.toast('书名不能为空'); $('#r-title', v.el).focus(); return; }
      var s = $('#r-start', v.el).value, f = $('#r-finish', v.el).value;
      if (s && f && s > f) { UI.toast('开始日期不能晚于读完日期'); return; }
      var data = {
        title: title,
        author: $('#r-author', v.el).value.trim(),
        category: pick.category, source: pick.source,
        startDate: s, finishDate: f, rating: rating,
        reflection: ta.value.trim(), cover: state.cover
      };
      if (editing) RS.Reading.update(id, data); else RS.Reading.add(data);
      UI.haptic(20);
      App.popView();
      if (editing) setTimeout(function () { App.popView(); }, 60);
      Views.renderReading();
      UI.toast(editing ? '已保存修改' : '《' + title + '》已记入阅读清单');
    };
  };

  /* ============================================================
     摘抄表单
     ============================================================ */
  global.Views.openExcerptForm = function (bookId, ex, onDone) {
    var editing = !!ex;
    var body = '<div class="form">' +
      '<div class="field"><label>摘抄原文<em>*</em><span class="char-count" id="e-cc">0</span></label>' +
        '<textarea class="textarea tall" id="e-text" maxlength="2000" placeholder="把打动你的那句话抄下来…">' + esc(ex ? ex.text : '') + '</textarea></div>' +
      '<div class="field"><label>页码</label>' +
        '<input class="input" id="e-page" maxlength="10" inputmode="numeric" placeholder="选填，例如 128" value="' + esc(ex ? ex.page : '') + '"></div>' +
      '</div>';

    var v = App.pushView({
      title: editing ? '编辑摘抄' : '添加摘抄', body: body,
      footer: '<button class="btn btn-ghost" style="flex:1" data-cancel>取消</button>' +
              '<button class="btn btn-primary" style="flex:1.6" data-save>' + UI.icon('check') + '保存摘抄</button>'
    });

    var ta = $('#e-text', v.el), cc = $('#e-cc', v.el);
    ta.oninput = function () { cc.textContent = ta.value.length + ' 字'; };
    cc.textContent = ta.value.length + ' 字';
    setTimeout(function () { ta.focus(); }, 400);

    $('[data-cancel]', v.el).onclick = function () { App.popView(); };
    $('[data-save]', v.el).onclick = function () {
      var text = ta.value.trim();
      if (!text) { UI.toast('摘抄内容不能为空'); return; }
      var page = $('#e-page', v.el).value.trim();
      if (editing) RS.Reading.updateExcerpt(bookId, ex.id, text, page);
      else RS.Reading.addExcerpt(bookId, text, page);
      UI.haptic(20);
      App.popView();
      onDone && onDone();
      UI.toast(editing ? '摘抄已更新' : '摘抄已保存');
    };
  };

  /* ============================================================
     感悟续写
     ============================================================ */
  global.Views.openReflectionForm = function (id) {
    var b = RS.Reading.get(id);
    if (!b) return;
    var body = '<div class="form">' +
      '<div class="field"><label>《' + esc(b.title) + '》的阅读感悟<span class="char-count" id="w-cc">0</span></label>' +
        '<textarea class="textarea" style="min-height:340px" id="w-text" maxlength="5000" ' +
        'placeholder="随时回来续写，自动保留换行与段落…">' + esc(b.reflection) + '</textarea>' +
        '<p class="field-hint">支持长文本，最多 5000 字，可反复修改</p></div></div>';

    var v = App.pushView({
      title: '阅读感悟', body: body,
      footer: '<button class="btn btn-ghost" style="flex:1" data-cancel>取消</button>' +
              '<button class="btn btn-primary" style="flex:1.6" data-save>' + UI.icon('save') + '保存感悟</button>'
    });

    var ta = $('#w-text', v.el), cc = $('#w-cc', v.el);
    function count() { cc.textContent = ta.value.length + ' 字'; }
    ta.oninput = count; count();
    setTimeout(function () { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 400);

    $('[data-cancel]', v.el).onclick = function () { App.popView(); };
    $('[data-save]', v.el).onclick = function () {
      RS.Reading.update(id, { reflection: ta.value.trim() });
      UI.haptic(20);
      App.popView();
      // 刷新底层详情页
      var top = App.stack[App.stack.length - 1];
      if (top) {
        var nb = RS.Reading.get(id);
        var block = $('[data-edit-reflect]', top.el);
        if (block) {
          block.className = 'text-block' + (nb.reflection ? '' : ' ph');
          block.textContent = nb.reflection || '还没有写下感悟，点这里开始记录…';
        }
      }
      Views.renderReading();
      UI.toast('感悟已保存');
    };
  };

})(window);
