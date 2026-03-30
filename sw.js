// Gagliarda Timer – Service Worker v3
const CACHE = 'gagliarda-v3';

// All files to pre-cache
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './favicon-16.png',
];

// ── INSTALL: pre-cache everything ────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: remove old caches, claim clients immediately ───────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: Cache-first for our own assets, network-first for everything else ─
self.addEventListener('fetch', e => {
  // Only handle same-origin GET requests
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) return; // let cross-origin requests pass through

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Serve from cache instantly, then update cache in background
      const fetchPromise = fetch(e.request)
        .then(networkRes => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return networkRes;
        })
        .catch(() => null);

      // Return cached if available (fast), otherwise wait for network
      return cached || fetchPromise;
    })
  );
});
