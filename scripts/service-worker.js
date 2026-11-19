// The build prepends the release hash and the complete list of public files.
const prefix = 'deadwater:' + self.registration.scope + ':';
const cacheName = prefix + release;
const home = self.registration.scope;
const urls = new Set(files.map(path => new URL(path, home).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    // addAll commits atomically. A failed download leaves the previous release in control.
    await cache.addAll([...urls].map(url => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.search = '';
  const key = request.mode === 'navigate' && url.href === new URL('index.html', home).href
    ? home : url.href;
  if (!urls.has(key)) return;
  event.respondWith((async () => {
    const cached = await caches.match(key, { cacheName });
    if (cached) return cached;
    console.warn('Offline asset missing', { fallback: true, path: url.pathname, using: 'network' });
    for (const client of await self.clients.matchAll({ type: 'window' })) {
      client.postMessage({ type: 'offline-incomplete' });
    }
    return fetch(request);
  })());
});
