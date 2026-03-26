// Gagliarda Timer – Service Worker
// Cambia questa versione ogni volta che vuoi forzare un aggiornamento della cache
const CACHE_NAME = 'gagliarda-v1';

// File da mettere in cache al primo avvio
const PRECACHE_URLS = [
  '/index.html',
  '/manifest.json',
  '/sw.js'
];

// ── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())   // attiva subito il nuovo SW
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)   // rimuove le cache vecchie
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())    // prende controllo immediato di tutte le tab
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
// Strategia: Network First con fallback alla cache
// In questo modo se c'è connessione si scarica sempre la versione aggiornata;
// se si è offline si usa la versione in cache.
self.addEventListener('fetch', event => {
  // Ignora richieste non-GET e richieste a domini esterni
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Aggiorna la cache con la risposta fresca
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Nessuna connessione → usa la cache
        return caches.match(event.request)
          .then(cached => cached || new Response('Offline – risorsa non disponibile.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          }));
      })
  );
});

// ── AUTO-UPDATE CHECK ─────────────────────────────────────────────────────────
// Il SW controlla aggiornamenti ogni volta che si installa una nuova versione.
// Il codice JavaScript nell'index.html ascolta l'evento `updatefound` e mostra
// la barra di notifica all'utente.
