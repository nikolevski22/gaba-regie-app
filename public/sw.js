// Minimaler Service Worker — macht die App auf Android als PWA installierbar,
// damit "Zum Startbildschirm hinzufügen" das GA-BA-Manifest-Icon verwendet.
// Bewusst ohne Caching, um die dynamische, login-geschützte App nicht zu stören.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Vorhandener fetch-Handler ist Voraussetzung für die PWA-Installierbarkeit.
// Wir greifen nicht ein → normales Netzwerkverhalten bleibt erhalten.
self.addEventListener("fetch", () => {});
