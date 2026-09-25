export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function timeToMinutes(time: string): number {
  const [h, m] = (time || "").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  // On arrondit AVANT de découper en heures/minutes : sinon 8h59,6 donnait "08:60"
  const total = Math.round(minutes);
  const h = Math.floor(total / 60).toString().padStart(2, "0");
  const m = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Retourne l'index du jour actuel selon la convention 0 = Lundi ... 6 = Dimanche */
export function currentDayIndex(): number {
  const jsDay = new Date().getDay(); // 0 = dimanche
  return jsDay === 0 ? 6 : jsDay - 1;
}
