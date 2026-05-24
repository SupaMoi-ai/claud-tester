// Sprint 1 service worker: install-only, no caching strategy yet.
// Required for PWA installability. Real caching/offline arrives in a later sprint.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op: defer to network. Caching strategy is out of scope for Sprint 1.
});
