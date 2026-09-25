// Icône servie depuis /public (le favicon.ico référencé auparavant n'existait pas)
const iconUrl = () => `${import.meta.env.BASE_URL}icon.svg`;

export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    await navigator.serviceWorker.register(swUrl);
  } catch (err) {
    console.error("Échec enregistrement Service Worker :", err);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  let perm = Notification.permission;
  if (perm === "default") {
    perm = await Notification.requestPermission();
  }
  return perm === "granted";
}

export async function sendNativeNotification(title: string, body: string): Promise<void> {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    if ("serviceWorker" in navigator) {
      // .ready ne se résout jamais si aucun SW n'est enregistré : on limite l'attente
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: iconUrl(),
          badge: iconUrl(),
          tag: "school-test",
        });
        return;
      }
    }
    new Notification(title, { body, icon: iconUrl() });
  } catch (err) {
    console.error("Erreur lors de l'envoi de la notification :", err);
  }
}
