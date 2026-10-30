/*
 * Day One guest app offline support (registered by the guest app and the invitation, scope /events/).
 * - Guest pages: always the latest from the network; the last copy this phone saw when there is no signal.
 * - Built files (/_next/static, icons, fonts) never change under the same name: cache first.
 * - Everything else (Supabase, /api) goes straight to the network; the app keeps its own copies of the pass.
 */
const VERSION = 'd1-guest-v1';
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const MAX_STATIC = 250;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('d1-guest-') && !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/** Keeps the built-file cache from growing across deploys. */
async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_STATIC) await Promise.all(keys.slice(0, keys.length - MAX_STATIC).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/') || /\.(png|ico|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) {
          await cache.put(req, res.clone());
          trim(cache);
        }
        return res;
      })(),
    );
    return;
  }

  if (req.mode === 'navigate' && url.pathname.startsWith('/events/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        try {
          const res = await fetch(req);
          // Saved by path, so ?tab= and ?t= links open the same copy offline.
          if (res.ok) await cache.put(url.pathname, res.clone());
          return res;
        } catch {
          return (await cache.match(url.pathname)) || Response.error();
        }
      })(),
    );
  }
});
