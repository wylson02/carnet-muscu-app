import { describe, expect, it } from 'vitest'
import { e1rm } from './e1rm'
import { weekIndexOf, weekRange, addDays, formatAgo } from './week'
import { exerciseSummary, recordBefore, weeklyBests } from './progression'
import { volumeStatus, weeklyVolume } from './volume'
import { barometerVerdict } from './barometers'
import { decisionFor, nutritionReading, trendLabel } from './nutrition'
import { prefillForSet } from './prefill'
import { groupIntoBlocks, restSecFor } from './blocks'
import { SEED_EXERCISES, SEED_MUSCLES, SEED_SETTINGS, SEED_START_DATE } from '../data/seed'
import type { Exercise, NutritionDay, SetLog, WeeklySet } from './types'

/** Fabrique une série enrichie, pour ne pas répéter dix champs à chaque test. */
function ws(weekIndex: number, exerciseId: string, kg: number, reps: number, rir: number, muscleId = 'epaules'): WeeklySet {
  return {
    weekIndex,
    exerciseId,
    muscleId,
    kg,
    reps,
    rir,
    e1rm: e1rm(kg, reps, rir),
    status: 'validee',
    date: '2026-08-24',
  }
}

// ── Le programme du classeur ────────────────────────────────────────

describe('programme importé du classeur', () => {
  it('compte 5 séances, 35 exercices et 101 séries', () => {
    expect(new Set(SEED_EXERCISES.map((e) => e.sessionId)).size).toBe(5)
    expect(SEED_EXERCISES).toHaveLength(35)
    expect(SEED_EXERCISES.reduce((n, e) => n + e.targetSets, 0)).toBe(101)
  })

  it('respecte le nombre de séries de chaque séance', () => {
    const per = (id: string) =>
      SEED_EXERCISES.filter((e) => e.sessionId === id).reduce((n, e) => n + e.targetSets, 0)
    expect(per('push')).toBe(19)
    expect(per('pull')).toBe(21)
    expect(per('lower')).toBe(20)
    expect(per('upper')).toBe(20)
    expect(per('chaine-post')).toBe(21)
  })

  it('les séries programmées tombent exactement sur les cibles de volume', () => {
    for (const muscle of SEED_MUSCLES) {
      const programmed = SEED_EXERCISES.filter((e) => e.muscleId === muscle.id).reduce(
        (n, e) => n + e.targetSets,
        0,
      )
      expect(programmed, muscle.name).toBe(muscle.targetSets)
    }
  })

  it('marque exactement deux baromètres, dont la latérale câble de Push', () => {
    const baro = SEED_EXERCISES.filter((e) => e.barometer)
    expect(baro).toHaveLength(2)
    expect(baro.find((e) => e.barometer === 1)?.sessionId).toBe('push')
    expect(baro.find((e) => e.barometer === 2)?.name).toBe('Traction pronation')
  })

  it('ne compte la traction que comme poids de corps + lest', () => {
    const bw = SEED_EXERCISES.filter((e) => e.loadMode === 'poids-corps')
    expect(bw.map((e) => e.name)).toEqual(['Traction pronation'])
  })
})

// ── e1RM ────────────────────────────────────────────────────────────

describe('e1RM', () => {
  it('applique Epley ajustée du RIR', () => {
    // 15 kg × 12 à 1 RIR → 15 × (1 + 13/30)
    expect(e1rm(15, 12, 1)).toBeCloseTo(15 * (1 + 13 / 30), 10)
    expect(e1rm(100, 1, 0)).toBeCloseTo(100 * (1 + 1 / 30), 10)
  })

  it('rend 0 quand la série est vide', () => {
    expect(e1rm(0, 12, 1)).toBe(0)
    expect(e1rm(20, 0, 1)).toBe(0)
    expect(e1rm(Number.NaN, 10, 1)).toBe(0)
  })

  it('rend deux séries différentes comparables', () => {
    // 10 reps à 2 RIR vaut la même chose que 12 reps à 0 RIR.
    expect(e1rm(50, 10, 2)).toBeCloseTo(e1rm(50, 12, 0), 10)
  })
})

// ── Semaines ────────────────────────────────────────────────────────

describe('semaines', () => {
  it('numérote depuis le lundi de départ', () => {
    expect(weekIndexOf('2026-08-24', SEED_START_DATE)).toBe(1)
    expect(weekIndexOf('2026-08-30', SEED_START_DATE)).toBe(1) // dimanche de S1
    expect(weekIndexOf('2026-08-31', SEED_START_DATE)).toBe(2) // lundi de S2
    expect(weekIndexOf('2026-09-07', SEED_START_DATE)).toBe(3)
  })

  it('rend le lundi et le dimanche de la semaine', () => {
    expect(weekRange(3, SEED_START_DATE)).toEqual({ from: '2026-09-07', to: '2026-09-13' })
  })

  it('ne bascule pas de semaine à cause du fuseau', () => {
    // Une séance du dimanche soir reste dans sa semaine.
    expect(weekIndexOf('2026-08-30', SEED_START_DATE)).toBe(
      weekIndexOf('2026-08-24', SEED_START_DATE),
    )
  })

  it('décale correctement les dates', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('formate les écarts en clair', () => {
    expect(formatAgo('2026-09-07', '2026-09-07')).toBe("Aujourd'hui")
    expect(formatAgo('2026-09-06', '2026-09-07')).toBe('Hier')
    expect(formatAgo('2026-09-03', '2026-09-07')).toBe('Il y a 4 j')
  })
})

// ── Progression ─────────────────────────────────────────────────────

describe('progression', () => {
  const sets = [
    ws(1, 'push-1', 14, 12, 1),
    ws(1, 'push-1', 14, 10, 2),
    ws(2, 'push-1', 15, 12, 1),
    ws(3, 'push-1', 14, 13, 1),
  ]

  it('prend le max des séries comme meilleur e1RM de la semaine', () => {
    const weeks = weeklyBests(sets)
    expect(weeks[0].best).toBeCloseTo(e1rm(14, 12, 1), 10)
  })

  it('calcule Δ vs le record de toutes les semaines précédentes', () => {
    const weeks = weeklyBests(sets)
    expect(weeks[0].delta).toBeNull() // pas de semaine avant la première
    expect(weeks[1].delta).toBeGreaterThan(0) // 15 kg bat 14 kg
    expect(weeks[2].delta).toBeLessThan(0) // régression en S3
  })

  it('compare au record, pas à la semaine juste avant', () => {
    // S3 régresse mais reste au-dessus de S1 : le Δ doit rester négatif,
    // car le record est celui de S2.
    const weeks = weeklyBests(sets)
    expect(weeks[2].best).toBeGreaterThan(weeks[0].best)
    expect(weeks[2].delta).toBeLessThan(0)
  })

  it('ignore la semaine en cours pour le record à battre', () => {
    expect(recordBefore(sets, 1)).toBeNull()
    expect(recordBefore(sets, 3)).toBeCloseTo(e1rm(15, 12, 1), 10)
  })

  it('résume la progression depuis la première semaine', () => {
    const summary = exerciseSummary(sets, 'push-1')
    expect(summary.firstE1rm).toBeCloseTo(e1rm(14, 12, 1), 10)
    expect(summary.bestE1rm).toBeCloseTo(e1rm(15, 12, 1), 10)
    expect(summary.deltaPct).toBeGreaterThan(0)
  })
})

// ── Volume ──────────────────────────────────────────────────────────

describe('volume', () => {
  it('est vert dans ±20 % de la cible', () => {
    expect(volumeStatus(21, 21)).toBe('ok')
    expect(volumeStatus(25, 21)).toBe('ok') // +19 %
    expect(volumeStatus(17, 21)).toBe('ok') // −19 %
  })

  it('est rouge au-dessus de +20 %', () => {
    expect(volumeStatus(26, 21)).toBe('over') // +24 %
  })

  it('est ambre sous −20 %', () => {
    expect(volumeStatus(16, 21)).toBe('under')
    expect(volumeStatus(0, 21)).toBe('under')
  })

  it('compte les séries validées de la semaine, par muscle', () => {
    const sets = [
      ws(1, 'push-1', 14, 12, 1, 'epaules'),
      ws(1, 'push-6', 10, 12, 1, 'epaules'),
      ws(2, 'push-1', 14, 12, 1, 'epaules'),
      { ...ws(1, 'push-7', 20, 10, 1, 'triceps'), status: 'sautee' as const },
    ]
    const rows = weeklyVolume(sets, SEED_MUSCLES, 1)
    expect(rows.find((r) => r.muscle.id === 'epaules')?.done).toBe(2)
    expect(rows.find((r) => r.muscle.id === 'triceps')?.done).toBe(0) // série sautée
  })
})

// ── Baromètres ──────────────────────────────────────────────────────

describe('baromètres', () => {
  const up = new Map([[1, 20], [2, 21], [3, 22], [4, 23], [5, 24], [6, 25]])
  const flat = new Map([[1, 20], [2, 21], [3, 22], [4, 22], [5, 22], [6, 22]])

  it("annonce la phase d'installation avant la semaine 6", () => {
    expect(barometerVerdict(up, up, 5).verdict).toBe('installation')
  })

  it('dit OK quand les deux montent', () => {
    expect(barometerVerdict(up, up, 6).verdict).toBe('ok')
  })

  it('dit Vigilance quand un seul plafonne', () => {
    expect(barometerVerdict(flat, up, 6).verdict).toBe('vigilance')
  })

  it('dit STOP quand les deux plafonnent', () => {
    expect(barometerVerdict(flat, flat, 6).verdict).toBe('stop')
  })

  it('compare bien max(S4-S6) à max(S1-S3)', () => {
    const reading = barometerVerdict(flat, up, 6)
    expect(reading.indicator1.recent).toBe(22) // max S4..S6
    expect(reading.indicator1.prior).toBe(22) // max S1..S3
    expect(reading.indicator1.flat).toBe(true)
  })

  it('ne conclut pas STOP sur des fenêtres vides', () => {
    expect(barometerVerdict(new Map(), new Map(), 8).verdict).toBe('insuffisant')
  })
})

// ── Nutrition ───────────────────────────────────────────────────────

describe('nutrition', () => {
  it('applique le seuil de ±0,15 kg', () => {
    expect(trendLabel(-0.2)).toBe('baisse')
    expect(trendLabel(-0.15)).toBe('baisse')
    expect(trendLabel(-0.1)).toBe('stagne')
    expect(trendLabel(0.1)).toBe('stagne')
    expect(trendLabel(0.2)).toBe('hausse')
  })

  it('suit les règles de décision par phase', () => {
    expect(decisionFor('Descente', 'baisse').kcal).toBe(0)
    expect(decisionFor('Descente', 'stagne').kcal).toBe(-200)

    expect(decisionFor('Pré-préparation', 'baisse').kcal).toBe(0)
    expect(decisionFor('Pré-préparation', 'stagne').kcal).toBe(200)
    expect(decisionFor('Remontée', 'stagne').kcal).toBe(200)

    expect(decisionFor('Reverse diet', 'baisse').kcal).toBe(200)
    expect(decisionFor('Reverse diet', 'stagne').kcal).toBe(0)
    expect(decisionFor('Prise de masse', 'baisse').kcal).toBe(200)
    expect(decisionFor('Prise de masse', 'stagne').kcal).toBe(0)
  })

  it('traite la hausse comme convenu', () => {
    expect(decisionFor('Descente', 'hausse').kcal).toBe(-200)
    expect(decisionFor('Remontée', 'hausse').kcal).toBe(0)
    expect(decisionFor('Prise de masse', 'hausse').kcal).toBe(0)
  })

  it('calcule la tendance entre deux moyennes 7 j', () => {
    const days: NutritionDay[] = []
    // 14 jours : 80 kg la première semaine, 79,5 la seconde.
    for (let i = 0; i < 7; i++) days.push({ date: addDays('2026-09-01', i), weightKg: 80 })
    for (let i = 7; i < 14; i++) days.push({ date: addDays('2026-09-01', i), weightKg: 79.5 })

    const reading = nutritionReading(days, [{ id: 'p', from: '2026-09-01', to: null, phase: 'Descente' }], '2026-09-14')
    expect(reading.avg7).toBeCloseTo(79.5, 5)
    expect(reading.trend).toBeCloseTo(-0.5, 5)
    expect(reading.label).toBe('baisse')
    expect(reading.decision?.kcal).toBe(0) // ça descend en Descente : rien à faire
  })

  it('ne décide rien sans données', () => {
    const reading = nutritionReading([], [], '2026-09-14')
    expect(reading.trend).toBeNull()
    expect(reading.decision).toBeNull()
  })
})

// ── Pré-remplissage ─────────────────────────────────────────────────

describe('pré-remplissage', () => {
  const exercise = SEED_EXERCISES.find((e) => e.id === 'push-1')!
  const traction = SEED_EXERCISES.find((e) => e.id === 'cp-2')!

  const set = (setIndex: number, kg: number, reps: number, rir: number): SetLog => ({
    id: `s${setIndex}`,
    workoutId: 'w1',
    exerciseId: exercise.id,
    setIndex,
    kg,
    reps,
    rir,
    e1rm: e1rm(kg, reps, rir),
    status: 'validee',
    isExtra: false,
    ts: '2026-08-31T18:00:00.000Z',
  })

  it('reprend la MÊME série de la séance précédente', () => {
    const p = prefillForSet({
      exercise,
      setIndex: 2,
      previousWorkoutSets: [set(1, 14, 13, 1), set(2, 14, 12, 1), set(3, 13, 12, 2)],
      currentWorkoutSets: [],
      bodyWeightKg: 78,
    })
    expect(p.source).toBe('semaine-derniere')
    expect(p).toMatchObject({ kg: 14, reps: 12, rir: 1 })
  })

  it('retombe sur la série précédente du soir pour une série ajoutée', () => {
    const p = prefillForSet({
      exercise,
      setIndex: 4,
      previousWorkoutSets: [set(1, 14, 13, 1)],
      currentWorkoutSets: [set(1, 15, 12, 1), set(2, 15, 11, 1), set(3, 15, 10, 0)],
      bodyWeightKg: 78,
    })
    expect(p.source).toBe('serie-precedente')
    expect(p).toMatchObject({ kg: 15, reps: 10, rir: 0 })
  })

  it('part du poids de corps sur la traction quand rien n’est connu', () => {
    const p = prefillForSet({
      exercise: traction,
      setIndex: 1,
      previousWorkoutSets: [],
      currentWorkoutSets: [],
      bodyWeightKg: 78,
    })
    expect(p.source).toBe('defaut')
    expect(p.kg).toBe(78)
  })

  it('part de zéro sur un exercice à charge externe', () => {
    const p = prefillForSet({
      exercise,
      setIndex: 1,
      previousWorkoutSets: [],
      currentWorkoutSets: [],
      bodyWeightKg: 78,
    })
    expect(p.kg).toBe(0)
    expect(p.reference).toBeNull()
  })
})

// ── Supersets et repos ──────────────────────────────────────────────

describe('blocs et repos', () => {
  const upper = SEED_EXERCISES.filter((e) => e.sessionId === 'upper')
  const pull = SEED_EXERCISES.filter((e) => e.sessionId === 'pull')

  it('regroupe [SS1] en un seul bloc', () => {
    const blocks = groupIntoBlocks(upper)
    const ss = blocks.find((b) => b.kind === 'superset')
    expect(ss?.exercises.map((e) => e.id)).toEqual(['upper-5', 'upper-7'])
    // 7 exercices, dont 2 fusionnés → 6 blocs.
    expect(blocks).toHaveLength(6)
  })

  it('place le bloc à l’emplacement de son premier membre', () => {
    const blocks = groupIntoBlocks(upper)
    expect(blocks.map((b) => b.key)).toEqual([
      'upper-1', 'upper-2', 'upper-3', 'upper-4', 'ss-SS1', 'upper-6',
    ])
  })

  it('regroupe [BS1] dans Pull', () => {
    const blocks = groupIntoBlocks(pull)
    const bs = blocks.find((b) => b.kind === 'superset')
    expect(bs?.exercises.map((e) => e.id)).toEqual(['pull-6', 'pull-7'])
  })

  it('ignore les exercices archivés', () => {
    const archived: Exercise[] = upper.map((e) =>
      e.id === 'upper-6' ? { ...e, archived: true } : e,
    )
    expect(groupIntoBlocks(archived)).toHaveLength(5)
  })

  it('déduit le repos du type d’exercice', () => {
    const blocks = groupIntoBlocks(upper)
    const iso = blocks.find((b) => b.key === 'upper-1')!
    const poly = blocks.find((b) => b.key === 'upper-3')!
    expect(restSecFor(iso, SEED_SETTINGS)).toBe(90)
    expect(restSecFor(poly, SEED_SETTINGS)).toBe(180)
  })

  it('prend le repos le plus long sur un superset', () => {
    const blocks = groupIntoBlocks(upper)
    const ss = blocks.find((b) => b.kind === 'superset')!
    expect(restSecFor(ss, SEED_SETTINGS)).toBe(90) // les deux membres sont en isolation
  })

  it('respecte un repos forcé sur l’exercice', () => {
    const custom = upper.map((e) => (e.id === 'upper-1' ? { ...e, restSec: 45 } : e))
    const block = groupIntoBlocks(custom).find((b) => b.key === 'upper-1')!
    expect(restSecFor(block, SEED_SETTINGS)).toBe(45)
  })
})
