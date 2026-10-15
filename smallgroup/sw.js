/* 어린이소그룹 오프라인 지원.
   나들이 현장(동물원 안쪽 등)은 신호가 약할 수 있어서, 한 번 연 기기는
   통신 없이도 안내가 열려야 한다.

   전략: 네트워크 우선, 실패하면 캐시.
   - 온라인이면 항상 최신본을 받으므로 바뀐 공지가 바로 보인다.
   - Apps Script(참석 현황) 요청은 다른 출처라 건드리지 않는다.

   앱 뼈대(js/css)를 바꿔 배포할 때는 CACHE 이름을 올릴 것. */
var CACHE = 'sg-v3';
var SHELL = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/app.js',
  'js/api.js',
  'js/ui.js',
  'js/config.js',
  'events/index.json',
  'icons/icon-192.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })['catch'](function () {})
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); })['catch'](function () {});
      }
      return res;
    })['catch'](function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
