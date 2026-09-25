import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, Trash2, Check, Tag as TagIcon, Paperclip, FileText as FileTextIcon } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import type { DocKind } from "@/types";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { FilePreview } from "@/components/files/FilePreview";
import { inputClass } from "@/components/common/FormField";
import { isDocxFile } from "@/services/docx";
import { DocumentAttachments } from "@/components/documents/DocumentAttachments";

export function DocumentEditorPage({ kind }: { kind: DocKind }) {
  const { id } = useParams();
  const { data, updateDocument, deleteDocument, addFile, deleteFile } = useData();
  const { confirm, notify } = useUI();
  const navigate = useNavigate();
  const basePath = kind === "course" ? "/cours" : kind === "exercise" ? "/exercices" : "/fiches";
  const kindLabel = kind === "course" ? "Cours" : kind === "exercise" ? "Exercice" : "Fiche";

  const doc = data.documents.find((d) => d.id === id);
  const [title, setTitle] = useState(doc?.title || "");
  const [tags, setTags] = useState(doc?.tags.join(", ") || "");
  const [savedState, setSavedState] = useState<"idle" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(doc?.title || "");
    setTags(doc?.tags.join(", ") || "");
  }, [doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Évite un setState sur un composant démonté (navigation rapide après une frappe)
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  if (!doc) {
    return (
      <div className="py-16 text-center text-slate-400">
        Document introuvable.
        <div className="mt-4">
          <button onClick={() => navigate(basePath)} className="text-sm font-medium text-[var(--accent)]">
            Retour
          </button>
        </div>
      </div>
    );
  }

  const subject = data.subjects.find((s) => s.id === doc.subjectId);
  const file = doc.fileId ? data.files.find((f) => f.id === doc.fileId) : undefined;

  // Détection si le fichier principal est un document texte / DOCX
  const isTextFile = file
    ? isDocxFile({ type: file.type, name: file.name } as File) ||
      file.type?.includes("text") ||
      file.name.toLowerCase().endsWith(".txt")
    : false;

  const scheduleSave = (patch: Partial<typeof doc>) => {
    updateDocument(doc.id, patch);
    setSavedState("idle");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSavedState("saved"), 500);
  };

  const handleUploadOrReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const uploadedFile = e.target.files?.[0];
      if (!uploadedFile) return;

      notify("Importation en cours...", "info");

      const previousFileId = doc.fileId;
      const record = await addFile(uploadedFile, { subjectId: doc.subjectId, category: kind });
      scheduleSave({ fileId: record.id });
      // Supprime l'ancien fichier principal : sinon il restait stocké pour toujours (fuite de stockage)
      if (previousFileId) await deleteFile(previousFileId);

      notify("Fichier principal mis à jour !");
    } catch (error) {
      console.error("Erreur lors de l'import :", error);
      notify("Impossible d'importer ce fichier.", "error");
    } finally {
      // TRÈS IMPORTANT : Réinitialise l'input pour pouvoir importer le même fichier plus tard si besoin
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Supprimer « ${doc.title} » ?`,
      message: "Cette action est irréversible.",
      danger: true,
      confirmLabel: "Supprimer",
    });
    if (ok) {
      deleteDocument(doc.id);
      notify(`${kindLabel} supprimé(e)`);
      navigate(basePath);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`${basePath}?matiere=${doc.subjectId}`)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            {savedState === "saved" ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Enregistré automatiquement
              </>
            ) : (
              "…"
            )}
          </span>
          <button
            onClick={() => scheduleSave({ favorite: !doc.favorite })}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Star className={`h-4 w-4 ${doc.favorite ? "fill-amber-400 text-amber-400" : ""}`} />
          </button>
          <button onClick={handleDelete} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {subject && (
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: `${subject.color}20`, color: subject.color }}
            >
              {subject.icon} {subject.name}
            </span>
          )}
          {doc.chapter && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
              {doc.chapter}
            </span>
          )}
          <span className="text-xs text-slate-400">
            Modifié le {new Date(doc.updatedAt).toLocaleDateString("fr-FR")}
          </span>
        </div>

        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave({ title: e.target.value });
          }}
          className="mt-3 w-full bg-transparent text-xl font-semibold text-slate-900 outline-none dark:text-white"
          placeholder="Titre du document"
        />

        <div className="mt-2 flex items-center gap-2">
          <TagIcon className="h-4 w-4 shrink-0 text-slate-300" />
          <input
            value={tags}
            onChange={(e) => {
              setTags(e.target.value);
              scheduleSave({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) });
            }}
            placeholder="tags séparés par des virgules"
            className={`${inputClass} border-none bg-transparent px-0 py-0 shadow-none focus:ring-0`}
          />
        </div>
      </div>

      {/* Gestion de la pièce jointe principale */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Paperclip className="h-3.5 w-3.5" /> Fichier principal {file ? `(${file.name})` : "(Aucun)"}
          </p>
          <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
            {file ? "Remplacer le fichier" : "Ajouter un fichier"}
            <input type="file" className="hidden" onChange={handleUploadOrReplaceFile} />
          </label>
        </div>

        {file && (
          <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-800 ${kind === "fiche" ? "p-6 min-h-[500px]" : "p-4"}`}>
            <FilePreview file={file} large={kind === "fiche"} />
          </div>
        )}
      </div>

      {/* Liste et ajout de documents / fichiers joints multiples */}
      <DocumentAttachments
        documentId={doc.id}
        fileIds={doc.fileIds}
        subjectId={doc.subjectId}
      />

      {/* Éditeur de texte / Notes (pour les cours ou fiches avec document texte détecté) */}
      {(kind !== "fiche" || isTextFile || !file) && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <FileTextIcon className="h-3.5 w-3.5" /> Partie Note / Éditeur de texte
          </div>
          <RichTextEditor
            key={doc.id}
            content={doc.content}
            onChange={(html) => scheduleSave({ content: html })}
            placeholder={
              kind === "course"
                ? "Rédigez votre cours ici…"
                : kind === "exercise"
                ? "Énoncé, résolution, remarques…"
                : "Notes de révision associées au texte…"
            }
          />
        </div>
      )}
    </div>
  );
}
