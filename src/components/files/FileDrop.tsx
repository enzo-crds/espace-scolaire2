import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

interface FileDropProps {
  onFile: (file: File) => void;
  accept?: string;
  hint?: string;
}

export function FileDrop({ onFile, accept, hint }: FileDropProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
        dragging
          ? "border-[var(--accent)] bg-[var(--accent)]/5"
          : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800/50"
      }`}
    >
      <UploadCloud className="h-7 w-7 text-slate-400" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
        Glissez-déposez un fichier ou cliquez pour choisir
      </p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
