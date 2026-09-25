import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, ChevronDown, Pencil, Trash2, GraduationCap } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { allSubjectAverages, generalAverage, round } from "@/services/calculations";
import { EmptyState } from "@/components/common/EmptyState";
import { SubjectModal } from "@/components/subjects/SubjectModal";
import { GradeModal } from "./GradeModal";
import { SubjectBarChart } from "@/components/charts/SubjectBarChart";
import { btnPrimary, btnSecondary } from "@/components/common/FormField";
import type { Grade, Subject } from "@/types";

export function NotesPage() {
  const { data, deleteGrade, updateSettings } = useData();
  const { confirm, notify } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; subject?: Subject | null }>({ open: false });
  const [gradeModal, setGradeModal] = useState<{ open: boolean; subjectId: string; grade?: Grade | null }>({
    open: false,
    subjectId: "",
  });

  useEffect(() => {
    const state = location.state as { openSubject?: boolean } | null;
    if (state?.openSubject) setSubjectModal({ open: true });
    if (state) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const averages = allSubjectAverages(data.subjects, data.grades);
  const mode = data.settings.averageMode;
  const general = generalAverage(data.subjects, data.grades, mode);

  const toggle = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleDeleteGrade = async (grade: Grade) => {
    const ok = await confirm({ title: `Supprimer « ${grade.title} » ?`, danger: true, confirmLabel: "Supprimer" });
    if (ok) {
      deleteGrade(grade.id);
      notify("Note supprimée");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Notes</h1>
          <p className="mt-1 text-sm text-slate-400">Suivez vos évaluations et vos moyennes par matière.</p>
        </div>
        <button className={btnSecondary} onClick={() => setSubjectModal({ open: true })}>
          <Plus className="h-4 w-4" /> Matière
        </button>
      </div>

      {/* Moyenne générale */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800 lg:col-span-1">
          <p className="text-sm font-medium text-slate-400">Moyenne générale</p>
          <p className="mt-2 text-4xl font-bold text-slate-900 dark:text-white">
            {general !== null ? round(general, 1) : "—"}
            <span className="text-lg font-medium text-slate-400">/20</span>
          </p>
          <div className="mt-4 flex rounded-lg bg-slate-100 p-1 text-xs font-medium dark:bg-slate-700">
            <button
              onClick={() => updateSettings({ averageMode: "simple" })}
              className={`flex-1 rounded-md py-1.5 transition ${mode === "simple" ? "bg-white shadow-sm dark:bg-slate-600" : "text-slate-500"}`}
            >
              Moyenne des moyennes
            </button>
            <button
              onClick={() => updateSettings({ averageMode: "weighted" })}
              className={`flex-1 rounded-md py-1.5 transition ${mode === "weighted" ? "bg-white shadow-sm dark:bg-slate-600" : "text-slate-500"}`}
            >
              Coefficients matières
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800 lg:col-span-2">
          <p className="mb-3 text-sm font-medium text-slate-400">Moyennes par matière</p>
          {averages.filter((a) => a.average !== null).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Pas encore de notes.</p>
          ) : (
            <SubjectBarChart
              bars={averages
                .filter((a) => a.average !== null)
                .map((a) => ({ label: a.subject.name, value: round(a.average as number, 1), color: a.subject.color }))}
            />
          )}
        </div>
      </div>

      {/* Liste des matières */}
      {data.subjects.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-6 w-6" />}
          title="Aucune matière créée"
          description="Créez une matière pour commencer à ajouter des notes."
          action={<button className={btnPrimary} onClick={() => setSubjectModal({ open: true })}><Plus className="h-4 w-4" /> Créer une matière</button>}
        />
      ) : (
        <div className="space-y-3">
          {averages.map(({ subject, average, count }) => {
            const isOpen = expanded.includes(subject.id);
            const grades = data.grades.filter((g) => g.subjectId === subject.id);
            return (
              <div key={subject.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800">
                <button onClick={() => toggle(subject.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg" style={{ background: `${subject.color}20` }}>
                    {subject.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-100">{subject.name}</p>
                    <p className="text-xs text-slate-400">{count} note{count > 1 ? "s" : ""} · coef. matière {subject.coefficient}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{average !== null ? round(average, 1) : "—"}<span className="text-xs font-normal text-slate-400">/20</span></p>
                  </div>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-700">
                    <div className="mb-3 flex justify-end gap-2">
                      <button
                        onClick={() => setSubjectModal({ open: true, subject })}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Modifier la matière
                      </button>
                      <button
                        onClick={() => setGradeModal({ open: true, subjectId: subject.id })}
                        className="flex items-center gap-1 rounded-lg bg-[var(--accent)]/10 px-2.5 py-1.5 text-xs font-medium text-[var(--accent)]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Ajouter une note
                      </button>
                    </div>

                    {grades.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-400">Aucune note pour cette matière.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[420px] text-sm">
                          <thead>
                            <tr className="text-left text-xs text-slate-400">
                              <th className="pb-2 font-medium">Évaluation</th>
                              <th className="pb-2 font-medium">Note</th>
                              <th className="pb-2 font-medium">Coef.</th>
                              <th className="pb-2 font-medium">Date</th>
                              <th className="pb-2 font-medium"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/60">
                            {[...grades]
                              .sort((a, b) => (a.date < b.date ? 1 : -1))
                              .map((g) => (
                                <tr key={g.id}>
                                  <td className="py-2 pr-2 text-slate-700 dark:text-slate-200">{g.title}</td>
                                  <td className="py-2 pr-2 font-medium text-slate-800 dark:text-slate-100">{g.value}/{g.maxValue}</td>
                                  <td className="py-2 pr-2 text-slate-500">{g.coefficient}</td>
                                  <td className="py-2 pr-2 text-slate-400">{new Date(g.date).toLocaleDateString("fr-FR")}</td>
                                  <td className="py-2 text-right">
                                    <button onClick={() => setGradeModal({ open: true, subjectId: subject.id, grade: g })} className="rounded p-1 text-slate-400 hover:text-slate-600">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => handleDeleteGrade(g)} className="rounded p-1 text-slate-400 hover:text-rose-500">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SubjectModal open={subjectModal.open} onClose={() => setSubjectModal({ open: false })} subject={subjectModal.subject} />
      <GradeModal
        open={gradeModal.open}
        onClose={() => setGradeModal({ open: false, subjectId: "" })}
        subjectId={gradeModal.subjectId}
        grade={gradeModal.grade}
      />
    </div>
  );
}
