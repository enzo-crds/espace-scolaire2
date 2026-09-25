import { useEffect, useState } from "react";
import { Download, FileText, ExternalLink } from "lucide-react";
import type { FileRecord } from "@/types";
import { useData } from "@/context/DataContext";
import { isDocxFile, isImageFile, isPdfFile } from "@/services/docx";
import { humanFileSize } from "@/services/storage";

export function FilePreview({ file, large = false }: { file: FileRecord, large?: boolean }) {
  const { readFile } = useData();
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    readFile(file.id)
      .then((blob) => {
        if (cancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        } else {
          setMissing(true);
        }
      })
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // readFile est recréée à chaque rendu du provider ; seul l'id du fichier doit relancer le chargement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  const fakeFile = { type: file.type, name: file.name } as File;
  const isImg = isImageFile(fakeFile);
  const isPdf = isPdfFile(fakeFile);
  const isDocx = isDocxFile(fakeFile);

  // --- LA FONCTION QUI SAUVE LE TÉLÉCHARGEMENT SUR MOBILE ---
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault(); // Empêche le bug de rafraîchissement
    if (!url) return;

    // 1. Création du lien invisible
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = file.name;

    // 2. Ajout au DOM (Obligatoire pour Safari/iOS)
    document.body.appendChild(a);
    
    // 3. Clic forcé
    a.click();

    // 4. Nettoyage
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 ${large ? "h-full min-h-[400px]" : ""}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
          <p className="text-xs text-slate-400">{humanFileSize(file.size)}</p>
        </div>
        {url && (
          <div className="flex shrink-0 gap-1">
            <a href={url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" title="Ouvrir">
              <ExternalLink className="h-4 w-4" />
            </a>
            {/* ICI : Remplacement du <a> par un <button> sécurisé */}
            <button 
              onClick={handleDownload} 
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" 
              title="Télécharger"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {!url && (
        <div className="flex h-32 items-center justify-center text-xs text-slate-400">
          {missing ? "Fichier introuvable sur cet appareil. Réimportez-le." : "Chargement…"}
        </div>
      )}

      {url && isImg && (
        <img src={url} alt={file.name} className="max-h-80 w-full rounded-lg object-contain" />
      )}

      {url && isPdf && (
        <iframe src={url} title={file.name} className="h-[420px] w-full rounded-lg border border-slate-100 dark:border-slate-700" />
      )}

      {url && isDocx && (
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900/50">
          <FileText className="h-8 w-8 shrink-0 text-[var(--accent)]" />
          <p>
            L'aperçu direct des fichiers Word (.docx) n'est pas possible dans le navigateur. Utilisez
            « Ouvrir » ou « Télécharger », ou importez son contenu dans l'éditeur depuis le formulaire d'ajout.
          </p>
        </div>
      )}

      {url && !isImg && !isPdf && !isDocx && (
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900/50">
          <FileText className="h-8 w-8 shrink-0 text-[var(--accent)]" />
          <p>Aperçu non disponible pour ce type de fichier. Utilisez « Ouvrir » ou « Télécharger ».</p>
        </div>
      )}
    </div>
  );
}
