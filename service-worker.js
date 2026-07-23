const CACHE_NAME = 'liderseguros-cache-v8';
const OLD_HERO_TEXT = 'Consulta tus servicios, conserva tus documentos y controla el mantenimiento de tu vehículo desde un solo lugar.';
const NEW_HERO_TEXT = 'La Asociación Cooperativa Líder de Seguros para Vehículos, R.L. es una entidad autorizada y regulada por la SUDEASEG en Venezuela para emitir pólizas de Responsabilidad Civil de Vehículos (RCV)';
const MANIFEST_LINK = '<link rel="manifest" href="manifest.webmanifest" />';
const APP_ICON_LINKS = `${MANIFEST_LINK}\n  <link rel="icon" type="image/png" sizes="192x192" href="assets/app-icon-192.png" />\n  <link rel="apple-touch-icon" sizes="192x192" href="assets/app-icon-192.png" />`;

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
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

async function applyBranding(response) {
  if (!response) return response;

  const html = await response.text();
  let brandedHtml = html.replace(OLD_HERO_TEXT, NEW_HERO_TEXT);

  if (!brandedHtml.includes('assets/app-icon-192.png')) {
    brandedHtml = brandedHtml.replace(MANIFEST_LINK, APP_ICON_LINKS);
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type', 'text/html; charset=utf-8');

  return new Response(brandedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

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
        .then(async (networkResponse) => {
          const brandedResponse = await applyBranding(networkResponse);
          const cacheCopy = brandedResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', cacheCopy));
          return brandedResponse;
        })
        .catch(async () => applyBranding(await caches.match('./index.html')))
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
