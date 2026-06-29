// Service Worker — macht die App auf Android als PWA installierbar.
// Network-first für Navigationen mit Offline-Fallback (keine aggressive Caching
// der dynamischen, login-geschützten Inhalte).

const CACHE = "gaba-v2";
const OFFLINE_URL = "/login";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(OFFLINE_URL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Nur Seitenaufrufe abfangen → Netzwerk, bei Offline der Login-Fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
  }
});
