/* 캐리비안베이 안내 페이지 오프라인 지원.
   워터파크 현장은 신호가 거의 없어서, 한 번 연 기기는 통신 없이도
   페이지가 열려야 한다.

   전략: 네트워크 우선, 실패하면 캐시.
   - 온라인일 때는 항상 최신본을 받으므로 오래된 내용이 남지 않는다.
   - 오프라인일 때만 캐시가 나선다.

   행사 후 정리: CACHE 이름을 바꿔 배포하면 옛 캐시가 지워진다.
   페이지에서 QR 섹션을 걷어낼 때 이 파일도 함께 정리할 것. */
var CACHE = 'cb26-2026-09-05-v1';
var PAGE = '20260905_CaribbeanBay.html';

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll([PAGE]);
    })['catch'](function () {})
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // 암호문 번들은 페이지가 이미 localStorage 에 담아 두므로 건드리지 않는다.
  if (req.url.indexOf('p.bin') > -1) return;

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) {
          c.put(req, copy);
        })['catch'](function () {});
      }
      return res;
    })['catch'](function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        // 페이지 요청이면 캐시된 안내 페이지로 대신 응답한다
        if (req.mode === 'navigate') return caches.match(PAGE);
        return Response.error();
      });
    })
  );
});
