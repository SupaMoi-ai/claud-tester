const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const TILES_CACHE = `tiles-${VERSION}`;
const API_CACHE = `api-${VERSION}`;

const SHELL_URLS = ["/", "/offline", "/data/rogaland.geojson"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.endsWith(VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    event.respondWith(cacheFirst(req, TILES_CACHE));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/api/parking")) {
    event.respondWith(networkFirst(req, API_CACHE));
    return;
  }

  if (url.origin === self.location.origin && url.pathname === "/") {
    event.respondWith(networkFirst(req, SHELL_CACHE, "/offline"));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/data/")) {
    event.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch (e) {
    return cached ?? new Response("offline", { status: 503 });
  }
}

async function networkFirst(req, cacheName, offlineUrl) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(req);
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (offlineUrl) {
      const fallback = await caches.match(offlineUrl);
      if (fallback) return fallback;
    }
    return new Response("offline", { status: 503 });
  }
}
