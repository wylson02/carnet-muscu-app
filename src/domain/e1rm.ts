/**
 * e1RM — Epley ajustée du RIR.
 *
 *     e1RM = kg × (1 + (reps + RIR) / 30)
 *
 * Le RIR est ajouté aux répétitions : une série de 10 à 2 RIR vaut autant
 * qu'une série de 12 à l'échec. Deux séances restent comparables même si le
 * nombre de répétitions a changé.
 */
export function e1rm(kg: number, reps: number, rir: number): number {
  if (!Number.isFinite(kg) || !Number.isFinite(reps) || !Number.isFinite(rir)) return 0
  if (kg <= 0 || reps <= 0) return 0
  return kg * (1 + (reps + rir) / 30)
}

/** Arrondi d'affichage : une décimale, comme dans le classeur. */
export function roundE1rm(value: number): number {
  return Math.round(value * 10) / 10
}
