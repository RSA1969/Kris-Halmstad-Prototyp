/* Kris Halmstad – PWA Service Worker
 * Strategi:
 *  - App‑shell (index, manifest, SW) cache-first
 *  - Externa API (Krisinformation) network-first
 *  - Fallback till offline-sida för HTML vid nätavbrott
 */

/** 1) Versionshantering för cache **/
const VERSION = 'v3';                   // <- öka vid ändringar
const CACHE_SHELL = `kh-shell-${VERSION}`;
const CACHE_DYNAMIC = `kh-dyn-${VERSION}`;

/** 2) App‑shell (lägger till fler filer om behövs) **/
const APP_SHELL = [
  '/',                       // GitHub Pages hanterar path – funkar som root för projektet
  '/index.html',
  '/manifest.webmanifest',
  '/service-worker.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

/** 3) Hjälpare: avgör om request är mot HTML-dokument **/
const isHTML = (request) =>
  request.destination === 'document' ||
  (request.headers.get('accept') || '').includes('text/html');

/** 4) Install – lägg app‑shell i cache **/
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/** 5) Activate – städa bort gamla cache-versioner **/
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_SHELL && k !== CACHE_DYNAMIC)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/** 6) Fetch – olika strategier för olika typer av resurser **/
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // A) HTML-sidor: network-first + offline fallback till index.html
  if (isHTML(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_DYNAMIC).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/index.html')))
    );
    return;
  }

  // B) API till Krisinformation – network-first (så att data blir färsk)
  const isKrisApi = url.origin === 'https://api.krisinformation.se';
  if (isKrisApi) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_DYNAMIC).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)) // fallback till cache om offline
    );
    return;
  }

  // C) Övriga statiska resurser (CSS/JS/PNG etc.) – cache-first
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // Cacha bara OK-svar och GET
        if (req.method === 'GET' && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_DYNAMIC).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit); // om fetch misslyckas, ge ev. cache-träff
    })
  );
});

/** 7) Manuell uppdatering (valfritt)
 *  Klient kan skicka 'SKIP_WAITING' för att aktivera ny SW direkt.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
