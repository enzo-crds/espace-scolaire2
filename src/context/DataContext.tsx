import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  DocumentItem,
  FileRecord,
  Grade,
  ScheduleSlot,
  SchoolTask,
  Reminder,
  Settings,
  Subject,
} from "@/types";
import {
  createEmptyData,
  loadAppData,
  normalizeAppData,
  saveAppData,
  deleteFileBlob,
  getFileBlob,
  storeFileBlob,
} from "@/services/storage";
import { generateId } from "@/services/id";
import {
  downloadFromGoogleDrive,
  initGoogleIdentity,
  isGoogleConnected,
  uploadToGoogleDrive,
  getGoogleUserFirstName,
  uploadFileToDrive,
  downloadFileFromDrive,
  deleteFileFromDrive,
} from "@/services/gdrive";
import { checkAndTriggerReminders } from "@/services/scheduler";

interface DataContextValue {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  saveAppData: (data: AppData) => Promise<void>;
  loading: boolean;
  lastSaved: number | null;
  isDriveSyncing: boolean;
  addSubject: (subject: Omit<Subject, "id" | "createdAt">) => Subject;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  addDocument: (doc: Omit<DocumentItem, "id" | "createdAt" | "updatedAt">) => DocumentItem;
  updateDocument: (id: string, patch: Partial<DocumentItem>) => void;
  deleteDocument: (id: string) => void;
  attachFileToDocument: (documentId: string, fileId: string) => void;
  detachFileFromDocument: (documentId: string, fileId: string) => void;
  addGrade: (grade: Omit<Grade, "id" | "createdAt">) => Grade;
  updateGrade: (id: string, patch: Partial<Grade>) => void;
  deleteGrade: (id: string) => void;
  addSlot: (slot: Omit<ScheduleSlot, "id">) => ScheduleSlot;
  updateSlot: (id: string, patch: Partial<ScheduleSlot>) => void;
  deleteSlot: (id: string) => void;
  copyWeekSchedule: (sourceWeek: "A" | "B", targetWeek: "A" | "B") => void;
  addTask: (task: Omit<SchoolTask, "id" | "createdAt" | "completed">) => SchoolTask;
  updateTask: (id: string, patch: Partial<SchoolTask>) => void;
  deleteTask: (id: string) => void;
  setReminders: (reminders: Reminder[]) => void;
  addFile: (file: File, meta: { subjectId: string | null; category: FileRecord["category"] }) => Promise<FileRecord>;
  deleteFile: (id: string) => Promise<void>;
  readFile: (id: string) => Promise<Blob | null>;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAllData: (data: AppData) => Promise<void>;
  resetAllData: () => Promise<void>;
  syncWithDrive: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

/** Date de dernière modification locale, servie à arbitrer les conflits avec Drive. */
const LOCAL_MODIFIED_KEY = "school-data-modified-at";

function getLocalModifiedAt(): number {
  return Number(localStorage.getItem(LOCAL_MODIFIED_KEY) || 0);
}
function setLocalModifiedAt(ts: number) {
  localStorage.setItem(LOCAL_MODIFIED_KEY, String(ts));
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => createEmptyData());
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);
  const syncInFlight = useRef(false);

  // Les intervalles et callbacks asynchrones lisent toujours la donnée la plus fraîche via ce ref
  const dataRef = useRef<AppData>(data);
  dataRef.current = data;

  /**
   * Synchronisation Drive <-> local.
   * La version la plus récente (modifiedAt) l'emporte, au lieu d'écraser
   * systématiquement les données locales par celles de Drive.
   */
  const syncWithDrive = useCallback(async () => {
    if (!isGoogleConnected() || syncInFlight.current) return;
    syncInFlight.current = true;
    setIsDriveSyncing(true);
    try {
      const remoteRaw = (await downloadFromGoogleDrive()) as (Record<string, unknown> & { modifiedAt?: number }) | null;
      if (remoteRaw) {
        const remoteModified = Number(remoteRaw.modifiedAt) || 0;
        const localModified = getLocalModifiedAt();
        if (remoteModified > localModified) {
          const merged = normalizeAppData(remoteRaw);
          setLocalModifiedAt(remoteModified);
          isFirstLoad.current = true; // évite de ré-uploader immédiatement ce qu'on vient de télécharger
          setData(merged);
          await saveAppData(merged);
        } else if (localModified > remoteModified) {
          await uploadToGoogleDrive({ ...dataRef.current, modifiedAt: localModified } as AppData);
        }
      } else {
        await uploadToGoogleDrive({ ...dataRef.current, modifiedAt: getLocalModifiedAt() || Date.now() } as AppData);
      }
    } catch (err) {
      console.error("Erreur de synchronisation Drive", err);
    } finally {
      syncInFlight.current = false;
      setIsDriveSyncing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const localData = await loadAppData();
      if (cancelled) return;
      setData(localData);
      setLoading(false);

      initGoogleIdentity(() => {
        void syncWithDrive();
      });

      if (isGoogleConnected()) {
        // Le prénom Google n'écrase le nom affiché que si l'utilisateur n'en a pas choisi un
        const googleFirstName = await getGoogleUserFirstName();
        if (googleFirstName && !cancelled) {
          setData((prev) =>
            prev.settings.studentName === "Élève"
              ? { ...prev, settings: { ...prev.settings, studentName: googleFirstName } }
              : prev
          );
        }
        void syncWithDrive();
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [syncWithDrive]);

  // Vérification automatique des alarmes & au retour sur l'app
  useEffect(() => {
    if (loading) return;

    checkAndTriggerReminders(dataRef.current);
    // Une vérification par 20 s suffit (l'ancienne boucle de 5 s était inutilement coûteuse)
    const reminderInterval = setInterval(() => checkAndTriggerReminders(dataRef.current), 20_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkAndTriggerReminders(dataRef.current);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(reminderInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loading]);

  // Synchronisation périodique toutes les 30 s
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      if (isGoogleConnected()) void syncWithDrive();
    }, 30_000);
    return () => clearInterval(interval);
  }, [loading, syncWithDrive]);

  // Sauvegarde locale (debounce) + envoi vers Drive
  useEffect(() => {
    if (loading) return;
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const modifiedAt = Date.now();
      setLocalModifiedAt(modifiedAt);
      try {
        await saveAppData(data);
        setLastSaved(modifiedAt);
      } catch (err) {
        console.error("Erreur de sauvegarde locale", err);
      }
      if (isGoogleConnected() && !syncInFlight.current) {
        setIsDriveSyncing(true);
        try {
          await uploadToGoogleDrive({ ...data, modifiedAt } as AppData);
        } finally {
          setIsDriveSyncing(false);
        }
      }
    }, 300);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [data, loading]);

  const addSubject: DataContextValue["addSubject"] = (subject) => {
    const newSubject: Subject = { ...subject, id: generateId(), createdAt: Date.now() };
    setData((prev) => ({ ...prev, subjects: [...prev.subjects, newSubject] }));
    return newSubject;
  };

  const updateSubject: DataContextValue["updateSubject"] = (id, patch) => {
    setData((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const deleteSubject: DataContextValue["deleteSubject"] = (id) => {
    // Effets de bord (suppression des blobs) en dehors de l'updater : il peut être appelé 2 fois en StrictMode
    const cur = dataRef.current;
    const orphanFileIds = new Set<string>();
    cur.documents
      .filter((d) => d.subjectId === id)
      .forEach((d) => {
        if (d.fileId) orphanFileIds.add(d.fileId);
        d.fileIds?.forEach((f) => orphanFileIds.add(f));
      });
    cur.tasks.filter((t) => t.subjectId === id && t.fileId).forEach((t) => orphanFileIds.add(t.fileId!));
    orphanFileIds.forEach((fid) => void deleteFile(fid));

    setData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== id),
      documents: prev.documents.filter((d) => d.subjectId !== id),
      grades: prev.grades.filter((g) => g.subjectId !== id),
      tasks: prev.tasks.filter((t) => t.subjectId !== id),
      schedule: prev.schedule.map((sl) => (sl.subjectId === id ? { ...sl, subjectId: null } : sl)),
    }));
  };

  const addDocument: DataContextValue["addDocument"] = (doc) => {
    const now = Date.now();
    const newDoc: DocumentItem = { ...doc, id: generateId(), createdAt: now, updatedAt: now };
    setData((prev) => ({ ...prev, documents: [...prev.documents, newDoc] }));
    return newDoc;
  };

  const updateDocument: DataContextValue["updateDocument"] = (id, patch) => {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d
      ),
    }));
  };

  const deleteDocument: DataContextValue["deleteDocument"] = (id) => {
    const doc = dataRef.current.documents.find((d) => d.id === id);
    if (doc) {
      const ids = new Set<string>(doc.fileIds ?? []);
      if (doc.fileId) ids.add(doc.fileId);
      ids.forEach((fid) => void deleteFile(fid));
    }
    setData((prev) => ({ ...prev, documents: prev.documents.filter((d) => d.id !== id) }));
  };

  const attachFileToDocument: DataContextValue["attachFileToDocument"] = (documentId, fileId) => {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.map((doc) => {
        if (doc.id !== documentId) return doc;
        const currentFiles = doc.fileIds || [];
        if (currentFiles.includes(fileId)) return doc;
        return {
          ...doc,
          fileIds: [...currentFiles, fileId],
          updatedAt: Date.now(),
        };
      }),
    }));
  };

  const detachFileFromDocument: DataContextValue["detachFileFromDocument"] = (documentId, fileId) => {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.map((doc) => {
        if (doc.id !== documentId) return doc;
        return {
          ...doc,
          fileIds: (doc.fileIds || []).filter((id) => id !== fileId),
          updatedAt: Date.now(),
        };
      }),
    }));
  };

  const addGrade: DataContextValue["addGrade"] = (grade) => {
    const newGrade: Grade = { ...grade, id: generateId(), createdAt: Date.now() };
    setData((prev) => ({ ...prev, grades: [...prev.grades, newGrade] }));
    return newGrade;
  };

  const updateGrade: DataContextValue["updateGrade"] = (id, patch) => {
    setData((prev) => ({
      ...prev,
      grades: prev.grades.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  };

  const deleteGrade: DataContextValue["deleteGrade"] = (id) => {
    setData((prev) => ({ ...prev, grades: prev.grades.filter((g) => g.id !== id) }));
  };

  const addSlot: DataContextValue["addSlot"] = (slot) => {
    const newSlot: ScheduleSlot = { ...slot, id: generateId() };
    setData((prev) => ({ ...prev, schedule: [...prev.schedule, newSlot] }));
    return newSlot;
  };

  const updateSlot: DataContextValue["updateSlot"] = (id, patch) => {
    setData((prev) => ({
      ...prev,
      schedule: prev.schedule.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const deleteSlot: DataContextValue["deleteSlot"] = (id) => {
    setData((prev) => ({ ...prev, schedule: prev.schedule.filter((s) => s.id !== id) }));
  };

  const copyWeekSchedule: DataContextValue["copyWeekSchedule"] = (sourceWeek, targetWeek) => {
    setData((prev) => {
      const filteredSchedule = prev.schedule.filter((s) => s.week !== targetWeek);
      const sourceSlots = prev.schedule.filter((s) => s.week === sourceWeek);
      const duplicated = sourceSlots.map((s) => ({
        ...s,
        id: generateId(),
        week: targetWeek,
      }));
      return {
        ...prev,
        schedule: [...filteredSchedule, ...duplicated],
      };
    });
  };

  const addTask: DataContextValue["addTask"] = (task) => {
    const newTask: SchoolTask = { ...task, id: generateId(), createdAt: Date.now(), completed: false };
    setData((prev) => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
    return newTask;
  };

  const updateTask: DataContextValue["updateTask"] = (id, patch) => {
    setData((prev) => ({ ...prev, tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  };

  const deleteTask: DataContextValue["deleteTask"] = (id) => {
    const task = dataRef.current.tasks.find((t) => t.id === id);
    if (task?.fileId) void deleteFile(task.fileId);
    setData((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
  };

  const setReminders: DataContextValue["setReminders"] = (reminders) => {
    setData((prev) => ({ ...prev, reminders }));
  };

  const addFile: DataContextValue["addFile"] = async (file, meta) => {
    const id = generateId();
    // 1. Sauvegarde locale (marche toujours)
    await storeFileBlob(id, file); 

    let driveFileId: string | undefined;
    
    // 2. Tentative d'envoi vers Google Drive (sécurisée)
    if (isGoogleConnected()) {
      try {
        const uploadedId = await uploadFileToDrive(file, file.name);
        if (uploadedId) driveFileId = uploadedId;
      } catch (error) {
        console.error("Erreur silencieuse Google Drive ignorée :", error);
        // On ne fait rien : on laisse l'application continuer localement !
      }
    }

    const record: FileRecord = {
      id,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      date: Date.now(),
      subjectId: meta.subjectId,
      category: meta.category,
      driveFileId,
    };

    setData((prev) => ({ ...prev, files: [...prev.files, record] }));
    return record;
  };

  const deleteFile: DataContextValue["deleteFile"] = async (id) => {
    const record = dataRef.current.files.find((f) => f.id === id);
    if (record?.driveFileId) {
      await deleteFileFromDrive(record.driveFileId);
    }
    await deleteFileBlob(id);
    setData((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.id !== id),
      // Nettoie toute référence à ce fichier pour ne jamais laisser de lien mort
      documents: prev.documents.map((d) => ({
        ...d,
        fileId: d.fileId === id ? undefined : d.fileId,
        fileIds: d.fileIds?.filter((f) => f !== id),
      })),
      tasks: prev.tasks.map((t) => (t.fileId === id ? { ...t, fileId: undefined } : t)),
    }));
  };

  const readFile: DataContextValue["readFile"] = async (id) => {
    // Le blob local est prioritaire : instantané et disponible hors-ligne.
    const local = await getFileBlob(id);
    if (local) return local;
    const record = dataRef.current.files.find((f) => f.id === id);
    if (record?.driveFileId && isGoogleConnected()) {
      return downloadFileFromDrive(record.driveFileId);
    }
    return null;
  };

  const updateSettings: DataContextValue["updateSettings"] = (patch) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  };

  const replaceAllData: DataContextValue["replaceAllData"] = async (newData) => {
    const normalized = normalizeAppData(newData);
    const modifiedAt = Date.now();
    setLocalModifiedAt(modifiedAt);
    setData(normalized);
    await saveAppData(normalized);
    if (isGoogleConnected()) {
      await uploadToGoogleDrive({ ...normalized, modifiedAt } as AppData);
    }
    setLastSaved(modifiedAt);
  };

  const resetAllData: DataContextValue["resetAllData"] = async () => {
    // Supprime aussi les fichiers binaires : sinon ils restent en IndexedDB à jamais
    const files = dataRef.current.files;
    await Promise.all(
      files.map(async (f) => {
        if (f.driveFileId) await deleteFileFromDrive(f.driveFileId);
        await deleteFileBlob(f.id);
      })
    );
    const empty = createEmptyData();
    const modifiedAt = Date.now();
    setLocalModifiedAt(modifiedAt);
    setData(empty);
    await saveAppData(empty);
    if (isGoogleConnected()) {
      await uploadToGoogleDrive({ ...empty, modifiedAt } as AppData);
    }
    setLastSaved(modifiedAt);
  };

  return (
    <DataContext.Provider
      value={{
        data,
        setData,
        saveAppData,
        loading,
        lastSaved,
        isDriveSyncing,
        addSubject,
        updateSubject,
        deleteSubject,
        addDocument,
        updateDocument,
        deleteDocument,
        attachFileToDocument,
        detachFileFromDocument,
        addGrade,
        updateGrade,
        deleteGrade,
        addSlot,
        updateSlot,
        deleteSlot,
        copyWeekSchedule,
        addTask,
        updateTask,
        deleteTask,
        setReminders,
        addFile,
        deleteFile,
        readFile,
        updateSettings,
        replaceAllData,
        resetAllData,
        syncWithDrive,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData doit être utilisé dans DataProvider");
  return ctx;
}
