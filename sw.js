// Junior Squads Attendance — Service Worker
// Always fetches index.html fresh so updates come through immediately

const CACHE = 'squads-v4';
const STATIC = [
  '/squads/manifest.json',
  '/squads/icon-192.svg',
  '/squads/icon-512.svg'
];

// Install: cache only static assets, not index.html
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
  self.skipWaiting();
});

// Activate: remove all old caches immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - index.html: ALWAYS fetch fresh from network, fall back to cache only if offline
// - everything else: cache first
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;

  const isHTML = e.request.url.includes('index.html') ||
                 e.request.url.endsWith('/squads/') ||
                 e.request.url.endsWith('/squads');

  if (isHTML) {
    // Network first for HTML — always get latest version
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // Cache the fresh copy
          const copy = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return response;
        })
        .catch(() => {
          // Offline fallback — serve cached version
          return caches.match(e.request);
        })
    );
  } else {
    // Cache first for static assets
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return response;
        });
      })
    );
  }
});
