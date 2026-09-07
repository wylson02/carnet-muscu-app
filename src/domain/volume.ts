import type { Muscle, WeeklySet } from './types'

/**
 * Volume hebdomadaire par muscle : séries validées contre la cible.
 *
 *   Vert   — dans ±20 % de la cible.
 *   Rouge  — plus de 20 % au-dessus : fatigue accumulée pour rien.
 *   Ambre  — plus de 20 % en dessous. Le classeur ne tranchait pas ce cas ;
 *            sous-volume et sur-volume ne se corrigent pas de la même façon,
 *            donc ils ne partagent pas la même couleur.
 */

export type VolumeStatus = 'ok' | 'over' | 'under'

export const VOLUME_TOLERANCE = 0.2

export interface MuscleVolume {
  muscle: Muscle
  done: number
  target: number
  status: VolumeStatus
  /** done / target. `null` si la cible est à zéro. */
  ratio: number | null
}

export function volumeStatus(done: number, target: number): VolumeStatus {
  if (target <= 0) return done > 0 ? 'over' : 'ok'
  const ratio = done / target
  if (ratio > 1 + VOLUME_TOLERANCE) return 'over'
  if (ratio < 1 - VOLUME_TOLERANCE) return 'under'
  return 'ok'
}

/** Séries validées par muscle sur une semaine donnée. */
export function weeklyVolume(
  sets: WeeklySet[],
  muscles: Muscle[],
  weekIndex: number,
): MuscleVolume[] {
  const counts = new Map<string, number>()
  for (const s of sets) {
    if (s.status !== 'validee') continue
    if (s.weekIndex !== weekIndex) continue
    counts.set(s.muscleId, (counts.get(s.muscleId) ?? 0) + 1)
  }

  return [...muscles]
    .sort((a, b) => a.order - b.order)
    .map((muscle) => {
      const done = counts.get(muscle.id) ?? 0
      return {
        muscle,
        done,
        target: muscle.targetSets,
        status: volumeStatus(done, muscle.targetSets),
        ratio: muscle.targetSets > 0 ? done / muscle.targetSets : null,
      }
    })
}

/** Séries validées, tous muscles confondus, semaine par semaine. */
export function totalByWeek(sets: WeeklySet[]): Map<number, number> {
  const out = new Map<number, number>()
  for (const s of sets) {
    if (s.status !== 'validee') continue
    out.set(s.weekIndex, (out.get(s.weekIndex) ?? 0) + 1)
  }
  return out
}

/**
 * Ordre de coupe si le volume dérive : Pectoraux, puis Triceps, puis Quadriceps.
 * Les prioritaires ne se coupent jamais en premier.
 */
export function cutOrder(muscles: Muscle[]): Muscle[] {
  return muscles
    .filter((m) => m.cutOrder !== null)
    .sort((a, b) => (a.cutOrder ?? 0) - (b.cutOrder ?? 0))
}
