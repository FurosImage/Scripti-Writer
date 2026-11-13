// Scripti service worker: lets the installed app open and work without a connection.
// Pages are fetched fresh when online and served from the cache when offline. Built files
// (which have content hashes in their names) and fonts are served from the cache first.
const CACHE = 'scripti-v3';

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      await c.addAll(['./', './manifest.webmanifest', './icons/icon-192.png', './icons/apple-touch-icon.png']);
      // Also cache the scripts and styles the current page needs.
      try {
        const html = await (await fetch('./', { cache: 'no-store' })).text();
        const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => m[1]);
        await c.addAll(assets);
      } catch (err) {}
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(async () => (await caches.match('./')) || Response.error()),
    );
    return;
  }
  const font = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (u.origin !== location.origin && !font) return;
  e.respondWith(
    (async () => {
      const hit = await caches.match(r);
      const net = fetch(r)
        .then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(r, copy));
          }
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || net;
    })(),
  );
});
