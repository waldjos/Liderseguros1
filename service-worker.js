const CACHE_NAME = 'liderseguros-cache-v9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './hero-modern.css',
  './script.js',
  './manifest.webmanifest',
  './assets/logo-header.png',
  './assets/logonuevo.png',
  './assets/app-icon-192.png',
  './assets/app-icon-512.png',
  './assets/imagenprincipal.png',
  './assets/descargarpoliza.png',
  './assets/renovar.png',
  './assets/misdoc.png',
  './assets/cambiodeaceite.png',
  './assets/responsabilidadcivilvehiculo.png',
  './assets/grua.png',
  './assets/gestion.png',
  './assets/promociones.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./', clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match('./').then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  if (!isSameOrigin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);
      return cachedResponse || networkFetch;
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((client) => 'focus' in client);
      if (existing) return existing.focus();
      return clients.openWindow('./');
    })
  );
});
