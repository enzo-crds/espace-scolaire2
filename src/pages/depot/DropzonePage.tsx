import { useState } from "react";
import { FolderDown, Trash2, Eye, Download } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { FileDrop } from "@/components/files/FileDrop";
import { FilePreviewModal } from "@/components/files/FilePreviewModal";
import { EmptyState } from "@/components/common/EmptyState";
import { humanFileSize } from "@/services/storage";
import type { FileRecord } from "@/types";

export function DropzonePage() {
  const { data, addFile, deleteFile, readFile } = useData();
  const { notify, confirm } = useUI();
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [uploading, setUploading] = useState(false);

  // Uniquement les fichiers de la zone de dépôt (les pièces jointes des cours n'y apparaissent plus)
  const depotFiles = data.files.filter((f) => f.category === "depot");

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      await addFile(file, { subjectId: null, category: "depot" });
      notify(`Fichier « ${file.name} » ajouté au dépôt !`);
    } catch (err) {
      console.error(err);
      notify("Impossible d'enregistrer ce fichier (stockage plein ?)", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file: FileRecord) => {
    const ok = await confirm({
      title: `Supprimer « ${file.name} » ?`,
      message: "Cette action est irréversible.",
      danger: true,
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    await deleteFile(file.id);
    notify(`Fichier « ${file.name} » supprimé`);
  };

  const handleDownload = async (file: FileRecord) => {
    const blob = await readFile(file.id);
    if (!blob) {
      notify("Fichier introuvable sur cet appareil, réimportez-le", "error");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name || "fichier";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Zone de dépôt / Transfert</h1>
        <p className="mt-1 text-sm text-slate-400">Dépose tes fichiers ici pour les stocker, les prévisualiser ou les récupérer.</p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <FileDrop
          onFile={handleFileUpload}
          hint={uploading ? "Import en cours…" : "Glisse un fichier ici ou clique pour l'importer"}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Fichiers stockés ({depotFiles.length})
        </h2>

        {depotFiles.length === 0 ? (
          <EmptyState
            icon={<FolderDown className="h-6 w-6" />}
            title="Aucun fichier dans le dépôt"
            description="Glisse un fichier ci-dessus pour commencer."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {depotFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{file.name}</p>
                  <p className="text-[10px] text-slate-400">{humanFileSize(file.size)}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[var(--accent)] dark:hover:bg-slate-700"
                    title="Aperçu"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void handleDownload(file)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-500 dark:hover:bg-slate-700"
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void handleDelete(file)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-slate-700"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FilePreviewModal open={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />
    </div>
  );
}
