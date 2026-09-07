import type { WeeklySet } from './types'

/**
 * Les deux baromètres qui décident du volume total :
 *   1 — Élévation latérale uni (câble), instance Push uniquement.
 *   2 — Traction pronation (charge = poids de corps + lest).
 *
 * Verdict : on compare max(3 dernières semaines) à max(3 semaines d'avant),
 * sur les DEUX indicateurs.
 *
 *   les deux ≤  → STOP, couper le volume (Pectoraux d'abord, puis Triceps).
 *   un seul ≤   → Vigilance : sommeil, calories, RIR avant de conclure.
 *   aucun ≤     → OK, ça monte, ne touche à rien.
 *   avant S6    → Phase d'installation, il n'y a pas encore deux fenêtres.
 */

export type BarometerVerdict = 'installation' | 'insuffisant' | 'ok' | 'vigilance' | 'stop'

/** Première semaine où le verdict a un sens : il faut 2 fenêtres de 3 semaines. */
export const VERDICT_FROM_WEEK = 6

export interface IndicatorWindow {
  /** max des e1RM sur les 3 dernières semaines. `null` si aucune donnée. */
  recent: number | null
  /** max des e1RM sur les 3 semaines d'avant. `null` si aucune donnée. */
  prior: number | null
  /** `true` quand ça plafonne ou régresse (recent ≤ prior). */
  flat: boolean | null
}

export interface BarometerReading {
  verdict: BarometerVerdict
  label: string
  detail: string
  indicator1: IndicatorWindow
  indicator2: IndicatorWindow
}

/** Meilleur e1RM par semaine pour un exercice donné. */
export function bestByWeek(sets: WeeklySet[], exerciseId: string): Map<number, number> {
  const out = new Map<number, number>()
  for (const s of sets) {
    if (s.status !== 'validee') continue
    if (s.exerciseId !== exerciseId) continue
    const prev = out.get(s.weekIndex)
    if (prev === undefined || s.e1rm > prev) out.set(s.weekIndex, s.e1rm)
  }
  return out
}

/** Max sur une fenêtre de semaines inclusives. `null` si rien n'y a été fait. */
function maxOverWeeks(byWeek: Map<number, number>, from: number, to: number): number | null {
  let max: number | null = null
  for (let w = from; w <= to; w++) {
    const v = byWeek.get(w)
    if (v === undefined) continue
    if (max === null || v > max) max = v
  }
  return max
}

function windowFor(byWeek: Map<number, number>, currentWeek: number): IndicatorWindow {
  const recent = maxOverWeeks(byWeek, currentWeek - 2, currentWeek)
  const prior = maxOverWeeks(byWeek, currentWeek - 5, currentWeek - 3)
  const flat = recent === null || prior === null ? null : recent <= prior
  return { recent, prior, flat }
}

export function barometerVerdict(
  indicator1: Map<number, number>,
  indicator2: Map<number, number>,
  currentWeek: number,
): BarometerReading {
  const w1 = windowFor(indicator1, currentWeek)
  const w2 = windowFor(indicator2, currentWeek)

  if (currentWeek < VERDICT_FROM_WEEK) {
    return {
      verdict: 'installation',
      label: "Phase d'installation",
      detail:
        `Le verdict démarre en semaine ${VERDICT_FROM_WEEK} : il faut deux fenêtres ` +
        `de 3 semaines pour comparer quoi que ce soit. Contente-toi de remplir.`,
      indicator1: w1,
      indicator2: w2,
    }
  }

  if (w1.flat === null || w2.flat === null) {
    return {
      verdict: 'insuffisant',
      label: 'Données insuffisantes',
      detail:
        "Il manque des séries sur au moins un des deux baromètres dans l'une des " +
        'deux fenêtres. Le verdict reprendra dès que les six semaines seront remplies.',
      indicator1: w1,
      indicator2: w2,
    }
  }

  const flatCount = (w1.flat ? 1 : 0) + (w2.flat ? 1 : 0)

  if (flatCount === 2) {
    return {
      verdict: 'stop',
      label: 'STOP — coupe le volume',
      detail:
        'Les deux plafonnent depuis 3 semaines. Retire 2 séries de Pectoraux, puis de ' +
        "Triceps. Jamais les prioritaires en premier. À nuancer si tu es en déficit : " +
        "un baromètre plat pendant une descente calorique est normal.",
      indicator1: w1,
      indicator2: w2,
    }
  }

  if (flatCount === 1) {
    return {
      verdict: 'vigilance',
      label: 'Vigilance',
      detail:
        `${w1.flat ? "L'élévation latérale" : 'La traction'} plafonne, l'autre monte encore. ` +
        'Vérifie sommeil, calories et RIR avant de toucher au volume.',
      indicator1: w1,
      indicator2: w2,
    }
  }

  return {
    verdict: 'ok',
    label: 'OK — ça monte',
    detail: 'Les deux baromètres progressent. Ne touche à rien.',
    indicator1: w1,
    indicator2: w2,
  }
}
