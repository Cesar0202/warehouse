
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.registration.unregister();
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Always fetch directly from network without caching
  e.respondWith(fetch(e.request));
});
