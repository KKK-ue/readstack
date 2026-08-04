/* ============================================================
   阅栈 ReadStack · 数据层
   设计原则：
   1) 库存台账(stock) 与 已读清单(reading) 物理隔离 —— 两个独立
      存储键、独立 ID 空间、独立 CRUD，不存在任何自动同步逻辑。
   2) 唯一的跨库操作是「一次性字段填充」，由用户显式触发，
      复制后即断开关系，后续互不影响。
   3) 纯 localStorage，无网络、无三方依赖。
   ============================================================ */
(function (global) {
  'use strict';

  var K = {
    stock: 'rs.stock.v1',      // 库存台账
    reading: 'rs.reading.v1',  // 已读清单
    meta: 'rs.meta.v1'         // 应用元数据
  };

  var CATEGORIES = ['文学', '小说', '社科', '历史', '科普', '心理', '经管', '哲学', '艺术', '传记', '技术', '其他'];

  var STATUS = [
    { k: 'unread',  t: '未读', c: 'var(--st-unread)' },
    { k: 'reading', t: '在读', c: 'var(--st-reading)' },
    { k: 'done',    t: '已读', c: 'var(--st-done)' },
    { k: 'drop',    t: '弃读', c: 'var(--st-drop)' }
  ];

  function uid(p) {
    return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function now() { return Date.now(); }

  /* 存储适配：优先 localStorage；file:// 等受限环境自动降级为内存存储，
     保证功能完整可用（降级时数据仅在本次会话有效，UI 会给出提示）。 */
  var MEM = {}, PERSIST = (function () {
    try {
      var t = '__rs_t__';
      localStorage.setItem(t, '1'); localStorage.removeItem(t);
      return true;
    } catch (e) { return false; }
  })();

  function read(key, def) {
    try {
      var raw = PERSIST ? localStorage.getItem(key) : MEM[key];
      if (!raw) return def;
      var v = JSON.parse(raw);
      return v == null ? def : v;
    } catch (e) { return def; }
  }
  function write(key, val) {
    var s = JSON.stringify(val);
    if (!PERSIST) { MEM[key] = s; return true; }
    try {
      localStorage.setItem(key, s);
      return true;
    } catch (e) {
      // 容量超限（封面图过多）
      global.dispatchEvent(new CustomEvent('rs:storage-full'));
      return false;
    }
  }

  /* ---------------- 库存台账 ---------------- */
  var Stock = {
    all: function () { return read(K.stock, []); },
    save: function (list) { return write(K.stock, list); },
    get: function (id) {
      var l = this.all();
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },
    add: function (data) {
      var l = this.all();
      var item = Object.assign({
        id: uid('sk'), title: '', author: '', category: '其他', publisher: '',
        price: 0, pages: 0, cover: '', status: 'unread',
        purchaseDate: '', tags: [], note: '',
        createdAt: now(), updatedAt: now()
      }, data);
      item.id = item.id || uid('sk');
      l.unshift(item);
      this.save(l);
      return item;
    },
    update: function (id, patch) {
      var l = this.all();
      for (var i = 0; i < l.length; i++) {
        if (l[i].id === id) {
          l[i] = Object.assign({}, l[i], patch, { id: id, updatedAt: now() });
          this.save(l);
          return l[i];
        }
      }
      return null;
    },
    remove: function (id) {
      var l = this.all().filter(function (x) { return x.id !== id; });
      return this.save(l);
    },
    stats: function () {
      var l = this.all(), s = { total: l.length, unread: 0, reading: 0, done: 0, drop: 0, amount: 0 };
      l.forEach(function (b) {
        s[b.status] = (s[b.status] || 0) + 1;
        s.amount += Number(b.price) || 0;
      });
      return s;
    }
  };

  /* ---------------- 已读清单 ---------------- */
  var Reading = {
    all: function () { return read(K.reading, []); },
    save: function (list) { return write(K.reading, list); },
    get: function (id) {
      var l = this.all();
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },
    add: function (data) {
      var l = this.all();
      var item = Object.assign({
        id: uid('rd'), title: '', author: '', category: '其他',
        source: 'paper',                   // paper 纸质 / ebook 电子 / audio 有声
        startDate: '', finishDate: '',
        rating: 0, cover: '',
        excerpts: [],                      // [{id,text,page,createdAt}]
        reflection: '',
        createdAt: now(), updatedAt: now()
      }, data);
      item.id = item.id || uid('rd');
      l.unshift(item);
      this.save(l);
      return item;
    },
    update: function (id, patch) {
      var l = this.all();
      for (var i = 0; i < l.length; i++) {
        if (l[i].id === id) {
          l[i] = Object.assign({}, l[i], patch, { id: id, updatedAt: now() });
          this.save(l);
          return l[i];
        }
      }
      return null;
    },
    remove: function (id) {
      var l = this.all().filter(function (x) { return x.id !== id; });
      return this.save(l);
    },
    /* 摘抄子集合 */
    addExcerpt: function (bookId, text, page) {
      var b = this.get(bookId); if (!b) return null;
      var ex = { id: uid('ex'), text: text, page: page || '', createdAt: now() };
      b.excerpts = (b.excerpts || []).concat([ex]);
      this.update(bookId, { excerpts: b.excerpts });
      return ex;
    },
    updateExcerpt: function (bookId, exId, text, page) {
      var b = this.get(bookId); if (!b) return null;
      (b.excerpts || []).forEach(function (e) {
        if (e.id === exId) { e.text = text; e.page = page || ''; }
      });
      this.update(bookId, { excerpts: b.excerpts });
      return true;
    },
    removeExcerpt: function (bookId, exId) {
      var b = this.get(bookId); if (!b) return null;
      b.excerpts = (b.excerpts || []).filter(function (e) { return e.id !== exId; });
      this.update(bookId, { excerpts: b.excerpts });
      return true;
    },
    allExcerpts: function () {
      var out = [];
      this.all().forEach(function (b) {
        (b.excerpts || []).forEach(function (e) {
          out.push({ ex: e, bookId: b.id, title: b.title, author: b.author, category: b.category });
        });
      });
      return out.sort(function (a, z) { return z.ex.createdAt - a.ex.createdAt; });
    }
  };

  /* ---------------- 报告统计 ---------------- */
  function ymOf(dateStr) {
    if (!dateStr) return '';
    return String(dateStr).slice(0, 7);
  }
  function daysBetween(a, b) {
    if (!a || !b) return 0;
    var d = (new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000;
    return d >= 0 ? Math.round(d) + 1 : 0;
  }

  var Report = {
    /** 口径：以「读完日期 finishDate」归属周期；无读完日期的记录计入「未归期」，不进入月/年统计 */
    scope: function (range) {
      var list = Reading.all();
      if (!range) return list;
      return list.filter(function (b) {
        if (!b.finishDate) return false;
        if (range.length === 4) return b.finishDate.slice(0, 4) === range;
        return b.finishDate.slice(0, 7) === range;
      });
    },
    summary: function (list) {
      var n = list.length, ex = 0, rateSum = 0, rateN = 0, dayTotal = 0, dayN = 0, refl = 0;
      list.forEach(function (b) {
        ex += (b.excerpts || []).length;
        if (b.rating > 0) { rateSum += b.rating; rateN++; }
        var d = daysBetween(b.startDate, b.finishDate);
        if (d > 0) { dayTotal += d; dayN++; }
        if (b.reflection && b.reflection.trim()) refl++;
      });
      return {
        books: n,
        excerpts: ex,
        avgRating: rateN ? +(rateSum / rateN).toFixed(1) : 0,
        avgDays: dayN ? Math.round(dayTotal / dayN) : 0,
        totalDays: dayTotal,
        reflections: refl
      };
    },
    byCategory: function (list) {
      var m = {};
      list.forEach(function (b) { var c = b.category || '其他'; m[c] = (m[c] || 0) + 1; });
      return Object.keys(m).map(function (k) { return { name: k, value: m[k] }; })
        .sort(function (a, z) { return z.value - a.value; });
    },
    byAuthor: function (list) {
      var m = {};
      list.forEach(function (b) { var a = (b.author || '佚名').trim(); m[a] = (m[a] || 0) + 1; });
      return Object.keys(m).map(function (k) { return { name: k, value: m[k] }; })
        .sort(function (a, z) { return z.value - a.value; });
    },
    ratingDist: function (list) {
      var d = [0, 0, 0, 0, 0];
      list.forEach(function (b) { if (b.rating >= 1 && b.rating <= 5) d[b.rating - 1]++; });
      return d;
    },
    monthlyOfYear: function (year) {
      var arr = new Array(12).fill(0);
      Reading.all().forEach(function (b) {
        if (b.finishDate && b.finishDate.slice(0, 4) === String(year)) {
          var m = parseInt(b.finishDate.slice(5, 7), 10) - 1;
          if (m >= 0 && m < 12) arr[m]++;
        }
      });
      return arr;
    },
    yearlyTrend: function () {
      var m = {};
      Reading.all().forEach(function (b) {
        if (!b.finishDate) return;
        var y = b.finishDate.slice(0, 4);
        m[y] = (m[y] || 0) + 1;
      });
      return Object.keys(m).sort().map(function (y) { return { name: y, value: m[y] }; });
    },
    availableYears: function () {
      var s = {};
      Reading.all().forEach(function (b) { if (b.finishDate) s[b.finishDate.slice(0, 4)] = 1; });
      var ys = Object.keys(s).sort();
      var cur = String(new Date().getFullYear());
      if (ys.indexOf(cur) < 0) ys.push(cur);
      return ys.sort();
    },
    /** 月内每日完成量，用于热力图 */
    dailyOfMonth: function (ym) {
      var m = {};
      Reading.all().forEach(function (b) {
        if (b.finishDate && b.finishDate.slice(0, 7) === ym) {
          var d = parseInt(b.finishDate.slice(8, 10), 10);
          m[d] = (m[d] || 0) + 1;
        }
      });
      return m;
    },
    /** 规则式偏好分析 */
    insight: function (list) {
      if (!list.length) return null;
      var cats = this.byCategory(list);
      var authors = this.byAuthor(list).filter(function (a) { return a.value > 1; });
      var sum = this.summary(list);
      var top = cats[0];
      var ratio = Math.round(top.value / list.length * 100);
      var high = list.filter(function (b) { return b.rating >= 4; });
      var best = list.slice().sort(function (a, z) { return (z.rating || 0) - (a.rating || 0); })[0];
      var srcM = {}; list.forEach(function (b) { srcM[b.source || 'paper'] = (srcM[b.source || 'paper'] || 0) + 1; });
      var srcTop = Object.keys(srcM).sort(function (a, z) { return srcM[z] - srcM[a]; })[0];
      var srcTxt = { paper: '纸质书', ebook: '电子书', audio: '有声书' }[srcTop] || '纸质书';

      var pace = sum.avgDays;
      var paceTxt = pace === 0 ? '未记录起止日期' :
                    pace <= 7 ? '偏快，属于「一口气读完」型' :
                    pace <= 20 ? '节奏均衡，通常两三周啃完一本' :
                                 '偏慢热，习惯长线细读';

      var taste = ratio >= 55 ? '口味相当专一' : ratio >= 35 ? '有明显主线但不排斥旁支' : '涉猎面很杂，是杂食型读者';

      return {
        topCat: top.name,
        topRatio: ratio,
        cats: cats.slice(0, 5),
        authors: authors.slice(0, 3),
        taste: taste,
        paceTxt: paceTxt,
        avgDays: sum.avgDays,
        avgRating: sum.avgRating,
        highRatio: list.length ? Math.round(high.length / list.length * 100) : 0,
        best: best,
        srcTxt: srcTxt,
        excerptPer: list.length ? +(sum.excerpts / list.length).toFixed(1) : 0
      };
    }
  };

  /* ---------------- 全局检索 ---------------- */
  function Search(kw) {
    kw = (kw || '').trim().toLowerCase();
    var res = { stock: [], reading: [], excerpts: [], reflections: [] };
    if (!kw) return res;
    var hit = function (s) { return s && String(s).toLowerCase().indexOf(kw) >= 0; };

    Stock.all().forEach(function (b) {
      if (hit(b.title) || hit(b.author) || hit(b.category) || hit(b.publisher) || hit(b.note)) res.stock.push(b);
    });
    Reading.all().forEach(function (b) {
      if (hit(b.title) || hit(b.author) || hit(b.category)) res.reading.push(b);
      if (hit(b.reflection)) res.reflections.push(b);
      (b.excerpts || []).forEach(function (e) {
        if (hit(e.text)) res.excerpts.push({ ex: e, bookId: b.id, title: b.title, author: b.author });
      });
    });
    return res;
  }

  /* ---------------- 备份 / 恢复 ---------------- */
  var Backup = {
    export: function () {
      return JSON.stringify({
        app: 'ReadStack', version: 1, exportedAt: new Date().toISOString(),
        stock: Stock.all(), reading: Reading.all()
      });
    },
    import: function (json, mode) {
      var data = JSON.parse(json);
      if (!data || data.app !== 'ReadStack') throw new Error('文件格式不匹配');
      var sk = Array.isArray(data.stock) ? data.stock : [];
      var rd = Array.isArray(data.reading) ? data.reading : [];
      if (mode === 'merge') {
        var exS = {}, exR = {};
        Stock.all().forEach(function (b) { exS[b.id] = 1; });
        Reading.all().forEach(function (b) { exR[b.id] = 1; });
        Stock.save(Stock.all().concat(sk.filter(function (b) { return !exS[b.id]; })));
        Reading.save(Reading.all().concat(rd.filter(function (b) { return !exR[b.id]; })));
      } else {
        Stock.save(sk); Reading.save(rd);
      }
      Meta.set('lastBackup', Date.now());
      return { stock: sk.length, reading: rd.length };
    },
    clearAll: function () {
      Stock.save([]); Reading.save([]);
    },
    size: function () {
      var n = 0;
      [K.stock, K.reading, K.meta].forEach(function (k) {
        var v = PERSIST ? localStorage.getItem(k) : MEM[k];
        if (v) n += v.length;
      });
      return n;
    },
    persistent: function () { return PERSIST; }
  };

  var Meta = {
    all: function () { return read(K.meta, {}); },
    get: function (k, d) { var m = this.all(); return m[k] === undefined ? d : m[k]; },
    set: function (k, v) { var m = this.all(); m[k] = v; write(K.meta, m); }
  };

  /* ---------------- 图片压缩（封面入库前统一处理） ---------------- */
  function compressImage(source, maxW, quality) {
    maxW = maxW || 480; quality = quality || 0.82;
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var r = Math.min(1, maxW / img.width);
        var w = Math.round(img.width * r), h = Math.round(img.height * r);
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = source;
    });
  }

  /* ---------------- 示例数据 ---------------- */
  function seed() {
    if (Meta.get('seeded')) return;
    var Y = new Date().getFullYear();
    var stock = [
      { title: '百年孤独', author: '加西亚·马尔克斯', category: '文学', publisher: '南海出版公司', price: 55, pages: 360, status: 'done', purchaseDate: Y + '-01-12', tags: ['魔幻现实'], note: '精装典藏版' },
      { title: '人类简史', author: '尤瓦尔·赫拉利', category: '历史', publisher: '中信出版社', price: 68, pages: 440, status: 'done', purchaseDate: Y + '-02-03', tags: ['大历史'] },
      { title: '深度工作', author: '卡尔·纽波特', category: '经管', publisher: '江西人民出版社', price: 42, pages: 280, status: 'reading', purchaseDate: Y + '-03-18' },
      { title: '万物简史', author: '比尔·布莱森', category: '科普', publisher: '接力出版社', price: 58, pages: 460, status: 'unread', purchaseDate: Y + '-04-02' },
      { title: '沉默的大多数', author: '王小波', category: '文学', publisher: '北京十月文艺', price: 39, pages: 320, status: 'done', purchaseDate: Y + '-04-21' },
      { title: '被讨厌的勇气', author: '岸见一郎', category: '心理', publisher: '机械工业出版社', price: 45, pages: 232, status: 'done', purchaseDate: Y + '-05-09' },
      { title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', category: '历史', publisher: '中信出版社', price: 78, pages: 528, status: 'unread', purchaseDate: Y + '-05-30' },
      { title: '小于一', author: '约瑟夫·布罗茨基', category: '文学', publisher: '浙江文艺出版社', price: 88, pages: 528, status: 'drop', purchaseDate: Y + '-06-11', note: '太硬，暂时放下' }
    ];
    stock.forEach(function (b) { Stock.add(b); });

    var reading = [
      {
        title: '百年孤独', author: '加西亚·马尔克斯', category: '文学', source: 'paper',
        startDate: Y + '-01-14', finishDate: Y + '-02-08', rating: 5,
        reflection: '读到最后一页时忽然明白，马孔多的雨下了四年十一个月，而孤独下了一百年。\n家族七代人反复使用相同的名字，也反复掉进相同的命运里——这大概是全书最残忍的设计：不是命运不给机会，而是人根本认不出自己正在重演什么。',
        excerpts: [
          { text: '生命中真正重要的不是你遭遇了什么，而是你记住了哪些事，又是如何铭记的。', page: '312' },
          { text: '过去都是假的，回忆是一条没有归途的路。', page: '198' }
        ]
      },
      {
        title: '人类简史', author: '尤瓦尔·赫拉利', category: '历史', source: 'paper',
        startDate: Y + '-02-15', finishDate: Y + '-03-10', rating: 5,
        reflection: '「虚构故事」这个概念一旦装进脑子就拿不出来了。货币、国家、公司、法律，全都是大规模陌生人之间的共同想象。\n它解释了人类为什么能协作，也解释了协作为什么这么脆弱。',
        excerpts: [
          { text: '大规模人类合作系统，都立基于虚构的故事之上。', page: '38' },
          { text: '快乐并非来自客观条件，而是来自期望与现实之间的落差。', page: '401' }
        ]
      },
      {
        title: '被讨厌的勇气', author: '岸见一郎', category: '心理', source: 'ebook',
        startDate: Y + '-05-12', finishDate: Y + '-05-21', rating: 4,
        reflection: '课题分离是本书里最实用的一把刀：别人怎么评价我，是别人的课题；我怎么活，是我的课题。\n知道不等于做到，但至少现在焦虑的时候能问一句——这到底是谁的课题。',
        excerpts: [{ text: '一切烦恼都来自人际关系。', page: '46' }]
      },
      {
        title: '沉默的大多数', author: '王小波', category: '文学', source: 'paper',
        startDate: Y + '-06-01', finishDate: Y + '-06-14', rating: 5,
        reflection: '王小波的好，在于他把「讲道理」写得比抒情还好看。\n他从不居高临下，只是把一件荒唐事摆出来，然后耸耸肩。',
        excerpts: [
          { text: '人的一切痛苦，本质上都是对自己无能的愤怒。', page: '77' },
          { text: '我选择沉默的主要原因之一是：从话语中，你很难学到人性。', page: '12' }
        ]
      },
      {
        title: '置身事内', author: '兰小欢', category: '经管', source: 'paper',
        startDate: Y + '-06-20', finishDate: Y + '-07-05', rating: 4,
        reflection: '把中国政府和经济发展的关系讲得极为清楚，尤其是土地财政那一章，读完再看新闻会有完全不同的理解层次。',
        excerpts: [{ text: '理解政府行为的关键，是理解它面对的约束条件。', page: '164' }]
      },
      {
        title: '夜晚的潜水艇', author: '陈春成', category: '小说', source: 'ebook',
        startDate: Y + '-07-10', finishDate: Y + '-07-19', rating: 4,
        reflection: '想象力密度极高的短篇集，语言像被反复打磨过的玉。《竹峰寺》最好，把「藏起一把钥匙」写成了一场修行。',
        excerpts: [{ text: '我想把它藏在一个隐秘而永恒的地方。', page: '88' }]
      }
    ];
    reading.forEach(function (b) {
      var item = Reading.add(b);
      var exs = (b.excerpts || []).map(function (e, i) {
        return { id: uid('ex'), text: e.text, page: e.page, createdAt: Date.now() - i * 86400000 };
      });
      Reading.update(item.id, { excerpts: exs });
    });

    Meta.set('seeded', true);
  }

  global.RS = {
    Stock: Stock, Reading: Reading, Report: Report,
    Search: Search, Backup: Backup, Meta: Meta,
    CATEGORIES: CATEGORIES, STATUS: STATUS,
    uid: uid, seed: seed, compressImage: compressImage,
    daysBetween: daysBetween, ymOf: ymOf
  };
})(window);
