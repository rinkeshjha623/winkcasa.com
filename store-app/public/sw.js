// WinkCasa service worker: pages and data always come from the network (prices, stock and accounts stay live);
// images, CSS and JS are cached for speed; a friendly offline page shows when there is no connection.
const V = 'wc-v1', STATIC = V + '-static';
const OFFLINE = '/offline.html';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE, '/site.css', '/page.css', '/icons/icon-192.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => !n.startsWith(V)).map((n) => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (/^\/(api|admin|account)/.test(u.pathname)) return;
  if (r.mode === 'navigate') { e.respondWith(fetch(r).catch(() => caches.match(OFFLINE))); return; }
  if (/\.(css|js|png|jpg|jpeg|webp|svg|woff2?)$/.test(u.pathname) || u.pathname.startsWith('/img/')) {
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(STATIC).then((c) => c.put(r, cp)); } return res; }).catch(() => caches.match(r)));
  }
});
