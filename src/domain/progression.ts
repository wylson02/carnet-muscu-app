import type { ExerciseId, WeeklySet } from './types'

/**
 * Progression par exercice : meilleur e1RM de la semaine, et Δ vs record.
 *
 *   Meilleur e1RM de la semaine = max des séries de l'exercice cette semaine.
 *   Δ vs record = e1RM semaine − max de TOUTES les semaines précédentes.
 *   Positif → vert. Négatif → rouge.
 */

export interface WeekBest {
  weekIndex: number
  /** Max des e1RM de la semaine. */
  best: number
  /** Nombre de séries validées. */
  sets: number
  /** Charge la plus lourde manipulée cette semaine. */
  topKg: number
  /** Δ vs le record de toutes les semaines antérieures. `null` la 1re semaine. */
  delta: number | null
}

/** Ne garde que les séries validées d'un exercice. */
export function setsOfExercise(sets: WeeklySet[], exerciseId: ExerciseId): WeeklySet[] {
  return sets.filter((s) => s.exerciseId === exerciseId && s.status === 'validee')
}

/**
 * Une ligne par semaine travaillée, dans l'ordre croissant, avec le Δ déjà calculé.
 */
export function weeklyBests(sets: WeeklySet[]): WeekBest[] {
  const byWeek = new Map<number, WeeklySet[]>()
  for (const s of sets) {
    if (s.status !== 'validee') continue
    const list = byWeek.get(s.weekIndex)
    if (list) list.push(s)
    else byWeek.set(s.weekIndex, [s])
  }

  const weeks = [...byWeek.keys()].sort((a, b) => a - b)
  const out: WeekBest[] = []
  let recordSoFar: number | null = null

  for (const w of weeks) {
    const list = byWeek.get(w)!
    const best = Math.max(...list.map((s) => s.e1rm))
    const topKg = Math.max(...list.map((s) => s.kg))
    out.push({
      weekIndex: w,
      best,
      sets: list.length,
      topKg,
      delta: recordSoFar === null ? null : best - recordSoFar,
    })
    recordSoFar = recordSoFar === null ? best : Math.max(recordSoFar, best)
  }

  return out
}

/**
 * Le record à battre au moment d'attaquer `weekIndex` : le meilleur e1RM de
 * toutes les semaines strictement antérieures. `null` si l'exercice est neuf.
 */
export function recordBefore(sets: WeeklySet[], weekIndex: number): number | null {
  let max: number | null = null
  for (const s of sets) {
    if (s.status !== 'validee') continue
    if (s.weekIndex >= weekIndex) continue
    if (max === null || s.e1rm > max) max = s.e1rm
  }
  return max
}

/** Le record absolu, toutes semaines confondues. */
export function allTimeRecord(sets: WeeklySet[]): number | null {
  let max: number | null = null
  for (const s of sets) {
    if (s.status !== 'validee') continue
    if (max === null || s.e1rm > max) max = s.e1rm
  }
  return max
}

export interface ExerciseSummary {
  exerciseId: ExerciseId
  /** e1RM de la toute première semaine travaillée. */
  firstE1rm: number | null
  bestE1rm: number | null
  /** Progression en % entre la première semaine et le record. */
  deltaPct: number | null
  weeks: WeekBest[]
}

/** La ligne de l'onglet « Progression » pour un exercice. */
export function exerciseSummary(sets: WeeklySet[], exerciseId: ExerciseId): ExerciseSummary {
  const weeks = weeklyBests(setsOfExercise(sets, exerciseId))
  if (weeks.length === 0) {
    return { exerciseId, firstE1rm: null, bestE1rm: null, deltaPct: null, weeks }
  }
  const first = weeks[0].best
  const best = Math.max(...weeks.map((w) => w.best))
  return {
    exerciseId,
    firstE1rm: first,
    bestE1rm: best,
    deltaPct: first > 0 ? ((best - first) / first) * 100 : null,
    weeks,
  }
}
