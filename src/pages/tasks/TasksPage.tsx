import { useState } from "react";
import { Plus, CheckCircle2, Circle, Trash2, Calendar, FileText } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import type { FileRecord, TaskKind } from "@/types";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal } from "@/components/common/Modal";
import { Field, inputClass, btnPrimary, btnSecondary } from "@/components/common/FormField";
import { FileDrop } from "@/components/files/FileDrop";
import { FilePreviewModal } from "@/components/files/FilePreviewModal";

export function TasksPage() {
  const { data, addFile, addTask, updateTask, deleteTask } = useData();
  const { notify, confirm } = useUI();
  const tasks = data.tasks;
  const [filter, setFilter] = useState<"all" | "devoir" | "eval">("all");
  const [openModal, setOpenModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);

  // Form state
  const [kind, setKind] = useState<TaskKind>("devoir");
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleCreate = async () => {
    if (!title.trim() || !subjectId || !dueDate) {
      notify("Remplis tous les champs obligatoires", "error");
      return;
    }

    let fileId: string | undefined;
    try {
      if (pendingFile) {
        const rec = await addFile(pendingFile, { subjectId, category: "task" });
        fileId = rec.id;
      }
    } catch (err) {
      console.error(err);
      notify("Impossible d'enregistrer le fichier joint", "error");
      return;
    }

    addTask({ kind, subjectId, title: title.trim(), dueDate, fileId });
    notify(`${kind === "eval" ? "Évaluation" : "Devoir"} planifié(e) !`);
    setOpenModal(false);
    setTitle("");
    setDueDate("");
    setPendingFile(null);
  };

  const handleDeleteTask = async (id: string, taskTitle: string) => {
    const ok = await confirm({
      title: `Supprimer « ${taskTitle} » ?`,
      danger: true,
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    deleteTask(id);
    notify("Élément supprimé");
  };

  // Tri par date d'échéance ; les éléments terminés passent en bas de liste
  const filteredTasks = tasks
    .filter((t) => (filter === "all" ? true : t.kind === filter))
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  // Une date "yyyy-mm-dd" doit être lue en local, pas en UTC (sinon -1 jour selon le fuseau)
  const formatDue = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("fr-FR");
  };
  const todayIso = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  })();

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Devoirs & Évaluations</h1>
          <p className="mt-1 text-sm text-slate-400">Gère tes échéances, contrôles et fichiers associés.</p>
        </div>
        <button className={btnPrimary} onClick={() => setOpenModal(true)}>
          <Plus className="h-4 w-4" /> Planifier
        </button>
      </div>

      <div className="flex gap-2">
        {(["all", "devoir", "eval"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              filter === f ? "bg-[var(--accent)] text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {f === "all" ? "Tous" : f === "devoir" ? "Devoirs" : "Évaluations 🎯"}
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="Aucun planning pour le moment"
          description="Ajoute un devoir ou une éval pour le 7 octobre par exemple."
          action={<button className={btnPrimary} onClick={() => setOpenModal(true)}><Plus className="h-4 w-4" /> Ajouter</button>}
        />
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const subject = data.subjects.find((s) => s.id === task.subjectId);
            const overdue = !task.completed && task.dueDate < todayIso;
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between rounded-2xl border p-4 transition bg-white dark:bg-slate-800 ${
                  task.completed ? "opacity-60 border-slate-100 dark:border-slate-800" : "border-slate-200 dark:border-slate-700 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button onClick={() => updateTask(task.id, { completed: !task.completed })} className="text-slate-400 hover:text-[var(--accent)]">
                    {task.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                        task.kind === "eval" ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
                      }`}>
                        {task.kind === "eval" ? "Éval" : "Devoir"}
                      </span>
                      {subject && (
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {subject.icon} {subject.name}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold mt-0.5 ${task.completed ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
                      {task.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? "text-rose-500" : "text-slate-500"}`}>
                      <Calendar className="h-3.5 w-3.5" /> {formatDue(task.dueDate)}{overdue ? " · en retard" : ""}
                    </span>
                    {task.fileId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const foundFile = data.files.find((f) => f.id === task.fileId);
                          if (foundFile) setPreviewFile(foundFile);
                        }}
                        className="text-[10px] text-[var(--accent)] hover:underline flex items-center justify-end gap-1 mt-0.5 ml-auto"
                      >
                        <FileText className="h-3 w-3" /> Voir le fichier
                      </button>
                    )}
                  </div>
                  <button onClick={() => void handleDeleteTask(task.id, task.title)} className="text-slate-300 hover:text-rose-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale d'ajout */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Planifier un devoir ou une éval" size="md">
        <div className="space-y-4">
          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind("devoir")}
                className={`rounded-xl py-2 text-xs font-semibold border ${kind === "devoir" ? "border-blue-500 bg-blue-500/10 text-blue-500" : "border-slate-200 dark:border-slate-700"}`}
              >
                Devoir / Exo
              </button>
              <button
                type="button"
                onClick={() => setKind("eval")}
                className={`rounded-xl py-2 text-xs font-semibold border ${kind === "eval" ? "border-rose-500 bg-rose-500/10 text-rose-500" : "border-slate-200 dark:border-slate-700"}`}
              >
                Évaluation (Contrôle)
              </button>
            </div>
          </Field>

          <Field label="Matière">
            <select className={inputClass} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="" disabled>Choisir une matière…</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Intitulé (ex: Réviser proportionnalité / Ex 4 p 112)">
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre..." />
          </Field>

          <Field label="Pour quand ? (Date)">
            <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>

          <Field label="Fichier associé (optionnel)">
            {!pendingFile ? (
              <FileDrop onFile={(f) => setPendingFile(f)} hint="PDF, sujet, cours..." />
            ) : (
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg dark:bg-slate-800">
                <span>{pendingFile.name}</span>
                <button onClick={() => setPendingFile(null)} className="text-rose-500">Retirer</button>
              </div>
            )}
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button className={btnSecondary} onClick={() => setOpenModal(false)}>Annuler</button>
            <button className={btnPrimary} onClick={handleCreate}>Enregistrer</button>
          </div>
        </div>
      </Modal>

      <FilePreviewModal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
}
