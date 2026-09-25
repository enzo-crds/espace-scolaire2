import { useRef, useState } from "react";
import { Paperclip, Trash2, FileText, Download, Loader2, UploadCloud } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { humanFileSize } from "@/services/storage";

interface Props {
  documentId: string;
  fileIds?: string[];
  subjectId?: string;
}

export function DocumentAttachments({ documentId, fileIds = [], subjectId }: Props) {
  const { data, addFile, deleteFile, readFile, attachFileToDocument, detachFileFromDocument } = useData();
  const { notify } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const attachedFiles = (data.files || []).filter((f) => fileIds.includes(f.id));

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);
    notify("Importation en cours...");

    try {
      // Rattache chaque fichier dès qu'il est enregistré : un échec sur le 3e fichier
      // ne fait plus perdre les 2 premiers, et aucune écrasement de liste périmée.
      for (const file of files) {
        const record = await addFile(file, {
          subjectId: subjectId || null,
          category: "attachment",
        });
        attachFileToDocument(documentId, record.id);
      }
      notify(`${files.length} fichier(s) joint(s) avec succès !`);
    } catch (err) {
      console.error("Erreur lors de l'upload :", err);
      notify("Impossible d'ajouter les fichiers.", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Ignore les dragleave déclenchés en passant sur un élément enfant
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []);
    await processFiles(files);
  };

  const handleRemove = async (fileId: string) => {
    try {
      detachFileFromDocument(documentId, fileId);
      await deleteFile(fileId);
      notify("Fichier retiré");
    } catch (err) {
      console.error(err);
      notify("Erreur lors de la suppression", "error");
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    const blob = await readFile(fileId);
    if (!blob) {
      notify("Impossible de lire le fichier", "error");
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`mt-6 rounded-2xl border transition-all p-4 ${
        isDragging 
          ? "border-dashed border-[var(--accent)] bg-[var(--accent)]/5 dark:bg-[var(--accent)]/15 scale-[1.01]" 
          : "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <Paperclip className="h-4 w-4 text-[var(--accent)]" /> Fichiers joints ({attachedFiles.length})
        </h4>

        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Import...</>
          ) : (
            "+ Ajouter des documents"
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {isDragging && (
        <div className="my-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--accent)]/50 py-6 text-center text-xs text-[var(--accent)]">
          <UploadCloud className="mb-1 h-6 w-6 animate-bounce" />
          <p className="font-semibold">Relâchez pour joindre les fichiers !</p>
        </div>
      )}

      {attachedFiles.length === 0 && !isDragging ? (
        <p className="text-xs text-slate-400 italic">Aucun document joint à ce cours / fiche (glissez-déposez des fichiers ici).</p>
      ) : (
        <div className="space-y-2">
          {attachedFiles.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="truncate">
                  <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{f.name}</p>
                  <p className="text-[10px] text-slate-400">{humanFileSize(f.size)}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(f.id, f.name)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Télécharger"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(f.id)}
                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
