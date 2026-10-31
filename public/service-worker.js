const SHELL_CACHE = 'movo-shell-v14';
const MENU_CACHE = 'movo-menu-v14';
const IMAGE_CACHE = 'movo-images-v14';
const CACHE_NAMES = [SHELL_CACHE, MENU_CACHE, IMAGE_CACHE];
const SHELL_FILES = [
  '/',
  '/index.html',
  '/admin.html',
  '/offline.html',
  '/styles.css',
  '/mobile-first.css?v=20261030-7',
  '/admin-movo.css?v=20261030-6',
  '/store.js?v=20261030-8',
  '/admin.js?v=20261030-6',
  '/pwa.js?v=20261030-5',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/images/hero-set.png',
  '/images/products/top.webp',
  '/images/products/tee.webp',
  '/images/products/tank.webp',
  '/images/products/shorts.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)),
    self.skipWaiting(),
  ]));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => !CACHE_NAMES.includes(key)).map((key) => caches.delete(key)))),
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
        return (await caches.match(request)) ?? Response.json({ error: 'Catálogo indisponível sem conexão.' }, { status: 503 });
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
        const path = url.pathname.replace(/\/$/, '') || '/';
        const fallback = path === '/admin' ? '/admin.html' : '/';
        return (await caches.match(request)) ?? (await caches.match(fallback)) ?? caches.match('/offline.html');
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) await (await caches.open(SHELL_CACHE)).put(request, response.clone());
      return response;
    } catch {
      return (await caches.match(request)) ?? Response.error();
    }
  })());
});
