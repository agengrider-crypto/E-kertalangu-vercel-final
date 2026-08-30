// E-Kertalangu Service Worker — minimal cache strategy
const CACHE = 'ektl-v1';
const CORE = ['/', '/manifest.json'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    // Never cache API calls
    if (url.pathname.startsWith('/api/')) return;
    // Network-first for HTML, cache-first for others
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).catch(() => caches.match('/') || caches.match(e.request))
        );
        return;
    }
    e.respondWith(
        caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
            const clone = res.clone();
            if (res.ok && res.type === 'basic') caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
            return res;
        }).catch(() => cached))
    );
});
