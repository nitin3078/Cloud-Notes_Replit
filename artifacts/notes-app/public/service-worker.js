// Minimal service worker — its main job is satisfying the browser's
// installability requirements (Chrome/Android specifically requires a
// registered service worker with a fetch handler before it'll show the
// "Install app" prompt). It deliberately does NOT cache API responses —
// caching /api/* here would risk showing stale notes/planner data, which
// is worse than just requiring a connection. Full offline support (caching
// note content for real offline editing) is a bigger, separate feature.

const CACHE_NAME = 'folio-shell-v1';
// Only the static app shell — never API responses.
const SHELL_ASSETS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {
      // Non-fatal if a shell asset fails to pre-cache (e.g. offline install).
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept API calls — always go straight to the network so data
  // is always fresh.
  if (url.pathname.startsWith('/api/')) return;

  // For everything else (the static app shell), try the network first and
  // fall back to cache if offline — keeps the app updatable while still
  // being installable and opening something if there's no connection.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
