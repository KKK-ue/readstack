/* 阅栈 ReadStack · Service Worker（离线缓存 App Shell） */
const CACHE = 'readstack-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/theme.css',
  './assets/css/app.css',
  './assets/css/parts.css',
  './assets/css/report.css',
  './assets/js/store.js',
  './assets/js/charts.js',
  './assets/js/ui.js',
  './assets/js/views.js',
  './assets/js/forms.js',
  './assets/js/report.js',
  './assets/js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function () {
        // 离线兜底：导航请求回退到首页
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
