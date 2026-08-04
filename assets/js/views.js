/* ============================================================
   阅栈 ReadStack · 库存台账 / 已读清单 / 摘抄墙 视图
   ============================================================ */
(function (global) {
  'use strict';

  var Views = {};
  global.Views = Views;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return Charts.esc(s); };

  var ST_MAP = { unread: ['unread', '未读'], reading: ['reading', '在读'], done: ['done', '已读'], drop: ['drop', '弃读'] };
  var SRC_MAP = { paper: '纸质书', ebook: '电子书', audio: '有声书' };

  function fmtDate(d) { return d ? d.replace(/-/g, '.') : '—'; }

  /* ============================================================
     库存台账
     ============================================================ */
  Views.stockItemHTML = function (b, kw) {
    var st = ST_MAP[b.status] || ST_MAP.unread;
    return '<div class="book-item" data-open-stock="' + b.id + '">' +
      '<div class="bi-main">' +
        '<div class="bi-title">' + App.hl(b.title, kw) + '</div>' +
        '<div class="bi-author">' + App.hl(b.author || '佚名', kw) + (b.publisher ? ' · ' + esc(b.publisher) : '') + '</div>' +
        '<div class="bi-meta">' +
          '<span class="pill ' + st[0] + '">' + st[1] + '</span>' +
          '<span class="tag">' + esc(b.category || '其他') + '</span>' +
          (b.price ? '<span class="price">¥' + b.price + '</span>' : '') +
          (b.purchaseDate ? '<span>' + fmtDate(b.purchaseDate) + ' 购入</span>' : '') +
        '</div>' +
      '</div></div>';
  };

  Views.renderStock = function () {
    var f = App.filters.stock;
    var list = RS.Stock.all();
    var s = RS.Stock.stats();

    if (f.status !== 'all') list = list.filter(function (b) { return b.status === f.status; });
    if (f.cat !== 'all') list = list.filter(function (b) { return (b.category || '其他') === f.cat; });
    list = sortList(list, f.sort);

    var cats = {};
    RS.Stock.all().forEach(function (b) { cats[b.category || '其他'] = (cats[b.category || '其他'] || 0) + 1; });

    var stChips = [['all', '全部', s.total], ['unread', '未读', s.unread], ['reading', '在读', s.reading], ['done', '已读', s.done], ['drop', '弃读', s.drop]];

    $('#page-stock').innerHTML =
      '<div class="page-hero"><h2>我的<em>藏书架</em></h2><p>共 ' + s.total + ' 本实体藏书 · 累计投入 ¥' + Math.round(s.amount) + '</p></div>' +
      '<div class="search-entry" data-search>' + UI.icon('search') + '<span>搜索书名、作者、摘抄…</span></div>' +
      '<div class="page-inner"><div class="stat-row">' +
        statBox(s.total, '', '在册藏书') + statBox(s.reading, '', '正在读') +
        statBox(s.unread, '', '待读') + statBox(Math.round(s.amount), '¥', '总投入') +
      '</div></div>' +
      '<div class="chips">' + stChips.map(function (c) {
        return '<span class="chip' + (f.status === c[0] ? ' on' : '') + '" data-st="' + c[0] + '">' + c[1] + '<i>' + c[2] + '</i></span>';
      }).join('') + '</div>' +
      (Object.keys(cats).length > 1 ?
        '<div class="chips" style="padding-top:0">' +
          '<span class="chip' + (f.cat === 'all' ? ' on' : '') + '" data-cat="all">全部分类</span>' +
          Object.keys(cats).sort(function (a, z) { return cats[z] - cats[a]; }).map(function (c) {
            return '<span class="chip' + (f.cat === c ? ' on' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '<i>' + cats[c] + '</i></span>';
          }).join('') + '</div>' : '') +
      '<div class="page-inner">' +
        (list.length
          ? '<div class="book-list">' + list.map(function (b, i) {
              return Views.stockItemHTML(b).replace('class="book-item"', 'class="book-item" style="animation-delay:' + Math.min(i * 22, 240) + 'ms"');
            }).join('') + '</div>'
          : emptyHTML('📚', '这里还没有书', f.status === 'all' && f.cat === 'all'
              ? '点右下角 + 登记第一本实体书<br>书名、作者、价格都能记'
              : '当前筛选条件下没有匹配的书籍')) +
      '</div>';

    bindStockEvents();
  };

  function statBox(v, unit, label) {
    return '<div class="stat-box"><b>' + (unit || '') + v + '</b><span>' + label + '</span></div>';
  }
  function emptyHTML(ico, title, desc) {
    return '<div class="empty"><div class="ico">' + ico + '</div><h4>' + title + '</h4><p>' + desc + '</p></div>';
  }

  function sortList(list, sort) {
    var l = list.slice();
    if (sort === 'new') l.sort(function (a, b) { return b.createdAt - a.createdAt; });
    else if (sort === 'old') l.sort(function (a, b) { return a.createdAt - b.createdAt; });
    else if (sort === 'title') l.sort(function (a, b) { return (a.title || '').localeCompare(b.title || '', 'zh'); });
    else if (sort === 'price') l.sort(function (a, b) { return (b.price || 0) - (a.price || 0); });
    else if (sort === 'rating') l.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
    else if (sort === 'finish') l.sort(function (a, b) { return (b.finishDate || '').localeCompare(a.finishDate || ''); });
    return l;
  }

  function bindStockEvents() {
    var p = $('#page-stock');
    $('[data-search]', p).onclick = function () { UI.haptic(); App.openSearch(); };
    $$('[data-st]', p).forEach(function (n) {
      n.onclick = function () { UI.haptic(); App.filters.stock.status = n.dataset.st; Views.renderStock(); };
    });
    $$('[data-cat]', p).forEach(function (n) {
      n.onclick = function () { UI.haptic(); App.filters.stock.cat = n.dataset.cat; Views.renderStock(); };
    });
    $$('[data-open-stock]', p).forEach(function (n) {
      n.onclick = function () { Views.openStockDetail(n.dataset.openStock); };
    });
  }

  /* ============================================================
     已读清单 + 摘抄墙
     ============================================================ */
  Views.readingItemHTML = function (b, kw) {
    var days = RS.daysBetween(b.startDate, b.finishDate);
    return '<div class="book-item" data-open-read="' + b.id + '">' +
      '<div class="bi-main">' +
        '<div class="bi-title">' + App.hl(b.title, kw) + '</div>' +
        '<div class="bi-author">' + App.hl(b.author || '佚名', kw) + '</div>' +
        '<div class="bi-meta">' +
          UI.starsHTML(b.rating) +
          '<span class="tag">' + esc(b.category || '其他') + '</span>' +
          (b.finishDate ? '<span>' + fmtDate(b.finishDate) + ' 读完</span>' : '<span style="color:var(--warn)">未填读完日期</span>') +
          (days ? '<span>' + days + '天</span>' : '') +
          ((b.excerpts || []).length ? '<span>摘抄' + b.excerpts.length + '</span>' : '') +
        '</div>' +
      '</div>';
  };

  Views.renderReading = function () {
    var f = App.filters.reading;
    var all = RS.Reading.all();
    var sum = RS.Report.summary(all);

    $('#page-reading').innerHTML =
      '<div class="page-hero"><h2>读过的<em>每一本</em></h2><p>累计 ' + all.length + ' 本 · ' + sum.excerpts + ' 条摘抄 · 均分 ' + (sum.avgRating || '—') + '</p></div>' +
      '<div class="segment">' +
        '<button data-seg="list" class="' + (f.seg === 'list' ? 'on' : '') + '">阅读清单</button>' +
        '<button data-seg="quote" class="' + (f.seg === 'quote' ? 'on' : '') + '">摘抄墙</button>' +
      '</div>' +
      '<div id="rdBody"></div>';

    renderReadingBody();

    $$('[data-seg]', $('#page-reading')).forEach(function (n) {
      n.onclick = function () {
        UI.haptic();
        App.filters.reading.seg = n.dataset.seg;
        Views.renderReading();
      };
    });
  };

  function renderReadingBody() {
    var f = App.filters.reading;
    var box = $('#rdBody');

    if (f.seg === 'quote') {
      var qs = RS.Reading.allExcerpts();
      box.innerHTML = '<div class="page-inner">' + (qs.length
        ? '<div class="book-list">' + qs.map(function (x, i) {
            return '<div class="quote-card" data-open-read="' + x.bookId + '" style="animation-delay:' + Math.min(i * 26, 260) + 'ms">' +
              '<div class="qt">' + esc(x.ex.text) + '</div>' +
              '<div class="qf"><b>《' + esc(x.title) + '》' + (x.author ? ' · ' + esc(x.author) : '') + '</b>' +
              '<span>' + (x.ex.page ? 'P' + esc(x.ex.page) : '') + '</span></div></div>';
          }).join('') + '</div>'
        : emptyHTML('✍️', '还没有摘抄', '进入任意一条阅读记录<br>就能把打动你的句子存下来')) + '</div>';
    } else {
      var list = RS.Reading.all();
      var cats = {};
      list.forEach(function (b) { cats[b.category || '其他'] = (cats[b.category || '其他'] || 0) + 1; });
      if (f.cat !== 'all') list = list.filter(function (b) { return (b.category || '其他') === f.cat; });
      list = sortList(list, f.sort === 'new' ? 'finish' : f.sort);

      box.innerHTML =
        (Object.keys(cats).length > 1 ?
          '<div class="chips">' +
            '<span class="chip' + (f.cat === 'all' ? ' on' : '') + '" data-rcat="all">全部</span>' +
            Object.keys(cats).sort(function (a, z) { return cats[z] - cats[a]; }).map(function (c) {
              return '<span class="chip' + (f.cat === c ? ' on' : '') + '" data-rcat="' + esc(c) + '">' + esc(c) + '<i>' + cats[c] + '</i></span>';
            }).join('') + '</div>' : '') +
        '<div class="page-inner">' + (list.length
          ? '<div class="book-list">' + list.map(function (b, i) {
              return Views.readingItemHTML(b).replace('class="book-item"', 'class="book-item" style="animation-delay:' + Math.min(i * 22, 240) + 'ms"');
            }).join('') + '</div>'
          : emptyHTML('📖', '还没有阅读记录', '点右下角 + 登记一本读完的书<br>评分、摘抄、感悟都可以慢慢补')) + '</div>';
    }

    $$('[data-rcat]', box).forEach(function (n) {
      n.onclick = function () { UI.haptic(); App.filters.reading.cat = n.dataset.rcat; renderReadingBody(); };
    });
    $$('[data-open-read]', box).forEach(function (n) {
      n.onclick = function () { Views.openReadingDetail(n.dataset.openRead); };
    });
  }

  /* ============================================================
     排序动作表
     ============================================================ */
  Views.openSortSheet = function () {
    UI.haptic();
    var isStock = App.tab === 'stock';
    var opts = isStock
      ? [{ key: 'new', text: '最近登记' }, { key: 'old', text: '最早登记' }, { key: 'title', text: '书名排序' }, { key: 'price', text: '价格从高到低' }]
      : [{ key: 'finish', text: '最近读完' }, { key: 'rating', text: '评分从高到低' }, { key: 'title', text: '书名排序' }, { key: 'old', text: '最早登记' }];
    UI.actionSheet('排序方式', opts).then(function (k) {
      if (!k) return;
      if (isStock) { App.filters.stock.sort = k; Views.renderStock(); }
      else { App.filters.reading.sort = k; Views.renderReading(); }
      UI.toast('已按「' + opts.filter(function (o) { return o.key === k; })[0].text + '」排序');
    });
  };

  /* ============================================================
     库存详情
     ============================================================ */
  Views.openStockDetail = function (id) {
    var b = RS.Stock.get(id);
    if (!b) return UI.toast('记录不存在');
    UI.haptic();
    var st = ST_MAP[b.status] || ST_MAP.unread;

    var body =
      '<div class="detail-head">' +
        '<div class="info"><h2>' + esc(b.title) + '</h2>' +
        '<div class="au">' + esc(b.author || '佚名') + '</div>' +
        '<div class="row"><span class="pill ' + st[0] + '">' + st[1] + '</span><span class="tag">' + esc(b.category) + '</span></div>' +
      '</div></div>' +
      '<div class="page-inner">' +
        '<div class="info-grid">' +
          cell('购入价格', b.price ? '¥' + b.price : '未记录') +
          cell('购入日期', fmtDate(b.purchaseDate)) +
          cell('出版社', b.publisher || '未记录') +
          cell('页数', b.pages ? b.pages + ' 页' : '未记录') +
        '</div>' +
        (b.note ? '<div class="sec-title" style="margin-top:18px"><h3>备注</h3></div><div class="text-block">' + esc(b.note) + '</div>' : '') +
        '<div class="sec-title" style="margin-top:18px"><h3>状态流转</h3></div>' +
        '<div class="opt-group" id="stFlow">' +
          RS.STATUS.map(function (s) {
            return '<span class="opt' + (b.status === s.k ? ' on' : '') + '" data-status="' + s.k + '">' +
              '<i class="dot" style="background:' + s.c + '"></i>' + s.t + '</span>';
          }).join('') +
        '</div>' +
        '<p class="field-hint">状态只影响库存台账，不会自动写入已读清单</p>' +
        '<div class="rp-empty" style="margin:18px 0 0;text-align:left;font-size:12px">' +
          '读完了？可以到「已读」页新建一条阅读记录，登记评分、摘抄与感悟。两套台账各自独立，互不覆盖。' +
        '</div>' +
      '</div>';

    var v = App.pushView({
      title: '藏书详情', action: 'more', body: body,
      footer: '<button class="btn btn-ghost" style="flex:1" data-edit>编辑</button>' +
              '<button class="btn btn-primary" style="flex:1.4" data-toread>登记为已读记录</button>',
      onAction: function () { stockMoreSheet(b); }
    });

    $$('[data-status]', v.el).forEach(function (n) {
      n.onclick = function () {
        UI.haptic();
        RS.Stock.update(b.id, { status: n.dataset.status });
        $$('[data-status]', v.el).forEach(function (m) { m.classList.toggle('on', m === n); });
        var p = $('.pill', v.el);
        var st2 = ST_MAP[n.dataset.status];
        p.className = 'pill ' + st2[0]; p.textContent = st2[1];
        UI.toast('状态已更新为「' + st2[1] + '」');
        Views.renderStock();
      };
    });
    $('[data-edit]', v.el).onclick = function () { Views.openStockForm(b.id); };
    $('[data-toread]', v.el).onclick = function () {
      UI.confirm({
        title: '生成阅读记录', ok: '一次性填充',
        text: '将把书名、作者、分类复制到一条新的阅读记录中。复制后两条记录完全独立，之后修改任意一方都不会影响另一方。'
      }).then(function (ok) {
        if (!ok) return;
        App.popView();
        setTimeout(function () {
          Views.openReadingForm(null, { title: b.title, author: b.author, category: b.category });
        }, 240);
      });
    };
  };

  function cell(k, v) {
    return '<div class="info-cell"><span>' + k + '</span><b>' + esc(v) + '</b></div>';
  }

  function stockMoreSheet(b) {
    UI.actionSheet('《' + b.title + '》', [
      { key: 'edit', text: '编辑信息', icon: 'edit' },
      { key: 'copy', text: '复制一条相同藏书', icon: 'save' },
      { key: 'del', text: '删除这条藏书记录', icon: 'trash', danger: true }
    ]).then(function (k) {
      if (k === 'edit') Views.openStockForm(b.id);
      else if (k === 'copy') {
        var c = Object.assign({}, b); delete c.id; c.title = b.title + '（副本）';
        RS.Stock.add(c); Views.renderStock(); UI.toast('已复制');
      }
      else if (k === 'del') {
        UI.confirm({ title: '删除藏书记录？', danger: true, ok: '删除', text: '将从库存台账中移除《' + b.title + '》，不影响已读清单中的同名记录。' })
          .then(function (ok) {
            if (!ok) return;
            RS.Stock.remove(b.id);
            App.popView(); Views.renderStock(); UI.toast('已删除');
          });
      }
    });
  }

  /* ============================================================
     已读详情
     ============================================================ */
  Views.openReadingDetail = function (id) {
    var b = RS.Reading.get(id);
    if (!b) return UI.toast('记录不存在');
    UI.haptic();
    var days = RS.daysBetween(b.startDate, b.finishDate);

    var body =
      '<div class="detail-head">' +
        '<div class="info"><h2>' + esc(b.title) + '</h2>' +
        '<div class="au">' + esc(b.author || '佚名') + '</div>' +
        '<div class="row">' + UI.starsHTML(b.rating, 16) +
          '<span class="tag">' + esc(b.category) + '</span>' +
          '<span class="tag">' + (SRC_MAP[b.source] || '纸质书') + '</span></div>' +
      '</div></div>' +
      '<div class="page-inner">' +
        '<div class="info-grid">' +
          cell('开始阅读', fmtDate(b.startDate)) +
          cell('读完日期', fmtDate(b.finishDate)) +
          cell('耗时', days ? days + ' 天' : '未计算') +
          cell('评分', b.rating ? b.rating + ' / 5' : '未评分') +
        '</div>' +
        (!b.finishDate ? '<p class="field-hint" style="color:var(--warn)">未填写读完日期，该记录不会计入月度 / 年度报告</p>' : '') +

        '<div class="sec-title" style="margin-top:20px"><h3>阅读感悟</h3></div>' +
        '<div class="text-block' + (b.reflection ? '' : ' ph') + '" data-edit-reflect>' +
          (b.reflection ? esc(b.reflection) : '还没有写下感悟，点这里开始记录…') + '</div>' +

        '<div class="sec-title" style="margin-top:20px"><h3>摘抄 · ' + (b.excerpts || []).length + '</h3>' +
          '<span class="more" data-add-ex>+ 新增</span></div>' +
        '<div class="book-list" id="exList">' + excerptListHTML(b) + '</div>' +
      '</div>';

    var v = App.pushView({
      title: '阅读记录', action: 'more', body: body,
      footer: '<button class="btn btn-ghost" style="flex:1" data-edit>编辑记录</button>' +
              '<button class="btn btn-primary" style="flex:1" data-add-ex2>' + UI.icon('quote') + '添加摘抄</button>',
      onAction: function () { readingMoreSheet(b); }
    });

    function refresh() {
      var nb = RS.Reading.get(id);
      $('#exList', v.el).innerHTML = excerptListHTML(nb);
      var heads = $$('.sec-title h3', v.el);
      if (heads[1]) heads[1].textContent = '摘抄 · ' + (nb.excerpts || []).length;
      bindEx();
      Views.renderReading();
    }
    function bindEx() {
      $$('[data-ex]', v.el).forEach(function (n) {
        n.onclick = function () {
          var nb = RS.Reading.get(id);
          var ex = (nb.excerpts || []).filter(function (e) { return e.id === n.dataset.ex; })[0];
          UI.actionSheet('摘抄操作', [
            { key: 'edit', text: '编辑摘抄', icon: 'edit' },
            { key: 'copy', text: '复制文字', icon: 'save' },
            { key: 'del', text: '删除摘抄', icon: 'trash', danger: true }
          ]).then(function (k) {
            if (k === 'edit') Views.openExcerptForm(id, ex, refresh);
            else if (k === 'copy') {
              navigator.clipboard && navigator.clipboard.writeText(ex.text);
              UI.toast('已复制到剪贴板');
            }
            else if (k === 'del') {
              UI.confirm({ title: '删除这条摘抄？', danger: true, ok: '删除', text: '删除后无法恢复。' }).then(function (ok) {
                if (!ok) return;
                RS.Reading.removeExcerpt(id, ex.id); refresh(); UI.toast('已删除');
              });
            }
          });
        };
      });
    }
    bindEx();

    $('[data-add-ex]', v.el).onclick = function () { Views.openExcerptForm(id, null, refresh); };
    $('[data-add-ex2]', v.el).onclick = function () { Views.openExcerptForm(id, null, refresh); };
    $('[data-edit]', v.el).onclick = function () { Views.openReadingForm(id); };
    $('[data-edit-reflect]', v.el).onclick = function () { Views.openReflectionForm(id); };
  };

  function excerptListHTML(b) {
    var ex = b.excerpts || [];
    if (!ex.length) return '<div class="rp-empty" style="margin:0">还没有摘抄，把打动你的句子存下来吧</div>';
    return ex.slice().sort(function (a, z) { return z.createdAt - a.createdAt; }).map(function (e) {
      return '<div class="quote-card" data-ex="' + e.id + '">' +
        '<div class="qt">' + esc(e.text) + '</div>' +
        '<div class="qf"><b>' + (e.page ? 'P' + esc(e.page) : '未标页码') + '</b>' +
        '<span>' + new Date(e.createdAt).toLocaleDateString('zh-CN') + '</span></div></div>';
    }).join('');
  }

  function readingMoreSheet(b) {
    UI.actionSheet('《' + b.title + '》', [
      { key: 'edit', text: '编辑阅读记录', icon: 'edit' },
      { key: 'reflect', text: '续写阅读感悟', icon: 'quote' },
      { key: 'del', text: '删除这条阅读记录', icon: 'trash', danger: true }
    ]).then(function (k) {
      if (k === 'edit') Views.openReadingForm(b.id);
      else if (k === 'reflect') Views.openReflectionForm(b.id);
      else if (k === 'del') {
        UI.confirm({ title: '删除阅读记录？', danger: true, ok: '删除', text: '《' + b.title + '》的评分、摘抄与感悟将一并删除，不影响库存台账中的同名藏书。' })
          .then(function (ok) {
            if (!ok) return;
            RS.Reading.remove(b.id);
            App.popView(); Views.renderReading(); UI.toast('已删除');
          });
      }
    });
  }

  Views.ST_MAP = ST_MAP;
  Views.SRC_MAP = SRC_MAP;
  Views.fmtDate = fmtDate;
  Views.sortList = sortList;
  Views.emptyHTML = emptyHTML;
})(window);
