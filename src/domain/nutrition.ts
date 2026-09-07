import type { NutritionDay, Phase, PhaseSpan } from './types'
import { addDays } from './week'

/**
 * Poids, calories, pas.
 *
 * On ne lit jamais le poids brut : uniquement la moyenne 7 jours et sa tendance.
 *
 *   tendance = moy7j(aujourd'hui) − moy7j(J−7)
 *
 * Seuil ±0,15 kg. En dessous de −0,15 : « baisse ». Au-dessus de +0,15 :
 * « hausse ». Entre les deux : « stagne ».
 */

export const TREND_THRESHOLD = 0.15
export const WINDOW_DAYS = 7

export type TrendLabel = 'baisse' | 'stagne' | 'hausse'

/** Moyenne des poids saisis sur la fenêtre de `days` jours finissant à `endDate`. */
export function rollingAvg(
  days: NutritionDay[],
  endDate: string,
  window = WINDOW_DAYS,
): number | null {
  const start = addDays(endDate, -(window - 1))
  let sum = 0
  let n = 0
  for (const d of days) {
    if (d.date < start || d.date > endDate) continue
    if (d.weightKg === null || d.weightKg === undefined) continue
    sum += d.weightKg
    n++
  }
  return n === 0 ? null : sum / n
}

/** Moyenne d'un champ quelconque (kcal, pas, protéines) sur la même fenêtre. */
export function rollingAvgOf(
  days: NutritionDay[],
  endDate: string,
  field: 'kcal' | 'steps' | 'proteinG',
  window = WINDOW_DAYS,
): number | null {
  const start = addDays(endDate, -(window - 1))
  let sum = 0
  let n = 0
  for (const d of days) {
    if (d.date < start || d.date > endDate) continue
    const v = d[field]
    if (v === null || v === undefined) continue
    sum += v
    n++
  }
  return n === 0 ? null : sum / n
}

/** Différence entre la moyenne 7 j d'aujourd'hui et celle d'il y a 7 jours. */
export function trend7d(days: NutritionDay[], endDate: string): number | null {
  const now = rollingAvg(days, endDate)
  const before = rollingAvg(days, addDays(endDate, -WINDOW_DAYS))
  if (now === null || before === null) return null
  return now - before
}

export function trendLabel(trend: number, threshold = TREND_THRESHOLD): TrendLabel {
  if (trend <= -threshold) return 'baisse'
  if (trend >= threshold) return 'hausse'
  return 'stagne'
}

export interface Decision {
  /** −200, 0 ou +200 kcal. */
  kcal: number
  text: string
}

/**
 * Décision suggérée selon la phase et la tendance.
 *
 * Les règles fournies couvraient « baisse » et « stagne ». La colonne « hausse »
 * en est le prolongement : en Descente une hausse appelle la même correction
 * qu'une stagnation ; dans les phases où l'on cherche à reprendre du poids,
 * une hausse est le résultat visé, donc on ne touche à rien.
 */
export function decisionFor(phase: Phase, trend: TrendLabel): Decision {
  switch (phase) {
    case 'Descente':
      if (trend === 'baisse') return { kcal: 0, text: 'Ça descend. Ne touche à rien.' }
      return {
        kcal: -200,
        text:
          trend === 'stagne'
            ? 'Le poids stagne en descente. Retire 200 kcal.'
            : 'Le poids remonte en descente. Retire 200 kcal.',
      }

    case 'Pré-préparation':
    case 'Remontée':
      if (trend === 'baisse') return { kcal: 0, text: 'Ça descend encore. Ne touche à rien.' }
      if (trend === 'stagne') return { kcal: 200, text: 'Le poids stagne. Ajoute 200 kcal.' }
      return { kcal: 0, text: 'Le poids remonte, c’est le but. Ne touche à rien.' }

    case 'Reverse diet':
    case 'Prise de masse':
      if (trend === 'baisse') return { kcal: 200, text: 'Le poids baisse. Ajoute 200 kcal.' }
      if (trend === 'stagne') return { kcal: 0, text: 'Le poids tient. Ne touche à rien.' }
      return { kcal: 0, text: 'Ça monte comme prévu. Ne touche à rien.' }

    case 'Reset':
      return { kcal: 0, text: 'Phase de reset : aucune décision calorique.' }
  }
}

/** La phase active à une date donnée. */
export function phaseAt(spans: PhaseSpan[], date: string): Phase | null {
  let match: PhaseSpan | null = null
  for (const s of spans) {
    if (s.from > date) continue
    if (s.to && s.to < date) continue
    // La plus récente qui couvre la date l'emporte.
    if (!match || s.from > match.from) match = s
  }
  return match?.phase ?? null
}

export interface NutritionReading {
  avg7: number | null
  avgPrev7: number | null
  trend: number | null
  label: TrendLabel | null
  phase: Phase | null
  decision: Decision | null
  kcal7: number | null
  steps7: number | null
  protein7: number | null
  /** Nombre de jours pesés sur la fenêtre courante. */
  daysLogged: number
}

/** Le bloc complet affiché en haut de l'écran Nutrition. */
export function nutritionReading(
  days: NutritionDay[],
  spans: PhaseSpan[],
  date: string,
): NutritionReading {
  const avg7 = rollingAvg(days, date)
  const avgPrev7 = rollingAvg(days, addDays(date, -WINDOW_DAYS))
  const trend = avg7 !== null && avgPrev7 !== null ? avg7 - avgPrev7 : null
  const label = trend === null ? null : trendLabel(trend)
  const phase = phaseAt(spans, date)
  const start = addDays(date, -(WINDOW_DAYS - 1))

  return {
    avg7,
    avgPrev7,
    trend,
    label,
    phase,
    decision: phase && label ? decisionFor(phase, label) : null,
    kcal7: rollingAvgOf(days, date, 'kcal'),
    steps7: rollingAvgOf(days, date, 'steps'),
    protein7: rollingAvgOf(days, date, 'proteinG'),
    daysLogged: days.filter(
      (d) => d.date >= start && d.date <= date && d.weightKg !== null && d.weightKg !== undefined,
    ).length,
  }
}
