import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, NotebookText, BarChart3, GraduationCap, Plus, ArrowRight,
  CalendarClock, Sparkles,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { allSubjectAverages, generalAverage, round } from "@/services/calculations";
import { DAYS, currentDayIndex, timeToMinutes } from "@/utils/date";
import { EmptyState } from "@/components/common/EmptyState";
import { SubjectBarChart } from "@/components/charts/SubjectBarChart";

export function Dashboard() {
  const { data } = useData();
  const navigate = useNavigate();
  const { subjects, documents, grades, schedule, settings } = data;

  const general = generalAverage(subjects, grades, settings.averageMode);
  const averages = allSubjectAverages(subjects, grades);

  const nextCourses = useMemo(() => {
    const todayIdx = currentDayIndex();
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const relevant = schedule.filter((s) => s.week === "BOTH" || s.week === settings.currentWeek);

    const upcomingToday = relevant
      .filter((s) => s.day === todayIdx && timeToMinutes(s.start) >= nowMinutes)
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    // Sans limite de nombre pour aujourd'hui
    if (upcomingToday.length > 0) return upcomingToday.map((s) => ({ ...s, dayLabel: "Aujourd'hui" }));

    // Sinon, cherche le prochain jour avec des cours (sans limite non plus)
    for (let offset = 1; offset <= 7; offset++) {
      const dayIdx = (todayIdx + offset) % 7;
      const daySlots = relevant.filter((s) => s.day === dayIdx).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      if (daySlots.length > 0) {
        return daySlots.map((s) => ({ ...s, dayLabel: offset === 1 ? "Demain" : DAYS[dayIdx] }));
      }
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, settings.currentWeek]);

  const latestGrades = [...grades].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 5);

  const stats = [
    { label: "Moyenne générale", value: general !== null ? `${round(general, 2)}/20` : "—", icon: GraduationCap },
    { label: "Matières", value: subjects.length, icon: Sparkles },
    { label: "Notes enregistrées", value: grades.length, icon: BarChart3 },
    { label: "Cours, fiches & exos", value: documents.length, icon: BookOpen },
  ];

  const quickActions = [
    { label: "Ajouter un cours", icon: BookOpen, action: () => navigate("/cours", { state: { openNew: true } }) },
    { label: "Ajouter une note", icon: BarChart3, action: () => navigate("/notes", { state: { openSubject: subjects.length === 0 } }) },
    { label: "Ajouter une fiche", icon: NotebookText, action: () => navigate("/fiches", { state: { openNew: true } }) },
    { label: "Ajouter une matière", icon: Plus, action: () => navigate("/notes", { state: { openSubject: true } }) },
    { label: "Ajouter un exercice", icon: NotebookText, action: () => navigate("/exercices", { state: { openNew: true } }) },
    { label: "Emploi du temps", icon: CalendarClock, action: () => navigate("/emploi-du-temps") },
  ];

  const subjectOf = (id: string) => subjects.find((s) => s.id === id);

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Bonjour, {settings.studentName} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-400">Voici un aperçu de votre espace scolaire.</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <s.icon className="h-4.5 w-4.5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Raccourcis */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <p className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Raccourcis</p>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={a.action}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--accent)] hover:text-[var(--accent)] dark:border-slate-700 dark:text-slate-300"
            >
              <a.icon className="h-4 w-4" /> {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Prochains cours */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Prochains cours</h2>
            <button onClick={() => navigate("/emploi-du-temps")} className="flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {nextCourses.length === 0 ? (
            <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="Aucun cours à venir" description="Ajoutez votre emploi du temps." />
          ) : (
            <div className="space-y-2">
              {nextCourses.map((s) => {
                const subject = subjectOf(s.subjectId || "");
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border-l-4 bg-slate-50 px-3 py-2.5 dark:bg-slate-900/40" style={{ borderColor: s.color || subject?.color || "#6366f1" }}>
                    <div className="w-24 shrink-0 text-xs font-semibold text-slate-500">
                      {s.dayLabel}<br />{s.start} - {s.end}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {subject ? `${subject.icon} ${subject.name}` : s.label}
                      </p>
                      {s.room && <p className="text-xs text-slate-400">Salle {s.room}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dernières notes */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Dernières notes</h2>
            <button onClick={() => navigate("/notes")} className="flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {latestGrades.length === 0 ? (
            <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="Aucune note enregistrée" description="Ajoutez votre première note." />
          ) : (
            <div className="space-y-2">
              {latestGrades.map((g) => {
                const subject = subjectOf(g.subjectId);
                return (
                  <div key={g.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900/40">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{g.title}</p>
                      <p className="text-xs text-slate-400">{subject?.name || "—"}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-100">
                      {g.value}/{g.maxValue}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Moyennes par matière */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <h2 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Moyennes par matière</h2>
        {averages.filter((a) => a.average !== null).length === 0 ? (
          <EmptyState icon={<GraduationCap className="h-5 w-5" />} title="Pas encore de moyennes" description="Ajoutez des notes pour voir vos moyennes apparaître ici." />
        ) : (
          <SubjectBarChart
            bars={averages.filter((a) => a.average !== null).map((a) => ({ label: a.subject.name, value: round(a.average as number, 2), color: a.subject.color }))}
          />
        )}
      </div>
    </div>
  );
}
