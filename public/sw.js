const CACHE = 'expense-tracker-v1';
const STATIC = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), { status: 503 })));
    return;
  }
  e.respondWith(
    fetch(e.request).then((r) => { const c = caches.open(CACHE); c.then((c) => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request))
  );
});
