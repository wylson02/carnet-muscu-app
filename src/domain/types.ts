/**
 * Types du domaine.
 *
 * Aucune dépendance : ni Dexie, ni React. Ces types décrivent la donnée telle
 * qu'elle serait envoyée à un serveur le jour où on en branche un.
 */

export type MuscleId = string
export type SessionId = string
export type ExerciseId = string

/** Isolation → repos court. Polyarticulaire → repos long. */
export type ExerciseKind = 'iso' | 'poly'

/** `poids-corps` : la charge saisie inclut le poids de corps (traction, dips). */
export type LoadMode = 'externe' | 'poids-corps'

export type MuscleCategory = 'Prioritaire' | 'Modérée' | 'Maintenance'

export interface Muscle {
  id: MuscleId
  name: string
  /** Séries hebdomadaires visées. */
  targetSets: number
  category: MuscleCategory
  /** Ordre de coupe en cas de dérive : Pectoraux → Triceps → Quadriceps. */
  cutOrder: number | null
  order: number
}

export interface Session {
  id: SessionId
  name: string
  order: number
}

export interface Exercise {
  id: ExerciseId
  sessionId: SessionId
  order: number
  name: string
  muscleId: MuscleId
  targetSets: number
  note?: string | null
  /** Même tag = même bloc enchaîné, sans repos entre les deux. */
  supersetTag?: string | null
  kind: ExerciseKind
  /** Écrase le repos par défaut de la catégorie, en secondes. */
  restSec?: number | null
  loadMode: LoadMode
  /** Pas du bouton +/- sur les kg, pour cet exercice. */
  incrementKg: number
  /** 1 = élévation latérale uni câble (Push), 2 = traction pronation. */
  barometer?: 1 | 2 | null
  archived: boolean
}

export type WorkoutStatus = 'en-cours' | 'terminee' | 'abandonnee'

export interface Workout {
  id: string
  sessionId: SessionId
  /** Jour de la séance, `YYYY-MM-DD`. */
  date: string
  /** Dérivé de `settings.startDate`, semaine 1 = semaine du début. */
  weekIndex: number
  startedAt: string
  endedAt?: string | null
  status: WorkoutStatus
}

export type SetStatus = 'validee' | 'sautee'

export interface SetLog {
  id: string
  workoutId: string
  exerciseId: ExerciseId
  /** 1, 2, 3… — c'est ce qui permet le pré-remplissage série par série. */
  setIndex: number
  kg: number
  reps: number
  rir: number
  /** Recalculé à l'écriture, stocké pour que les courbes soient immédiates. */
  e1rm: number
  status: SetStatus
  /** Série ajoutée au-delà de la cible du programme. */
  isExtra: boolean
  /** Figé au moment de la série sur les exercices au poids de corps. */
  bodyWeightKg?: number | null
  ts: string
}

export interface NutritionDay {
  /** `YYYY-MM-DD` — clé primaire. */
  date: string
  weightKg?: number | null
  kcal?: number | null
  steps?: number | null
  proteinG?: number | null
  note?: string | null
}

export type Phase =
  | 'Pré-préparation'
  | 'Descente'
  | 'Remontée'
  | 'Reverse diet'
  | 'Prise de masse'
  | 'Reset'

export const PHASES: Phase[] = [
  'Pré-préparation',
  'Descente',
  'Remontée',
  'Reverse diet',
  'Prise de masse',
  'Reset',
]

export interface PhaseSpan {
  id: string
  /** `YYYY-MM-DD`, inclus. */
  from: string
  /** `YYYY-MM-DD`, inclus. `null` = phase en cours. */
  to?: string | null
  phase: Phase
}

export interface Checkin {
  id: string
  date: string
  weekIndex: number
  weightKg?: number | null
  waistCm?: number | null
  shouldersCm?: number | null
  armCm?: number | null
  thighCm?: number | null
  calfCm?: number | null
  feeling?: string | null
}

export type ThemeChoice = 'sombre' | 'clair'

export interface Settings {
  id: 'settings'
  /** Pré-remplit les exercices au poids de corps. */
  bodyWeightKg: number
  /** `YYYY-MM-DD` — origine de la numérotation des semaines. */
  startDate: string
  defaultIncrementKg: number
  repStep: number
  rirStep: number
  restIsoSec: number
  restPolySec: number
  vibrate: boolean
  /** Bip de secours : iOS ignore `navigator.vibrate`. */
  beep: boolean
  keepAwake: boolean
  theme: ThemeChoice
  proteinTargetG: number
  stepCap: number
}

/**
 * Une série enrichie de sa semaine et de son muscle.
 * C'est la forme que consomment les calculs — plate, sans jointure à refaire.
 */
export interface WeeklySet {
  weekIndex: number
  exerciseId: ExerciseId
  muscleId: MuscleId
  kg: number
  reps: number
  rir: number
  e1rm: number
  status: SetStatus
  date: string
}
