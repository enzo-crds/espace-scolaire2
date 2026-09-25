import { useEffect, useMemo, useState } from "react";
import { Calculator as CalcIcon, Plus, Minus, TriangleAlert, CheckCircle2, Info } from "lucide-react";
import { useData } from "@/context/DataContext";
import {
  weightedAverage,
  subjectAverage,
  neededGradeForTarget,
  generateSuggestions,
  projectedAverage,
  findCombinationsForTarget,
  round,
} from "@/services/calculations";
import { Field, inputClass } from "@/components/common/FormField";

type Scope = "ALL" | string;

export function CalculatorPage() {
  const { data } = useData();
  const [scope, setScope] = useState<Scope>("ALL");
  const [target, setTarget] = useState(15);
  const [nextCoef, setNextCoef] = useState(1);

  const [numGrades, setNumGrades] = useState(2);
  const [futureGrades, setFutureGrades] = useState<Array<{ value: number; coefficient: number }>>([
    { value: 14, coefficient: 1 },
    { value: 15, coefficient: 1 },
  ]);
  const [reverseCoef, setReverseCoef] = useState(1);

  // Si la matière sélectionnée a été supprimée entre-temps, on revient à "toutes les notes"
  useEffect(() => {
    if (scope !== "ALL" && !data.subjects.some((s) => s.id === scope)) setScope("ALL");
  }, [scope, data.subjects]);

  const relevantGrades = useMemo(
    () => (scope === "ALL" ? data.grades : data.grades.filter((g) => g.subjectId === scope)),
    [scope, data.grades]
  );

  const currentAverage = scope === "ALL" ? weightedAverage(data.grades) : subjectAverage(scope, data.grades);
  const currentCoefSum = relevantGrades.reduce((acc, g) => acc + g.coefficient, 0);

  const needed = currentAverage !== null ? neededGradeForTarget(currentAverage, currentCoefSum, target, nextCoef) : null;
  const suggestions = currentAverage !== null ? generateSuggestions(currentAverage, currentCoefSum, target) : [];

  const projected =
    currentAverage !== null ? projectedAverage(currentAverage, currentCoefSum, futureGrades) : null;

  const combos =
    currentAverage !== null
      ? findCombinationsForTarget(currentAverage, currentCoefSum, target, numGrades, reverseCoef)
      : [];

  const updateFutureGradesCount = (raw: number) => {
    // Le champ numérique peut envoyer NaN, 0, un décimal ou > 6 : on borne à un entier entre 1 et 6
    const n = Math.min(6, Math.max(1, Math.floor(Number.isFinite(raw) ? raw : 1)));
    setNumGrades(n);
    setFutureGrades((prev) => {
      const copy = [...prev];
      while (copy.length < n) copy.push({ value: 15, coefficient: 1 });
      return copy.slice(0, n);
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Calculateur de moyenne</h1>
        <p className="mt-1 text-sm text-slate-400">Simulez vos prochaines notes pour atteindre vos objectifs.</p>
      </div>

      {/* Sélecteur de portée */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <Field label="Sur quoi portent les calculs ?">
          <select className={inputClass} value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="ALL">Toutes les notes confondues (pondérées)</option>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
            ))}
          </select>
        </Field>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Ce calculateur pondère les notes sélectionnées entre elles directement (par coefficient), ce qui est
          différent de la moyenne générale « par matière » affichée dans l'onglet Notes.
        </p>
        <div className="mt-3 flex gap-6 text-sm">
          <p><span className="text-slate-400">Moyenne actuelle : </span><strong>{currentAverage !== null ? round(currentAverage, 2) : "—"}/20</strong></p>
          <p><span className="text-slate-400">Total des coefficients : </span><strong>{currentCoefSum || "—"}</strong></p>
        </div>
      </div>

      {currentAverage === null ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-slate-700">
          Ajoutez d'abord des notes pour pouvoir utiliser le calculateur.
        </div>
      ) : (
        <>
          {/* Note nécessaire au prochain contrôle */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
              <CalcIcon className="h-4 w-4 text-[var(--accent)]" /> Note nécessaire au prochain contrôle
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Moyenne cible">
                <input type="number" step={0.1} className={inputClass} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
              </Field>
              <Field label="Coefficient du prochain contrôle">
                <input type="number" step={0.5} min={0.5} className={inputClass} value={nextCoef} onChange={(e) => setNextCoef(Number(e.target.value))} />
              </Field>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
              {needed !== null && Number.isNaN(needed) ? (
                <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <TriangleAlert className="h-4 w-4" />
                  Saisissez un coefficient supérieur à 0 pour calculer la note nécessaire.
                </p>
              ) : needed !== null && needed <= 20 && needed > 0 ? (
                <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Il faudrait obtenir <strong className="mx-1">{round(needed, 2)}/20</strong> au prochain contrôle.
                </p>
              ) : needed !== null && needed > 20 ? (
                <p className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
                  <TriangleAlert className="h-4 w-4" />
                  Il faudrait {round(needed, 2)}/20 : objectif impossible à atteindre avec une seule note.
                </p>
              ) : (
                <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Objectif déjà atteint, même avec un 0 au prochain contrôle !
                </p>
              )}
            </div>

            <p className="mb-2 mt-4 text-xs font-medium text-slate-400">Autres possibilités :</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((s, i) => (
                <div key={i} className="rounded-lg border border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-700">
                  {s.value >= 0 && s.value <= 20 ? (
                    <>
                      <strong className="text-slate-700 dark:text-slate-200">{s.count} × {s.value}/20</strong> (coef {s.coefficient} chacune)
                    </>
                  ) : (
                    <span className="text-slate-400">
                      {s.count} note{s.count > 1 ? "s" : ""} coef {s.coefficient} : non réalisable seul{s.count > 1 ? "es" : "e"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Planification de plusieurs notes */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
              <CalcIcon className="h-4 w-4 text-[var(--accent)]" /> Simuler plusieurs futures notes
            </h2>

            <Field label="Nombre de prochaines notes">
              <div className="flex items-center gap-3">
                <button onClick={() => updateFutureGradesCount(Math.max(1, numGrades - 1))} className="rounded-lg border border-slate-200 p-1.5 dark:border-slate-600"><Minus className="h-4 w-4" /></button>
                <span className="w-6 text-center font-medium">{numGrades}</span>
                <button onClick={() => updateFutureGradesCount(Math.min(6, numGrades + 1))} className="rounded-lg border border-slate-200 p-1.5 dark:border-slate-600"><Plus className="h-4 w-4" /></button>
              </div>
            </Field>

            <div className="mt-3 space-y-2">
              {futureGrades.map((g, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <input
                    type="number" min={0} max={20} step={0.25}
                    className={inputClass}
                    value={g.value}
                    onChange={(e) => {
                      const v = Math.min(20, Math.max(0, Number(e.target.value) || 0));
                      setFutureGrades((prev) => prev.map((f, idx) => (idx === i ? { ...f, value: v } : f)));
                    }}
                    placeholder={`Note ${i + 1}`}
                  />
                  <input
                    type="number" min={0.5} step={0.5}
                    className={inputClass}
                    value={g.coefficient}
                    onChange={(e) => {
                      const v = Math.max(0, Number(e.target.value) || 0);
                      setFutureGrades((prev) => prev.map((f, idx) => (idx === i ? { ...f, coefficient: v } : f)));
                    }}
                    placeholder="Coefficient"
                  />
                </div>
              ))}
            </div>

            {projected !== null && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900/50">
                Moyenne prévisionnelle avec ces notes : <strong className="text-[var(--accent)]">{round(projected, 2)}/20</strong>
              </div>
            )}
          </div>

          {/* Mode inverse */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
              <CalcIcon className="h-4 w-4 text-[var(--accent)]" /> Quelles notes pour atteindre mon objectif ?
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Objectif">
                <input type="number" step={0.1} className={inputClass} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
              </Field>
              <Field label="Nombre de notes">
                <input type="number" min={1} max={6} className={inputClass} value={numGrades} onChange={(e) => updateFutureGradesCount(Number(e.target.value))} />
              </Field>
              <Field label="Coefficient (par note)">
                <input type="number" min={0.5} step={0.5} className={inputClass} value={reverseCoef} onChange={(e) => setReverseCoef(Number(e.target.value))} />
              </Field>
            </div>

            <div className="mt-4 space-y-2">
              {combos.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400 dark:bg-slate-900/50">
                  Aucune combinaison réaliste (entre 0 et 20) ne permet d'atteindre cet objectif avec ces paramètres.
                </p>
              ) : (
                combos.map((combo, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 px-3 py-2.5 text-sm dark:border-slate-700">
                    <span className="text-slate-400">Combinaison {i + 1} :</span>
                    {combo.map((v, idx) => (
                      <span key={idx} className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
                        {v}/20
                      </span>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
