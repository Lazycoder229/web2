// Minimal service worker for PWA installability.
// It never caches anything and never intercepts requests: every request goes
// straight to the network, so customers can't get stuck on stale pages.
// (Named pwa-worker.js on purpose: ServiceWorkerCleanup removes any "/sw.js".)
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))
self.addEventListener("fetch", () => {
  // Intentionally empty: the browser handles the request normally.
})
