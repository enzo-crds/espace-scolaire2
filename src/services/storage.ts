import localforage from "localforage";
import type { AppData, DocKind, DocumentItem, FileRecord } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

// ------------------------------------------------------------
// Deux stores IndexedDB (via localforage) :
//  - "app-data"  : les données structurées (matières, notes, etc.)
//  - "app-files" : les fichiers binaires importés (blobs)
// localStorage n'est utilisé que pour un petit cache de préférences
// afin d'afficher le thème instantanément avant le chargement JS.
// ------------------------------------------------------------

localforage.config({
  name: "espace-scolaire",
  storeName: "app_store",
});

const dataStore = localforage.createInstance({
  name: "espace-scolaire",
  storeName: "app_data",
});

const fileStore = localforage.createInstance({
  name: "espace-scolaire",
  storeName: "app_files",
});

const DATA_KEY = "school-data-v1";

export const CURRENT_VERSION = 2;

export const EMPTY_DATA: AppData = {
  subjects: [],
  documents: [],
  grades: [],
  schedule: [],
  files: [],
  tasks: [],
  reminders: [],
  settings: DEFAULT_SETTINGS,
  version: CURRENT_VERSION,
};

/** Copie profonde de EMPTY_DATA (évite de partager les tableaux entre instances). */
export function createEmptyData(): AppData {
  return {
    ...EMPTY_DATA,
    subjects: [],
    documents: [],
    grades: [],
    schedule: [],
    files: [],
    tasks: [],
    reminders: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

const LEGACY_KIND: Record<string, DocKind> = {
  COURSE: "course",
  SHEET: "fiche",
  EXERCISE: "exercise",
};

/**
 * Normalise n'importe quelle donnée (stockage local, Google Drive, import JSON)
 * vers le schéma courant. Tolère les anciennes versions et les champs manquants
 * afin qu'une donnée partielle ne fasse jamais planter l'application.
 */
export function normalizeAppData(raw: unknown): AppData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  const documents = arr<Record<string, any>>(r.documents).map((d): DocumentItem => {
    const kind: DocKind =
      d.kind === "course" || d.kind === "fiche" || d.kind === "exercise"
        ? d.kind
        : LEGACY_KIND[d.type as string] ?? "course";
    return {
      id: String(d.id),
      kind,
      title: String(d.title ?? "Sans titre"),
      description: d.description ?? undefined,
      content: typeof d.content === "string" ? d.content : "",
      subjectId: String(d.subjectId ?? ""),
      tab: d.tab ?? undefined,
      chapter: d.chapter ?? undefined,
      tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
      favorite: !!d.favorite,
      fileId: d.fileId ?? undefined,
      fileIds: Array.isArray(d.fileIds) ? d.fileIds : undefined,
      createdAt: Number(d.createdAt) || Date.now(),
      updatedAt: Number(d.updatedAt) || Number(d.createdAt) || Date.now(),
    };
  });

  const savedSettings = (r.settings && typeof r.settings === "object" ? r.settings : {}) as Record<string, any>;
  const settings = { ...DEFAULT_SETTINGS, ...savedSettings };
  // Ancien champ "name" -> "studentName"
  if (savedSettings.name && !savedSettings.studentName) settings.studentName = String(savedSettings.name);
  delete (settings as Record<string, unknown>).name;

  return {
    subjects: arr(r.subjects),
    documents,
    grades: arr(r.grades),
    schedule: arr(r.schedule),
    files: arr(r.files),
    tasks: arr(r.tasks),
    reminders: arr(r.reminders),
    settings,
    version: CURRENT_VERSION,
  };
}

export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await dataStore.getItem<unknown>(DATA_KEY);
    if (!raw) return createEmptyData();
    return normalizeAppData(raw);
  } catch (err) {
    console.error("Erreur de chargement des données", err);
    return createEmptyData();
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await dataStore.setItem(DATA_KEY, data);
}

// ---- Gestion des fichiers binaires (blobs) ----

export async function storeFileBlob(id: string, blob: Blob): Promise<void> {
  await fileStore.setItem(id, blob);
}

export async function getFileBlob(id: string): Promise<Blob | null> {
  return (await fileStore.getItem<Blob>(id)) ?? null;
}

export async function deleteFileBlob(id: string): Promise<void> {
  await fileStore.removeItem(id);
}

export async function estimateStorageUsage(): Promise<{ usage: number; quota: number } | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate();
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
  }
  return null;
}

export function humanFileSize(bytes: number): string {
  if (bytes === 0) return "0 o";
  const units = ["o", "Ko", "Mo", "Go"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export type { FileRecord };
