const SHELL_CACHE = 'sabor-brasileiro-shell-v10';
const MENU_CACHE = 'sabor-brasileiro-menu-v10';
const IMAGE_CACHE = 'sabor-brasileiro-images-v10';
const SHELL_FILES = [
  '/',
  '/index.html',
  '/admin.html',
  '/offline.html',
  '/styles.css',
  '/menu.js',
  '/admin.js',
  '/pwa.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.ico',
  '/images/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)),
    self.skipWaiting(),
  ]));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => ![SHELL_CACHE, MENU_CACHE, IMAGE_CACHE].includes(key)).map((key) => caches.delete(key)),
    )),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname === '/api/menu') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) await (await caches.open(MENU_CACHE)).put(request, response.clone());
        return response;
      } catch {
        return (await caches.match(request)) ?? Response.json({ error: 'Cardápio indisponível sem conexão.' }, { status: 503 });
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return;

  if (url.pathname.startsWith('/media/') || url.pathname.startsWith('/images/')) {
    event.respondWith(caches.open(IMAGE_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) await (await caches.open(SHELL_CACHE)).put(request, response.clone());
        return response;
      } catch {
        const cached = await caches.match(request) ?? await caches.match(url.pathname === '/admin' ? '/admin.html' : '/');
        return cached ?? caches.match('/offline.html');
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await (await caches.open(SHELL_CACHE)).put(request, response.clone());
    return response;
  })());
});
