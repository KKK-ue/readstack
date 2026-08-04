/* ============================================================
   阅栈 ReadStack · UI 基础件：图标 / Toast / 弹窗 / 动作表 / 裁剪器
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------------- 图标（线性，stroke 1.8，澎湃OS 语感） ---------------- */
  var P = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    stock: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"/><path ' + P + ' d="M9 4h5a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 14 20H9"/><path ' + P + ' d="m16.6 6.2 2.2-.6a1.2 1.2 0 0 1 1.5.85l2.1 8.5"/></svg>',
    read: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M12 6.5S9.8 4.8 6.4 4.8c-1.2 0-2 .2-2.4.3v13c.4-.1 1.2-.3 2.4-.3 3.4 0 5.6 1.7 5.6 1.7s2.2-1.7 5.6-1.7c1.2 0 2 .2 2.4.3v-13c-.4-.1-1.2-.3-2.4-.3C14.2 4.8 12 6.5 12 6.5Z"/><path ' + P + ' d="M12 6.5v13"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M4 20h16"/><rect ' + P + ' x="5.5" y="12" width="3.6" height="5.5" rx="1.2"/><rect ' + P + ' x="10.2" y="7.5" width="3.6" height="10" rx="1.2"/><rect ' + P + ' x="14.9" y="4" width="3.6" height="13.5" rx="1.2"/></svg>',
    me: '<svg viewBox="0 0 24 24"><circle ' + P + ' cx="12" cy="8.2" r="3.8"/><path ' + P + ' d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle ' + P + ' cx="11" cy="11" r="6.5"/><path ' + P + ' d="m16 16 4 4"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path ' + P + ' stroke-width="2.2" d="M12 5v14M5 12h14"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path ' + P + ' d="m14.5 5-7 7 7 7"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path ' + P + ' d="m14.5 7.5 2.9 2.9"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5"/><path ' + P + ' d="M6.5 6.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5"/></svg>',
    camera: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.2l1-1.8a1.4 1.4 0 0 1 1.2-.7h5.2a1.4 1.4 0 0 1 1.2.7l1 1.8H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-9Z"/><circle ' + P + ' cx="12" cy="12.8" r="3.4"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path ' + P + ' d="m14 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path ' + P + ' d="m10 6 6 6-6 6"/></svg>',
    quote: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M9.5 6.5C6.9 7.8 5.5 10 5.5 13v4.5h5V12H8c0-1.9.6-3.3 2.4-4.2ZM19 6.5c-2.6 1.3-4 3.5-4 6.5v4.5h5V12h-2.5c0-1.9.6-3.3 2.4-4.2Z"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M5 5.5A1.5 1.5 0 0 1 6.5 4h9L20 8.2v10.3A1.5 1.5 0 0 1 18.5 20h-12A1.5 1.5 0 0 1 5 18.5v-13Z"/><path ' + P + ' d="M8.5 4v5h6V4M8 20v-5.5h8V20"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M12 16V4.5m0 0L8 8.5m4-4 4 4"/><path ' + P + ' d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M12 4.5V16m0 0 4-4m-4 4-4-4"/><path ' + P + ' d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M12 3.5 5 6v6c0 4.2 2.9 7.4 7 8.5 4.1-1.1 7-4.3 7-8.5V6l-7-2.5Z"/><path ' + P + ' d="m9 12 2.2 2.2L15.5 10"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle ' + P + ' cx="12" cy="12" r="8.2"/><path ' + P + ' d="M12 11v5m0-8.2v.6"/></svg>',
    tag: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M4.5 11.4V5.6A1.1 1.1 0 0 1 5.6 4.5h5.8a1.1 1.1 0 0 1 .8.3l7 7a1.1 1.1 0 0 1 0 1.6l-5.8 5.8a1.1 1.1 0 0 1-1.6 0l-7-7a1.1 1.1 0 0 1-.3-.8Z"/><circle cx="8.4" cy="8.4" r="1.3" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path ' + P + ' stroke-width="2.2" d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M6 6l12 12M18 6 6 18"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M10.5 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1.2 1.2"/><path ' + P + ' d="M13.5 10.5a3.5 3.5 0 0 0-5 0L6 13a3.5 3.5 0 0 0 5 5l1.2-1.2"/></svg>',
    filter: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M4.5 6.5h15M7.5 12h9M10.5 17.5h3"/></svg>',
    sort: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M7 4.5v15m0 0-3-3m3 3 3-3M17 19.5v-15m0 0-3 3m3-3 3 3"/></svg>',
    install: '<svg viewBox="0 0 24 24"><path ' + P + ' d="M12 3v11m0 0 4-4m-4 4-4-4"/><path ' + P + ' d="M5 19.5h14"/></svg>'
  };

  function icon(name) { return ICON[name] || ''; }

  function star(on, size) {
    var s = size || 13;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" class="' + (on ? 'star-on' : 'star-off') + '">' +
      '<path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.3l6.1-.9L12 2.8Z"/></svg>';
  }
  function starsHTML(n, size) {
    var h = '';
    for (var i = 1; i <= 5; i++) h += star(i <= n, size);
    return '<span class="stars">' + h + '</span>';
  }

  /* ---------------- 触感反馈 ---------------- */
  function haptic(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms || 12); } catch (e) {} }
  }

  /* ---------------- Toast ---------------- */
  var toastEl, toastTimer;
  function toast(msg, dur) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.querySelector('.device-screen').appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, dur || 1800);
  }

  /* ---------------- 遮罩 ---------------- */
  var maskEl;
  function mask() {
    if (!maskEl) {
      maskEl = document.createElement('div');
      maskEl.className = 'mask';
      document.querySelector('.device-screen').appendChild(maskEl);
    }
    return maskEl;
  }

  /* ---------------- 确认弹窗 ---------------- */
  function confirmBox(opt) {
    return new Promise(function (resolve) {
      var m = mask();
      var el = document.createElement('div');
      el.className = 'dialog';
      el.innerHTML =
        '<h4>' + (opt.title || '提示') + '</h4>' +
        '<p>' + (opt.text || '') + '</p>' +
        '<div class="ops">' +
          '<button class="btn btn-ghost" data-no>' + (opt.cancel || '取消') + '</button>' +
          '<button class="btn ' + (opt.danger ? 'btn-danger' : 'btn-primary') + '" data-yes>' + (opt.ok || '确定') + '</button>' +
        '</div>';
      document.querySelector('.device-screen').appendChild(el);
      requestAnimationFrame(function () { m.classList.add('show'); el.classList.add('show'); });

      function done(v) {
        m.classList.remove('show'); el.classList.remove('show');
        setTimeout(function () { el.remove(); }, 300);
        resolve(v);
      }
      el.querySelector('[data-no]').onclick = function () { haptic(); done(false); };
      el.querySelector('[data-yes]').onclick = function () { haptic(18); done(true); };
      m.onclick = function () { done(false); };
    });
  }

  /* ---------------- 底部动作表 ---------------- */
  function actionSheet(title, items) {
    return new Promise(function (resolve) {
      var m = mask();
      var el = document.createElement('div');
      el.className = 'sheet';
      el.innerHTML =
        (title ? '<div class="sheet-title">' + title + '</div>' : '') +
        items.map(function (it, i) {
          return '<div class="sheet-item' + (it.danger ? ' danger' : '') + '" data-i="' + i + '">' +
            (it.icon ? icon(it.icon) : '') + '<span>' + it.text + '</span></div>';
        }).join('') +
        '<div class="sheet-cancel" data-cancel>取消</div>';
      document.querySelector('.device-screen').appendChild(el);
      requestAnimationFrame(function () { m.classList.add('show'); el.classList.add('show'); });

      function done(v) {
        m.classList.remove('show'); el.classList.remove('show');
        setTimeout(function () { el.remove(); }, 420);
        resolve(v);
      }
      el.querySelectorAll('.sheet-item').forEach(function (n) {
        n.onclick = function () { haptic(); done(items[+n.dataset.i].key); };
      });
      el.querySelector('[data-cancel]').onclick = function () { done(null); };
      m.onclick = function () { done(null); };
    });
  }

  /* ============================================================
     封面裁剪器（3:4，支持拖动 + 缩放）
     ============================================================ */
  function cropImage(src) {
    return new Promise(function (resolve) {
      var CW = 240, CH = 320;   // 裁剪框（3:4）
      var el = document.createElement('div');
      el.className = 'cropper';
      el.innerHTML =
        '<div class="cropper-hd"><span data-cancel>取消</span><b>调整封面</b><span data-ok style="color:#FFC0DD;font-weight:700">完成</span></div>' +
        '<div class="cropper-stage"><canvas width="' + CW * 2 + '" height="' + CH * 2 + '" style="width:' + CW + 'px;height:' + CH + 'px"></canvas></div>' +
        '<div class="cropper-ft">' +
          '<div class="zoom"><span>缩放</span><input type="range" min="100" max="300" value="100"><span data-z>100%</span></div>' +
          '<div class="tip">拖动图片调整位置 · 输出比例 3:4</div>' +
        '</div>';
      document.querySelector('.device-screen').appendChild(el);
      requestAnimationFrame(function () { el.classList.add('show'); });

      var cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
      var range = el.querySelector('input'), zTxt = el.querySelector('[data-z]');
      var img = new Image();
      var scale = 1, base = 1, ox = 0, oy = 0;

      function draw() {
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = '#141824'; ctx.fillRect(0, 0, cv.width, cv.height);
        var s = base * scale * 2;
        var w = img.width * s, h = img.height * s;
        var x = (cv.width - w) / 2 + ox * 2, y = (cv.height - h) / 2 + oy * 2;
        ctx.drawImage(img, x, y, w, h);
      }
      function clamp() {
        var s = base * scale;
        var w = img.width * s, h = img.height * s;
        var mx = Math.max(0, (w - CW) / 2), my = Math.max(0, (h - CH) / 2);
        ox = Math.max(-mx, Math.min(mx, ox));
        oy = Math.max(-my, Math.min(my, oy));
      }

      img.onload = function () {
        base = Math.max(CW / img.width, CH / img.height);
        draw();
      };
      img.src = src;

      var drag = false, sx = 0, sy = 0, bx = 0, by = 0;
      function down(e) {
        drag = true;
        var p = e.touches ? e.touches[0] : e;
        sx = p.clientX; sy = p.clientY; bx = ox; by = oy;
      }
      function move(e) {
        if (!drag) return;
        e.preventDefault();
        var p = e.touches ? e.touches[0] : e;
        ox = bx + (p.clientX - sx); oy = by + (p.clientY - sy);
        clamp(); draw();
      }
      function up() { drag = false; }
      cv.addEventListener('mousedown', down); cv.addEventListener('touchstart', down, { passive: true });
      window.addEventListener('mousemove', move); cv.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('mouseup', up); cv.addEventListener('touchend', up);

      range.oninput = function () {
        scale = +range.value / 100;
        zTxt.textContent = range.value + '%';
        clamp(); draw();
      };

      function close(val) {
        cv.removeEventListener('mousedown', down);
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        el.classList.remove('show');
        setTimeout(function () { el.remove(); }, 200);
        resolve(val);
      }
      el.querySelector('[data-cancel]').onclick = function () { close(null); };
      el.querySelector('[data-ok]').onclick = function () {
        var out = document.createElement('canvas');
        out.width = 360; out.height = 480;
        out.getContext('2d').drawImage(cv, 0, 0, 360, 480);
        haptic(18);
        close(out.toDataURL('image/jpeg', 0.84));
      };
    });
  }

  /* ---------------- 相册选图 ---------------- */
  function pickImage() {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = function () {
        var f = input.files && input.files[0];
        if (!f) return resolve(null);
        var fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.readAsDataURL(f);
      };
      input.click();
    });
  }

  global.UI = {
    icon: icon, star: star, starsHTML: starsHTML, haptic: haptic,
    toast: toast, confirm: confirmBox, actionSheet: actionSheet,
    cropImage: cropImage, pickImage: pickImage, mask: mask
  };
})(window);
