/* ============================================================
   阅栈 ReadStack · 阅读数据报告
   口径统一：所有周期统计以「读完日期 finishDate」归属；
   未填读完日期的记录仅计入全域总量，不进入月/年报告。
   ============================================================ */
(function (global) {
  'use strict';

  var Report = { mode: 'all', ym: '', year: '' };
  global.Report = Report;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return Charts.esc(s); };

  function initPeriod() {
    var d = new Date();
    if (!Report.ym) Report.ym = d.toISOString().slice(0, 7);
    if (!Report.year) Report.year = String(d.getFullYear());
  }

  Report.render = function () {
    initPeriod();
    var html =
      '<div class="page-hero"><h2>阅读<em>数据报告</em></h2><p>基于已读清单自动生成 · 以读完日期归期</p></div>' +
      '<div class="rp-switch">' +
        btn('all', '全域总报告') + btn('month', '月度') + btn('year', '年度') +
      '</div><div id="rpBody"></div>';
    $('#page-report').innerHTML = html;

    $$('[data-mode]', $('#page-report')).forEach(function (n) {
      n.onclick = function () { UI.haptic(); Report.mode = n.dataset.mode; Report.render(); };
    });
    body();
  };

  function btn(k, t) {
    return '<button data-mode="' + k + '" class="' + (Report.mode === k ? 'on' : '') + '">' + t + '</button>';
  }

  function body() {
    var box = $('#rpBody');
    if (Report.mode === 'all') box.innerHTML = allReport();
    else if (Report.mode === 'month') box.innerHTML = monthReport();
    else box.innerHTML = yearReport();
    bindPeriod(box);
  }

  function bindPeriod(box) {
    var prev = $('[data-prev]', box), next = $('[data-next]', box);
    if (prev) prev.onclick = function () { shift(-1); };
    if (next) next.onclick = function () { shift(1); };
  }

  function shift(dir) {
    UI.haptic();
    if (Report.mode === 'month') {
      var y = +Report.ym.slice(0, 4), m = +Report.ym.slice(5, 7) + dir;
      if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
      Report.ym = y + '-' + String(m).padStart(2, '0');
    } else {
      Report.year = String(+Report.year + dir);
    }
    body();
  }

  function noData(text) {
    return '<div class="rp-empty">' + text + '</div>';
  }

  /* ============================================================
     全域总报告
     ============================================================ */
  function allReport() {
    var list = RS.Reading.all();
    if (!list.length) {
      return noData('还没有阅读记录<br>到「已读」页登记第一本读完的书，报告会自动生成');
    }
    var s = RS.Report.summary(list);
    var cats = RS.Report.byCategory(list);
    var authors = RS.Report.byAuthor(list).slice(0, 5);
    var trend = RS.Report.yearlyTrend();
    var dist = RS.Report.ratingDist(list);
    var unDated = list.filter(function (b) { return !b.finishDate; }).length;
    var stock = RS.Stock.stats();

    var h = '';
    h += '<div class="rp-hero">' +
      '<div class="lb">累计读完</div>' +
      '<div class="big">' + s.books + '<i>本</i></div>' +
      '<div class="grid">' +
        '<div><b>' + s.excerpts + '</b><span>条摘抄</span></div>' +
        '<div><b>' + (s.avgRating || '—') + '</b><span>平均评分</span></div>' +
        '<div><b>' + (s.avgDays || '—') + '</b><span>本均天数</span></div>' +
      '</div></div>';

    h += '<div class="rp-card"><h4>阅读分类构成<span class="unit">共 ' + cats.length + ' 类</span></h4>' +
      '<div class="desc">按已读清单的分类字段统计占比</div>' +
      '<div class="donut-wrap">' +
        Charts.donut(cats, { size: 128, stroke: 21, centerTop: s.books, centerBottom: '本' }) +
        Charts.legend(cats.slice(0, 6), s.books) +
      '</div></div>';

    h += '<div class="rp-card"><h4>评分分布<span class="unit">已评 ' +
      dist.reduce(function (a, b) { return a + b; }, 0) + ' 本</span></h4>' +
      '<div class="desc">你给出的星级分布，可看出打分是否克制</div>' +
      Charts.bars(dist, ['1星', '2星', '3星', '4星', '5星'], { height: 118, gap: 12 }) +
      '</div>';

    if (trend.length) {
      h += '<div class="rp-card"><h4>年度阅读趋势</h4>' +
        '<div class="desc">按读完年份统计，观察长期节奏</div>' +
        Charts.line(trend, { height: 122 }) + '</div>';
    }

    if (authors.length) {
      h += '<div class="rp-card"><h4>常读作者 Top' + authors.length + '</h4>' +
        '<div class="desc">读过同一作者多本书，往往意味着真正的偏爱</div>' +
        Charts.rank(authors, ' 本') + '</div>';
    }

    h += insightCard(list, '全域');

    h += '<div class="rp-card"><h4>台账对照<span class="unit">两库独立统计</span></h4>' +
      '<div class="desc">库存台账与已读清单各自独立，此处仅做并列展示，不做数据关联</div>' +
      '<div class="info-grid">' +
        ic('库存藏书', stock.total + ' 本') + ic('阅读记录', list.length + ' 条') +
        ic('库存投入', '¥' + Math.round(stock.amount)) + ic('未填读完日', unDated + ' 条') +
      '</div>' +
      (unDated ? '<p class="field-hint" style="color:var(--warn);margin-top:10px">有 ' + unDated + ' 条记录未填读完日期，不计入月度 / 年度报告</p>' : '') +
      '</div>';

    return h;
  }

  function ic(k, v) {
    return '<div class="info-cell"><span>' + k + '</span><b>' + esc(v) + '</b></div>';
  }

  /* ============================================================
     月度报告
     ============================================================ */
  function monthReport() {
    var ym = Report.ym;
    var list = RS.Report.scope(ym);
    var s = RS.Report.summary(list);
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7);

    // 环比
    var pm = m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0');
    var prevN = RS.Report.scope(pm).length;
    var delta = s.books - prevN;
    var deltaTxt = prevN === 0 && s.books === 0 ? '与上月持平' :
      delta > 0 ? '较上月多读 ' + delta + ' 本' : delta < 0 ? '较上月少读 ' + (-delta) + ' 本' : '与上月持平';

    var cur = new Date();
    var isFuture = (y > cur.getFullYear()) || (y === cur.getFullYear() && m > cur.getMonth() + 1);

    var h = '<div class="period">' +
      '<button data-prev>' + UI.icon('left') + '</button>' +
      '<b>' + y + ' 年 ' + m + ' 月</b>' +
      '<button data-next' + (isFuture ? ' disabled' : '') + '>' + UI.icon('right') + '</button></div>';

    if (!list.length) {
      h += '<div class="rp-hero"><div class="lb">' + m + ' 月读完</div><div class="big">0<i>本</i></div>' +
        '<div class="grid"><div><b>0</b><span>条摘抄</span></div><div><b>—</b><span>平均评分</span></div><div><b>' + prevN + '</b><span>上月本数</span></div></div></div>';
      h += noData('这个月还没有读完的书<br>把书读完后填上「读完日期」，就会出现在这里');
      return h;
    }

    h += '<div class="rp-hero">' +
      '<div class="lb">' + m + ' 月读完 · ' + deltaTxt + '</div>' +
      '<div class="big">' + s.books + '<i>本</i></div>' +
      '<div class="grid">' +
        '<div><b>' + s.excerpts + '</b><span>条摘抄</span></div>' +
        '<div><b>' + (s.avgRating || '—') + '</b><span>平均评分</span></div>' +
        '<div><b>' + (s.avgDays || '—') + '</b><span>本均天数</span></div>' +
      '</div></div>';

    h += '<div class="rp-card"><h4>阅读日历<span class="unit">' + m + ' 月</span></h4>' +
      '<div class="desc">色块越深，当天读完的书越多</div>' +
      Charts.heatmap(ym, RS.Report.dailyOfMonth(ym)) + '</div>';

    var cats = RS.Report.byCategory(list);
    if (cats.length > 1) {
      h += '<div class="rp-card"><h4>本月分类构成</h4>' +
        '<div class="donut-wrap">' +
          Charts.donut(cats, { size: 112, stroke: 19, centerTop: s.books, centerBottom: '本' }) +
          Charts.legend(cats.slice(0, 5), s.books) +
        '</div></div>';
    }

    h += '<div class="rp-card"><h4>本月书单</h4><div class="desc">按读完日期倒序</div>' +
      '<div class="book-list">' + list.slice().sort(function (a, b) {
        return (b.finishDate || '').localeCompare(a.finishDate || '');
      }).map(function (b) {
        return '<div class="book-item" style="padding:8px" data-open-read="' + b.id + '">' +
          Views.coverHTML(b, 'sm') +
          '<div class="bi-main"><div class="bi-title">' + esc(b.title) + '</div>' +
          '<div class="bi-author">' + esc(b.author || '佚名') + '</div>' +
          '<div class="bi-meta">' + UI.starsHTML(b.rating) + '<span>' + Views.fmtDate(b.finishDate) + '</span>' +
          ((b.excerpts || []).length ? '<span>摘抄' + b.excerpts.length + '</span>' : '') + '</div></div></div>';
      }).join('') + '</div></div>';

    h += insightCard(list, y + '年' + m + '月');
    setTimeout(bindOpen, 0);
    return h;
  }

  /* ============================================================
     年度报告
     ============================================================ */
  function yearReport() {
    var y = Report.year;
    var list = RS.Report.scope(y);
    var s = RS.Report.summary(list);
    var months = RS.Report.monthlyOfYear(y);
    var cur = new Date().getFullYear();

    var h = '<div class="period">' +
      '<button data-prev>' + UI.icon('left') + '</button>' +
      '<b>' + y + ' 年度报告</b>' +
      '<button data-next' + (+y >= cur ? ' disabled' : '') + '>' + UI.icon('right') + '</button></div>';

    if (!list.length) {
      h += noData(y + ' 年还没有读完的书<br>切换年份，或到「已读」页补录记录');
      return h;
    }

    var best = months.indexOf(Math.max.apply(null, months));
    var activeMonths = months.filter(function (v) { return v > 0; }).length;

    h += '<div class="rp-hero">' +
      '<div class="lb">' + y + " 年共读完</div>" +
      '<div class="big">' + s.books + '<i>本</i></div>' +
      '<div class="grid">' +
        '<div><b>' + activeMonths + '</b><span>个月有产出</span></div>' +
        '<div><b>' + (best + 1) + '月</b><span>读得最多</span></div>' +
        '<div><b>' + s.excerpts + '</b><span>条摘抄</span></div>' +
      '</div></div>';

    h += '<div class="rp-card"><h4>月度分布<span class="unit">单位：本</span></h4>' +
      '<div class="desc">' + (best + 1) + ' 月读完 ' + months[best] + ' 本，是今年的阅读高峰</div>' +
      Charts.bars(months, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        { height: 130, gap: 5, highlight: best }) + '</div>';

    var cats = RS.Report.byCategory(list);
    h += '<div class="rp-card"><h4>年度分类构成</h4>' +
      '<div class="donut-wrap">' +
        Charts.donut(cats, { size: 118, stroke: 20, centerTop: cats[0].value, centerBottom: cats[0].name }) +
        Charts.legend(cats.slice(0, 5), s.books) +
      '</div></div>';

    var top = list.slice().filter(function (b) { return b.rating >= 4; })
      .sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); }).slice(0, 5);
    if (top.length) {
      h += '<div class="rp-card"><h4>年度高分书单<span class="unit">4 星及以上</span></h4>' +
        '<div class="book-list">' + top.map(function (b) {
          return '<div class="book-item" style="padding:8px" data-open-read="' + b.id + '">' +
            Views.coverHTML(b, 'sm') +
            '<div class="bi-main"><div class="bi-title">' + esc(b.title) + '</div>' +
            '<div class="bi-author">' + esc(b.author || '佚名') + '</div>' +
            '<div class="bi-meta">' + UI.starsHTML(b.rating) + '<span class="tag">' + esc(b.category) + '</span></div></div>' +
            '<div class="bi-right"><span class="bi-score">' + b.rating + '.0</span></div></div>';
        }).join('') + '</div></div>';
    }

    var authors = RS.Report.byAuthor(list).slice(0, 5);
    if (authors.length) {
      h += '<div class="rp-card"><h4>年度作者榜</h4>' + Charts.rank(authors, ' 本') + '</div>';
    }

    h += insightCard(list, y + ' 年度');
    setTimeout(bindOpen, 0);
    return h;
  }

  function bindOpen() {
    $$('[data-open-read]', $('#page-report')).forEach(function (n) {
      n.onclick = function () { Views.openReadingDetail(n.dataset.openRead); };
    });
  }

  /* ============================================================
     智能偏好分析（规则引擎，全本地）
     ============================================================ */
  function insightCard(list, scopeName) {
    var ins = RS.Report.insight(list);
    if (!ins) return '';

    var p1 = '在' + scopeName + '范围内，你读得最多的是 <b>' + esc(ins.topCat) + '</b>，占全部阅读的 <em>' +
      ins.topRatio + '%</em>，' + ins.taste + '。';

    var p2 = '阅读节奏' + ins.paceTxt +
      (ins.avgDays ? '，平均 <b>' + ins.avgDays + ' 天</b>读完一本' : '') + '。' +
      '主要载体是 <b>' + ins.srcTxt + '</b>。';

    var p3 = ins.avgRating
      ? '平均给分 <em>' + ins.avgRating + '</em> 分，其中 <b>' + ins.highRatio + '%</b> 的书拿到 4 星以上' +
        (ins.highRatio >= 70 ? '——选书命中率很高，或者你确实比较宽容。' :
         ins.highRatio >= 40 ? '——打分尚算克制，喜欢与否分得清楚。' : '——你是个要求相当高的读者。')
      : '还没有给这些书打分，评分之后可以看到更精确的偏好判断。';

    var p4 = ins.excerptPer > 0
      ? '平均每本留下 <b>' + ins.excerptPer + '</b> 条摘抄' +
        (ins.excerptPer >= 2 ? '，是会跟书较劲的读法。' : '，可以试着多摘几句，日后回看会很有意思。')
      : '还没有摘抄记录，下次读到好句子随手存一条。';

    var p5 = ins.authors.length
      ? '你反复回到 ' + ins.authors.map(function (a) { return '<b>' + esc(a.name) + '</b>'; }).join('、') +
        ' 的作品里，这通常比分类更能说明口味。'
      : '';

    var kws = ins.cats.map(function (c, i) {
      return '<span class="kw' + (i === 0 ? ' hot' : '') + '">' + esc(c.name) + ' ' + c.value + '</span>';
    }).join('');

    return '<div class="insight">' +
      '<h4>阅读偏好小结<span class="badge">自动生成</span></h4>' +
      '<p>' + p1 + '</p><p>' + p2 + '</p><p>' + p3 + '</p><p>' + p4 + '</p>' +
      (p5 ? '<p>' + p5 + '</p>' : '') +
      '<div class="kw-row">' + kws + '</div>' +
      '</div>';
  }

})(window);
