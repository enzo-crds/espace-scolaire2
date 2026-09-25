import type { AppData } from "@/types";
import { normalizeAppData } from "@/services/storage";

/** Génère et télécharge un export JSON de toutes les données de l'application. */
export function exportDataAsJson(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `espace-scolaire-sauvegarde-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Lit un fichier JSON exporté précédemment et retourne l'objet AppData correspondant. */
export function importDataFromJson(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.subjects)) {
          throw new Error("Format de fichier invalide");
        }
        resolve(normalizeAppData(parsed));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
