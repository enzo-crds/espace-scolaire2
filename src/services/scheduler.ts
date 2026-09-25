import type { AppData } from "@/types";
import { timeToMinutes } from "@/utils/date";

/** Nombre de minutes avant un cours où l'on prévient l'élève */
const COURSE_LEAD_MINUTES = 5;
/**
 * Fenêtre de rattrapage : un onglet en arrière-plan est "throttlé" par le navigateur
 * (1 tick/min voire moins), donc on accepte un événement dont l'heure est passée
 * depuis moins de N minutes au lieu de tester l'égalité exacte à la minute.
 */
const CATCH_UP_MINUTES = 3;

function alreadySent(key: string): boolean {
  try {
    if (localStorage.getItem(key)) return true;
    localStorage.setItem(key, String(Date.now()));
    return false;
  } catch {
    return false;
  }
}

/** Supprime les marqueurs d'envoi de plus de 2 jours (évite de remplir localStorage) */
function pruneOldMarkers() {
  try {
    const limit = Date.now() - 2 * 24 * 3600 * 1000;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("notif_sent_") && Number(localStorage.getItem(k)) < limit) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignoré */
  }
}

function notify(title: string, body: string, tag: string) {
  // Préfère le service worker (fonctionne écran verrouillé / mobile) ; sinon Notification classique
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(title, { body, tag }))
      .catch(() => new Notification(title, { body, tag }));
  } else {
    new Notification(title, { body, tag });
  }
}

export function checkAndTriggerReminders(data: AppData) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  // JS: 0 = dimanche ; l'app: 0 = lundi
  const dayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;

  pruneOldMarkers();

  // ---- 1. Cours de l'emploi du temps (prévenir 5 min avant) ----
  if (dayIdx <= 4) {
    const currentWeek = data.settings?.currentWeek || "A";
    for (const slot of data.schedule) {
      if (slot.day !== dayIdx) continue;
      if (slot.week !== "BOTH" && slot.week !== currentWeek) continue;

      const notifyAt = timeToMinutes(slot.start) - COURSE_LEAD_MINUTES;
      const late = nowMin - notifyAt;
      if (late < 0 || late > CATCH_UP_MINUTES) continue;
      if (alreadySent(`notif_sent_slot_${slot.id}_${dateKey}`)) continue;

      const subject = data.subjects.find((s) => s.id === slot.subjectId);
      const name = subject ? subject.name : slot.label || "Cours";
      const room = slot.room ? ` en ${slot.room}` : "";
      notify("Espace Scolaire", `Cours de ${name}${room} à ${slot.start}`, `next-course-${slot.id}`);
    }
  }

  // ---- 2. Alarmes / rappels personnalisés (Paramètres) ----
  for (const r of data.reminders ?? []) {
    if (!r.enabled) continue;
    // days vide = tous les jours ; sinon uniquement les jours cochés
    if (r.days.length > 0 && !r.days.includes(dayIdx)) continue;

    const late = nowMin - timeToMinutes(r.time);
    if (late < 0 || late > CATCH_UP_MINUTES) continue;
    if (alreadySent(`notif_sent_reminder_${r.id}_${dateKey}`)) continue;

    notify(r.type === "ALARM" ? "⏰ Alarme" : "🔔 Rappel", r.title, `reminder-${r.id}`);
  }

  // ---- 3. Devoirs / évaluations pour demain ----
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const tomorrowIso = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  // Une seule fois par jour (anti-doublon), dès 18:00 et jusqu'à 21:00
  if (nowMin >= 18 * 60 && nowMin <= 21 * 60) {
    for (const t of data.tasks ?? []) {
      if (t.completed || t.dueDate !== tomorrowIso) continue;
      if (alreadySent(`notif_sent_task_${t.id}_${dateKey}`)) continue;
      notify(
        t.kind === "eval" ? "🎯 Évaluation demain" : "📚 Devoir pour demain",
        t.title,
        `task-${t.id}`
      );
    }
  }
}
