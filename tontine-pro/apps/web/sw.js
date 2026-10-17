// Service worker minimal : cache l'app shell pour un chargement instantané et un usage hors-ligne de base.
// Les appels API ne sont jamais mis en cache (données financières, toujours à jour).
const CACHE = "tontine-shell-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./src/main.js",
  "./src/styles/tokens.css",
  "./src/styles/components.css",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.includes("/v1/")) return; // jamais l'API
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match("./index.html"))),
  );
});
