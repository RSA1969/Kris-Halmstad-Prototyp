
/* Kris Halmstad – PWA Service Worker (GitHub Pages-säker) */

const VERSION = 'v4';
const CACHE_SHELL = `kh-shell-${VERSION}`;
const CACHE_DYNAMIC = `kh-dyn-${VERSION}`;

// Använd RELATIVA sökvägar på GitHub Pages (projekt under /<repo>/)
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './service-worker.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/halmstad-logo.svg'
];

// Install: cacha shell, men låt inte EN 404 fälla hela install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then(async (cache) => {
      for (const url of APP_SHELL) {
        try { await cache.add(new Request(url, { cache: 'reload' })); }
        catch (e) { /* Ignorera enstaka misslyckanden */ }
      }
    })
  );
  self.skipWaiting();
});

// Activate: rensa gamla versioner
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_SHELL && k !== CACHE_DYNAMIC)
                      .map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Hjälpare: är det en HTML-begäran?
const isHTML = (req) =>
  req.destination === 'document' ||
  (req.headers.get('accept') || '').includes('text/html');

// Fetch: network-first för HTML/API, cache-first för statiska filer
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // HTML – network-first + fallback till cache/index.html
  if (isHTML(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_DYNAMIC).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Övrigt – cache-first
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (req.method === 'GET' && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_DYNAMIC).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
    })
  );
});

// Manuell uppdatering (valfritt)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
