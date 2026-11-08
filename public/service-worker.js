const CACHE_NAME = 'hstyle-app-shell-v6';
const APP_SHELL = [
  '/admin.html',
  '/employee.html',
  '/style.css',
  '/admin.js',
  '/employee.js',
  '/pwa.js',
  '/admin-manifest.webmanifest',
  '/employee-manifest.webmanifest',
  '/app-icon.svg',
  '/app-icon-192.png',
  '/app-icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith('hstyle-app-shell-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    const page = url.pathname === '/admin' || url.pathname === '/admin/'
      ? '/admin.html'
      : url.pathname === '/employee' || url.pathname === '/employee/'
        ? '/employee.html'
        : null;
    if (!page) return;
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(page, copy));
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(page);
        if (cached) return cached;
        return Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
