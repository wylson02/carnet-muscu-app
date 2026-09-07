import type { Exercise, SetLog } from './types'

/**
 * Le pré-remplissage — la feature centrale de la saisie en salle.
 *
 * Chaque champ arrive déjà rempli, en gris, avec la valeur de LA MÊME SÉRIE la
 * semaine dernière. Un tap sur « Série validée » et c'est écrit. Sinon on ajuste
 * au +/-.
 *
 * Cascade, première valeur trouvée :
 *   1. même exercice, même n° de série, séance précédente
 *   2. même exercice, série précédente de ce soir
 *   3. dernière valeur connue sur cet exercice, quelle que soit la séance
 *   4. défaut — et sur les exercices au poids de corps, le kg part du poids de corps
 */

export type PrefillSource =
  | 'semaine-derniere'
  | 'serie-precedente'
  | 'derniere-connue'
  | 'defaut'

export interface Prefill {
  kg: number
  reps: number
  rir: number
  source: PrefillSource
  /** La série de référence, quand il y en a une : sert au libellé « S. dernière ». */
  reference: SetLog | null
}

export const DEFAULT_REPS = 10
export const DEFAULT_RIR = 2

export interface PrefillInput {
  exercise: Exercise
  setIndex: number
  /** Séries validées de l'exercice lors de la dernière séance terminée de ce type. */
  previousWorkoutSets: SetLog[]
  /** Séries déjà validées ce soir sur cet exercice. */
  currentWorkoutSets: SetLog[]
  /** Dernière série validée connue sur cet exercice, toutes séances confondues. */
  lastKnownSet?: SetLog | null
  bodyWeightKg: number
}

export function prefillForSet(input: PrefillInput): Prefill {
  const { exercise, setIndex, previousWorkoutSets, currentWorkoutSets, bodyWeightKg } = input

  // 1. La même série, la semaine dernière.
  const sameSetLastTime = previousWorkoutSets
    .filter((s) => s.status === 'validee' && s.setIndex === setIndex)
    .at(-1)
  if (sameSetLastTime) {
    return {
      kg: sameSetLastTime.kg,
      reps: sameSetLastTime.reps,
      rir: sameSetLastTime.rir,
      source: 'semaine-derniere',
      reference: sameSetLastTime,
    }
  }

  // 2. La série précédente de ce soir — cas d'une série ajoutée au-delà de la cible.
  const previousTonight = currentWorkoutSets
    .filter((s) => s.status === 'validee' && s.setIndex < setIndex)
    .sort((a, b) => a.setIndex - b.setIndex)
    .at(-1)
  if (previousTonight) {
    return {
      kg: previousTonight.kg,
      reps: previousTonight.reps,
      rir: previousTonight.rir,
      source: 'serie-precedente',
      reference: previousTonight,
    }
  }

  // 3. La dernière valeur connue sur cet exercice.
  const last = input.lastKnownSet
  if (last && last.status === 'validee') {
    return {
      kg: last.kg,
      reps: last.reps,
      rir: last.rir,
      source: 'derniere-connue',
      reference: last,
    }
  }

  // 4. Rien à se mettre sous la dent.
  return {
    kg: exercise.loadMode === 'poids-corps' ? bodyWeightKg : 0,
    reps: DEFAULT_REPS,
    rir: DEFAULT_RIR,
    source: 'defaut',
    reference: null,
  }
}

/** « S. dernière : 15 kg × 12 · RIR 1 », affiché au-dessus de la série en cours. */
export function referenceLabel(prefill: Prefill): string | null {
  const r = prefill.reference
  if (!r) return null
  const prefix =
    prefill.source === 'semaine-derniere'
      ? 'S. dernière'
      : prefill.source === 'serie-precedente'
        ? 'Série préc.'
        : 'Dernière fois'
  return `${prefix} : ${formatKg(r.kg)} kg × ${r.reps} · RIR ${r.rir}`
}

/** 15 → « 15 », 14.5 → « 14,5 ». Virgule décimale, pas de zéro inutile. */
export function formatKg(kg: number): string {
  const rounded = Math.round(kg * 100) / 100
  return String(rounded).replace('.', ',')
}
