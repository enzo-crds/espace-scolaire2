import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, NotebookText, BarChart3, Dumbbell, X } from "lucide-react";
import { useData } from "@/context/DataContext";
import type { DocKind } from "@/types";

const KIND_INFO: Record<DocKind, { label: string; path: string; Icon: typeof BookOpen }> = {
  course: { label: "Cours", path: "/cours", Icon: BookOpen },
  fiche: { label: "Fiche", path: "/fiches", Icon: NotebookText },
  exercise: { label: "Exercice", path: "/exercices", Icon: Dumbbell },
};

/** Extrait le texte brut d'un contenu HTML sans exécuter de script ni charger d'image. */
function htmlToText(html: string): string {
  if (!html) return "";
  return new DOMParser().parseFromString(html, "text/html").body.textContent || "";
}

export function SearchModal({ onClose }: { onClose: () => void }) {
  const { data } = useData();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { documents: [], grades: [] };

    const documents = data.documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)) ||
        htmlToText(d.content).toLowerCase().includes(q)
    );

    const grades = data.grades.filter((g) => g.title.toLowerCase().includes(q));

    return { documents: documents.slice(0, 8), grades: grades.slice(0, 5) };
  }, [query, data]);

  const subjectName = (id: string) => data.subjects.find((s) => s.id === id)?.name || "Sans matière";

  const goTo = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center bg-black/40 p-4 pt-20 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-enter w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un cours, une fiche, une note, un tag…"
            className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim() === "" && (
            <p className="px-3 py-8 text-center text-sm text-slate-400">
              Commencez à taper pour rechercher dans toute votre application.
            </p>
          )}

          {results.documents.map((d) => {
            const info = KIND_INFO[d.kind];
            return (
            <button
              key={d.id}
              onClick={() => goTo(`${info.path}/${d.id}`)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <info.Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {d.title}
                </span>
                <span className="block truncate text-xs text-slate-400">
                  {info.label} · {subjectName(d.subjectId)}
                </span>
              </span>
            </button>
            );
          })}

          {results.grades.map((g) => (
            <button
              key={g.id}
              onClick={() => goTo("/notes")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <BarChart3 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {g.title}
                </span>
                <span className="block truncate text-xs text-slate-400">
                  Note · {subjectName(g.subjectId)} · {g.value}/{g.maxValue}
                </span>
              </span>
            </button>
          ))}

          {query.trim() !== "" && results.documents.length === 0 && results.grades.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-slate-400">Aucun résultat pour « {query} ».</p>
          )}
        </div>
      </div>
    </div>
  );
}
