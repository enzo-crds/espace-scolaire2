import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { useUI } from "@/context/UIContext";
import { sendNativeNotification, requestNotificationPermission } from "@/services/notifications";

export function NotificationToggle() {
  const [permission, setPermission] = useState<string>("default");
  const { notify } = useUI();

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
  }, []);

  const handleEnable = async () => {
    if (!("Notification" in window)) return;
    const result = await requestNotificationPermission();
    setPermission(result ? "granted" : Notification.permission);
    if (result) {
      sendNativeNotification("Notifications activées ! 🔔", "Le test système est prêt.");
    }
  };

  const handleTestNotification = async () => {
    if (permission !== "granted") {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setPermission(Notification.permission);
        notify("Notifications refusées : autorise-les dans les réglages du navigateur.", "warning");
        return;
      }
      setPermission("granted");
    }
    sendNativeNotification(
      "Test de notification ⏰",
      "Si tu vois ce message, les notifications fonctionnent parfaitement sur ton téléphone !"
    );
  };

  if (permission === "unsupported") {
    return (
      <p className="text-xs text-slate-400">
        Notifications non supportées par ce navigateur. Sur iPhone, ajoute d'abord l'application à l'écran d'accueil (iOS 16.4 minimum).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">
          Statut :{" "}
          <strong className={permission === "granted" ? "text-emerald-500" : permission === "denied" ? "text-rose-500" : "text-amber-500"}>
            {permission === "granted" ? "activées" : permission === "denied" ? "bloquées" : "non autorisées"}
          </strong>
        </span>
        {permission !== "granted" && permission !== "denied" && (
          <button
            type="button"
            onClick={handleEnable}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white"
          >
            Autoriser
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleTestNotification}
        className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-700 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 transition active:scale-95"
      >
        <Send className="h-4 w-4 text-[var(--accent)]" /> Tester la notification maintenant
      </button>
    </div>
  );
}
