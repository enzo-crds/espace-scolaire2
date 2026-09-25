import type { Grade, Subject } from "@/types";

/** Ramène une note à un barème /20 */
export function normalizeGrade(value: number, maxValue: number): number {
  if (!maxValue) return 0;
  return (value / maxValue) * 20;
}

/** Moyenne pondérée d'une liste de notes (déjà ramenées sur 20) */
export function weightedAverage(grades: Grade[]): number | null {
  if (grades.length === 0) return null;
  let sumWeighted = 0;
  let sumCoef = 0;
  for (const g of grades) {
    if (!(g.coefficient > 0)) continue; // un coefficient nul/négatif fausserait la moyenne
    const norm = normalizeGrade(g.value, g.maxValue);
    sumWeighted += norm * g.coefficient;
    sumCoef += g.coefficient;
  }
  if (sumCoef === 0) return null;
  return sumWeighted / sumCoef;
}

export function subjectAverage(subjectId: string, grades: Grade[]): number | null {
  return weightedAverage(grades.filter((g) => g.subjectId === subjectId));
}

export interface SubjectAverageInfo {
  subject: Subject;
  average: number | null;
  count: number;
}

export function allSubjectAverages(subjects: Subject[], grades: Grade[]): SubjectAverageInfo[] {
  return subjects.map((s) => {
    const subjectGrades = grades.filter((g) => g.subjectId === s.id);
    return { subject: s, average: weightedAverage(subjectGrades), count: subjectGrades.length };
  });
}

/** Moyenne générale : "simple" = moyenne des moyennes, "weighted" = pondérée par coef matière */
export function generalAverage(
  subjects: Subject[],
  grades: Grade[],
  mode: "simple" | "weighted"
): number | null {
  const averages = allSubjectAverages(subjects, grades).filter((a) => a.average !== null) as {
    subject: Subject;
    average: number;
    count: number;
  }[];
  if (averages.length === 0) return null;

  if (mode === "simple") {
    const sum = averages.reduce((acc, a) => acc + a.average, 0);
    return sum / averages.length;
  }

  const sumWeighted = averages.reduce((acc, a) => acc + a.average * a.subject.coefficient, 0);
  const sumCoef = averages.reduce((acc, a) => acc + a.subject.coefficient, 0);
  if (sumCoef === 0) return null;
  return sumWeighted / sumCoef;
}

export function round(n: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

// ------------------------------------------------------------
// Calculateur d'objectif
// ------------------------------------------------------------

/**
 * Calcule la note nécessaire au prochain contrôle pour atteindre un objectif,
 * connaissant la moyenne actuelle et la somme des coefficients déjà comptés.
 */
export function neededGradeForTarget(
  currentAverage: number,
  currentCoefSum: number,
  target: number,
  nextCoef: number
): number {
  if (nextCoef <= 0) return NaN;
  const needed = (target * (currentCoefSum + nextCoef) - currentAverage * currentCoefSum) / nextCoef;
  return needed;
}

export interface GradeSuggestion {
  count: number; // nombre de notes
  coefficient: number;
  value: number; // note nécessaire par note (identique pour chaque note de la suggestion)
}

/**
 * Génère quelques suggestions de type "N notes à coef C" pour atteindre un objectif,
 * en supposant des notes identiques pour simplifier la lecture.
 */
export function generateSuggestions(
  currentAverage: number,
  currentCoefSum: number,
  target: number
): GradeSuggestion[] {
  const suggestions: GradeSuggestion[] = [];
  const combos: Array<{ count: number; coefficient: number }> = [
    { count: 1, coefficient: 1 },
    { count: 1, coefficient: 2 },
    { count: 1, coefficient: 3 },
    { count: 2, coefficient: 1 },
    { count: 2, coefficient: 2 },
    { count: 3, coefficient: 1 },
  ];

  for (const combo of combos) {
    // Avec N notes identiques de coefficient C chacune :
    // moyenne finale = (actuelle*coefActuel + valeur*C*N) / (coefActuel + C*N)
    const addedCoef = combo.coefficient * combo.count;
    const needed = neededGradeForTarget(currentAverage, currentCoefSum, target, addedCoef);
    suggestions.push({ count: combo.count, coefficient: combo.coefficient, value: round(needed, 2) });
  }
  return suggestions;
}

/** Moyenne prévisionnelle si on ajoute une liste de futures notes (value déjà /20) */
export function projectedAverage(
  currentAverage: number,
  currentCoefSum: number,
  futureGrades: Array<{ value: number; coefficient: number }>
): number {
  const addedWeighted = futureGrades.reduce((acc, g) => acc + g.value * g.coefficient, 0);
  const addedCoef = futureGrades.reduce((acc, g) => acc + g.coefficient, 0);
  const totalCoef = currentCoefSum + addedCoef;
  if (totalCoef === 0) return 0;
  return (currentAverage * currentCoefSum + addedWeighted) / totalCoef;
}

/**
 * Mode inverse : trouver des combinaisons réalistes de N futures notes (même coefficient)
 * permettant d'atteindre l'objectif. Recherche limitée à un pas de 0.5 entre 0 et 20.
 */
export function findCombinationsForTarget(
  currentAverage: number,
  currentCoefSum: number,
  target: number,
  numberOfGrades: number,
  coefficient: number
): number[][] {
  const results: number[][] = [];
  const step = 0.5;
  const values: number[] = [];
  for (let v = 0; v <= 20; v += step) values.push(round(v, 1));

  // Cas simple : notes identiques (résolution directe)
  const addedCoef = coefficient * numberOfGrades;
  const neededIdentical = neededGradeForTarget(currentAverage, currentCoefSum, target, addedCoef);
  if (neededIdentical >= 0 && neededIdentical <= 20) {
    results.push(Array(numberOfGrades).fill(round(neededIdentical, 2)));
  }

  // Génère quelques variations autour de la valeur nécessaire pour proposer des alternatives réalistes
  if (numberOfGrades <= 4) {
    const maxCombosToScan = 4000;
    let scanned = 0;
    const combo: number[] = [];

    function backtrack(index: number) {
      if (results.length >= 6 || scanned > maxCombosToScan) return;
      if (index === numberOfGrades) {
        scanned++;
        const avg = projectedAverage(
          currentAverage,
          currentCoefSum,
          combo.map((v) => ({ value: v, coefficient }))
        );
        if (Math.abs(avg - target) < 0.05) {
          results.push([...combo]);
        }
        return;
      }
      // Pour limiter la combinatoire, on ne teste qu'un sous-ensemble de valeurs espacées
      for (let i = 0; i < values.length; i += 3) {
        if (results.length >= 6 || scanned > maxCombosToScan) return;
        combo.push(values[i]);
        backtrack(index + 1);
        combo.pop();
      }
    }
    backtrack(0);
  }

  // Déduplique
  const unique = new Map<string, number[]>();
  for (const r of results) {
    const key = [...r].sort((a, b) => a - b).join(",");
    if (!unique.has(key)) unique.set(key, r);
  }
  return Array.from(unique.values()).slice(0, 6);
}
