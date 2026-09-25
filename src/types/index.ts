// ============================================================
// Types centraux de l'application "Espace Scolaire"
// ============================================================

export type ThemeMode = "light" | "dark" | "system";

export interface Settings {
  theme: ThemeMode;
  accentColor: string; // couleur d'accent (hex)
  averageMode: "simple" | "weighted"; // mode de calcul de la moyenne générale
  studentName: string;
  currentWeek: "A" | "B"; // semaine active pour l'emploi du temps
}

export interface Subject {
  id: string;
  name: string;
  color: string; // couleur hex utilisée un peu partout
  icon: string; // emoji
  coefficient: number; // coefficient utilisé pour la moyenne générale pondérée
  tabs?: string[]; // intercalaires personnalisés de la matière
  createdAt: number;
}

/** Type de contenu d'une page "Cours / Fiches / Exercices" */
export type DocKind = "course" | "fiche" | "exercise";

export interface DocumentItem {
  id: string;
  kind: DocKind;
  title: string;
  description?: string;
  content: string; // HTML de l'éditeur riche
  subjectId: string;
  tab?: string; // intercalaire dans lequel le document est rangé
  chapter?: string;
  tags: string[];
  favorite?: boolean;
  fileId?: string; // fichier principal (aperçu)
  fileIds?: string[]; // pièces jointes supplémentaires
  createdAt: number;
  updatedAt: number;
}

/** Catégorie d'un fichier stocké. "depot" = zone de dépôt, "attachment" = pièce jointe. */
export type FileCategory = DocKind | "task" | "depot" | "attachment" | "other";

export interface FileRecord {
  id: string;
  name: string;
  type: string; // mime type
  size: number;
  date: number;
  subjectId: string | null;
  category: FileCategory;
  driveFileId?: string; // identifiant du fichier sur Google Drive (si synchronisé)
}

export interface Grade {
  id: string;
  subjectId: string;
  title: string;
  value: number; // note obtenue (sur maxValue)
  maxValue: number; // barème, généralement 20
  coefficient: number;
  date: string; // ISO yyyy-mm-dd
  description?: string;
  createdAt: number;
}

export type Week = "A" | "B" | "BOTH";

export interface ScheduleSlot {
  id: string;
  week: Week;
  day: number; // 0 = Lundi ... 6 = Dimanche
  start: string; // "08:00"
  end: string; // "09:00"
  subjectId: string | null;
  label?: string; // libellé libre si pas de matière
  room?: string;
  teacher?: string;
  color?: string;
}

export type TaskKind = "devoir" | "eval";

/** Devoir ou évaluation planifié(e) */
export interface SchoolTask {
  id: string;
  kind: TaskKind;
  subjectId: string;
  title: string;
  dueDate: string; // ISO yyyy-mm-dd
  fileId?: string;
  completed: boolean;
  createdAt: number;
}

/** Alarme / rappel récurrent (jours : 0 = Lundi ... 6 = Dimanche) */
export interface Reminder {
  id: string;
  title: string;
  time: string; // "07:30"
  days: number[]; // vide = une seule fois
  enabled: boolean;
  type: "ALARM" | "REMINDER";
}

export interface AppData {
  subjects: Subject[];
  documents: DocumentItem[];
  grades: Grade[];
  schedule: ScheduleSlot[];
  files: FileRecord[];
  tasks: SchoolTask[];
  reminders: Reminder[];
  settings: Settings;
  version: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  accentColor: "#6366f1",
  averageMode: "weighted",
  studentName: "Élève",
  currentWeek: "A",
};

export const SUBJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#f59e0b", "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b",
];

export const SUBJECT_ICONS = [
  "📐", "📚", "🇬🇧", "🇪🇸", "🇩🇪", "🧪", "🔬", "💻", "🎨", "🎵",
  "🏃", "🌍", "📖", "🧮", "⚙️", "🔧", "📊", "🗣️", "✏️", "🧬",
];
