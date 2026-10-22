// Service worker minimal — satisfait le critère d'installabilité de Chrome/Android (manifest +
// service worker actif avec un gestionnaire fetch). Ne met rien en cache volontairement : les
// données de l'app (cotisations, paiements) doivent toujours venir du serveur, jamais d'un
// cache obsolète.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
