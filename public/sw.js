// Service worker minimal : sert uniquement à afficher des notifications
// et à ramener l'utilisateur dans l'application au clic.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Notification "push" éventuelle (si un serveur push est branché un jour).
// Les chemins sont relatifs au scope du SW pour fonctionner sur GitHub Pages
// (l'app est servie sous /<repo>/ et non à la racine du domaine).
self.addEventListener("push", (event) => {
  let payload = { title: "Rappel Scolaire", body: "Un événement approche !" };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    /* payload invalide : on garde le message par défaut */
  }
  const scope = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: scope + "icon.svg",
      badge: scope + "icon.svg",
      vibrate: [200, 100, 200],
      tag: "school-notification",
      renotify: true,
    })
  );
});

// Clic sur la notification -> ouvre / focus l'application
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) return clientList[0].focus();
        return self.clients.openWindow(self.registration.scope);
      })
  );
});
