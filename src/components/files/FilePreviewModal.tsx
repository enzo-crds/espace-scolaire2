import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { Download, AlertCircle } from "lucide-react";
import { useData } from "@/context/DataContext";
import type { FileRecord } from "@/types";

interface FilePreviewProps {
  open: boolean;
  onClose: () => void;
  file?: Pick<FileRecord, "id" | "name" | "type"> | null;
}

/**
 * Aperçu d'un fichier stocké. Le contenu est lu depuis IndexedDB (via le contexte)
 * puis exposé par une URL d'objet temporaire, révoquée à la fermeture.
 */
export function FilePreviewModal({ open, onClose, file }: FilePreviewProps) {
  const { readFile } = useData();
  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!open || !file) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setSrc(null);
    setImgError(false);
    setStatus("loading");

    readFile(file.id)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setStatus("error");
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, file?.id, readFile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!file) return null;

  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name) || file.type?.startsWith("image/");
  const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";

  return (
    <Modal open={open} onClose={onClose} title={file.name} size="xl">
      <div className="space-y-4">
        {src && (
          <div className="flex justify-end">
            <a
              href={src}
              download={file.name}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" /> Télécharger
            </a>
          </div>
        )}

        <div className="flex max-h-[72vh] items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
          {status === "loading" ? (
            <div className="p-8 text-sm text-slate-400">Chargement…</div>
          ) : status === "error" || !src ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-slate-500">
              <AlertCircle className="h-8 w-8 text-rose-500" />
              <p>Fichier introuvable sur cet appareil. Réimportez-le pour pouvoir l'afficher.</p>
            </div>
          ) : isImage ? (
            imgError ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-slate-500">
                <AlertCircle className="h-8 w-8 text-rose-500" />
                <p>Impossible d'afficher cette image.</p>
              </div>
            ) : (
              <img
                src={src}
                alt={file.name}
                className="max-h-[65vh] rounded-lg object-contain"
                onError={() => setImgError(true)}
              />
            )
          ) : isPdf ? (
            <iframe src={src} title={file.name} className="h-[65vh] w-full rounded-lg border-0" />
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              Aperçu direct non disponible pour ce format. Utilisez le bouton de téléchargement.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
