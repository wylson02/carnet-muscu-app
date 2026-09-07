import { db, newId } from './db'
import type {
  Exercise,
  NutritionDay,
  Phase,
  SetLog,
  SetStatus,
  Settings,
  WeeklySet,
  Workout,
} from '../domain/types'
import { e1rm } from '../domain/e1rm'
import { todayISO, weekIndexOf } from '../domain/week'

/**
 * Accès aux données. Toute mutation passe par ici ; les composants ne parlent
 * jamais à Dexie directement. C'est le seul fichier à réécrire le jour où la
 * donnée vient d'un serveur.
 */

// ── Réglages ────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('settings')
  if (!s) throw new Error('Réglages absents : la base n’a pas été initialisée.')
  return s
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.update('settings', patch)
}

// ── Séances ─────────────────────────────────────────────────────────

/** La séance ouverte, s'il y en a une. Une seule à la fois. */
export async function getActiveWorkout(): Promise<Workout | undefined> {
  return db.workouts.where('status').equals('en-cours').first()
}

export async function startWorkout(sessionId: string): Promise<Workout> {
  const settings = await getSettings()
  const date = todayISO()

  // Une seule séance ouverte à la fois : on ferme ce qui traîne.
  const stale = await db.workouts.where('status').equals('en-cours').toArray()
  for (const w of stale) {
    const sets = await db.setLogs.where('workoutId').equals(w.id).count()
    await db.workouts.update(w.id, {
      status: sets > 0 ? 'terminee' : 'abandonnee',
      endedAt: new Date().toISOString(),
    })
  }

  const workout: Workout = {
    id: newId('w'),
    sessionId,
    date,
    weekIndex: weekIndexOf(date, settings.startDate),
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: 'en-cours',
  }
  await db.workouts.add(workout)
  return workout
}

export async function finishWorkout(workoutId: string): Promise<void> {
  const sets = await db.setLogs.where('workoutId').equals(workoutId).count()
  await db.workouts.update(workoutId, {
    status: sets > 0 ? 'terminee' : 'abandonnee',
    endedAt: new Date().toISOString(),
  })
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.setLogs, async () => {
    await db.setLogs.where('workoutId').equals(workoutId).delete()
    await db.workouts.delete(workoutId)
  })
}

/** La dernière séance terminée d'un type donné. */
export async function lastFinishedWorkout(
  sessionId: string,
  excludeWorkoutId?: string,
): Promise<Workout | undefined> {
  const list = await db.workouts.where('sessionId').equals(sessionId).toArray()
  return list
    .filter((w) => w.status === 'terminee' && w.id !== excludeWorkoutId)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .at(-1)
}

/** Date de la dernière fois, par séance — pour l'accueil. */
export async function lastDateBySession(): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const workouts = await db.workouts.toArray()
  for (const w of workouts) {
    if (w.status !== 'terminee') continue
    const prev = out.get(w.sessionId)
    if (!prev || w.date > prev) out.set(w.sessionId, w.date)
  }
  return out
}

// ── Séries ──────────────────────────────────────────────────────────

export interface LogSetInput {
  workoutId: string
  exercise: Exercise
  setIndex: number
  kg: number
  reps: number
  rir: number
  status?: SetStatus
  isExtra?: boolean
  bodyWeightKg?: number
}

/** Écrit une série. L'e1RM est calculé ici, une fois, et stocké. */
export async function logSet(input: LogSetInput): Promise<SetLog> {
  const row: SetLog = {
    id: newId('s'),
    workoutId: input.workoutId,
    exerciseId: input.exercise.id,
    setIndex: input.setIndex,
    kg: input.kg,
    reps: input.reps,
    rir: input.rir,
    e1rm: e1rm(input.kg, input.reps, input.rir),
    status: input.status ?? 'validee',
    isExtra: input.isExtra ?? false,
    bodyWeightKg:
      input.exercise.loadMode === 'poids-corps' ? (input.bodyWeightKg ?? null) : null,
    ts: new Date().toISOString(),
  }
  await db.setLogs.add(row)
  return row
}

/** Annule la dernière série écrite sur un exercice, pour cette séance. */
export async function undoLastSet(workoutId: string, exerciseId: string): Promise<void> {
  const sets = await db.setLogs
    .where('[workoutId+exerciseId]')
    .equals([workoutId, exerciseId])
    .toArray()
  const last = sets.sort((a, b) => a.ts.localeCompare(b.ts)).at(-1)
  if (last) await db.setLogs.delete(last.id)
}

/** Séries d'une séance, pour un exercice. */
export async function setsOf(workoutId: string, exerciseId: string): Promise<SetLog[]> {
  const sets = await db.setLogs
    .where('[workoutId+exerciseId]')
    .equals([workoutId, exerciseId])
    .toArray()
  return sets.sort((a, b) => a.setIndex - b.setIndex || a.ts.localeCompare(b.ts))
}

/** Dernière série validée connue sur un exercice, toutes séances confondues. */
export async function lastKnownSet(exerciseId: string): Promise<SetLog | undefined> {
  const sets = await db.setLogs.where('exerciseId').equals(exerciseId).toArray()
  return sets
    .filter((s) => s.status === 'validee')
    .sort((a, b) => a.ts.localeCompare(b.ts))
    .at(-1)
}

// ── Vue à plat pour les calculs ──────────────────────────────────────

/**
 * Toutes les séries, enrichies de leur semaine et de leur muscle.
 * C'est ce que consomment Progression, Volume et Baromètres.
 */
export async function allWeeklySets(): Promise<WeeklySet[]> {
  const [sets, workouts, exercises] = await Promise.all([
    db.setLogs.toArray(),
    db.workouts.toArray(),
    db.exercises.toArray(),
  ])
  const wById = new Map(workouts.map((w) => [w.id, w]))
  const eById = new Map(exercises.map((e) => [e.id, e]))

  const out: WeeklySet[] = []
  for (const s of sets) {
    const w = wById.get(s.workoutId)
    const e = eById.get(s.exerciseId)
    if (!w || !e) continue // exercice ou séance supprimés
    out.push({
      weekIndex: w.weekIndex,
      exerciseId: s.exerciseId,
      muscleId: e.muscleId,
      kg: s.kg,
      reps: s.reps,
      rir: s.rir,
      e1rm: s.e1rm,
      status: s.status,
      date: w.date,
    })
  }
  return out
}

// ── Programme ───────────────────────────────────────────────────────

export async function addExercise(sessionId: string, patch: Partial<Exercise> = {}): Promise<string> {
  const existing = await db.exercises.where('sessionId').equals(sessionId).toArray()
  const order = Math.max(0, ...existing.map((e) => e.order)) + 1
  const settings = await getSettings()
  const id = newId('ex')
  await db.exercises.add({
    id,
    sessionId,
    order,
    name: 'Nouvel exercice',
    muscleId: patch.muscleId ?? 'epaules',
    targetSets: 3,
    note: null,
    supersetTag: null,
    kind: 'iso',
    restSec: null,
    loadMode: 'externe',
    incrementKg: settings.defaultIncrementKg,
    barometer: null,
    archived: false,
    ...patch,
  })
  return id
}

export async function updateExercise(id: string, patch: Partial<Exercise>): Promise<void> {
  await db.exercises.update(id, patch)
}

/**
 * Retirer un exercice du programme. On archive au lieu de supprimer dès qu'il
 * a un historique : les courbes passées restent lisibles.
 */
export async function removeExercise(id: string): Promise<'archive' | 'supprime'> {
  const logged = await db.setLogs.where('exerciseId').equals(id).count()
  if (logged > 0) {
    await db.exercises.update(id, { archived: true })
    return 'archive'
  }
  await db.exercises.delete(id)
  return 'supprime'
}

export async function restoreExercise(id: string): Promise<void> {
  await db.exercises.update(id, { archived: false })
}

/** Déplace un exercice d'un cran dans sa séance. */
export async function moveExercise(id: string, direction: -1 | 1): Promise<void> {
  const ex = await db.exercises.get(id)
  if (!ex) return
  const siblings = (await db.exercises.where('sessionId').equals(ex.sessionId).toArray())
    .filter((e) => !e.archived)
    .sort((a, b) => a.order - b.order)

  const i = siblings.findIndex((e) => e.id === id)
  const j = i + direction
  if (i < 0 || j < 0 || j >= siblings.length) return

  // On réécrit tout l'ordre : plus sûr qu'un échange de deux valeurs qui
  // pourraient être égales après un import.
  const reordered = [...siblings]
  ;[reordered[i], reordered[j]] = [reordered[j], reordered[i]]
  await db.transaction('rw', db.exercises, async () => {
    for (let k = 0; k < reordered.length; k++) {
      await db.exercises.update(reordered[k].id, { order: k + 1 })
    }
  })
}

export async function updateMuscleTarget(id: string, targetSets: number): Promise<void> {
  await db.muscles.update(id, { targetSets })
}

// ── Nutrition ───────────────────────────────────────────────────────

export async function upsertNutrition(day: NutritionDay): Promise<void> {
  const existing = await db.nutrition.get(day.date)
  await db.nutrition.put({ ...existing, ...day })
}

export async function setPhaseFrom(phase: Phase, from: string): Promise<void> {
  const spans = await db.phases.toArray()
  // On clôt la phase en cours la veille du changement.
  const open = spans.filter((s) => !s.to).sort((a, b) => a.from.localeCompare(b.from)).at(-1)
  if (open) {
    if (open.from === from) {
      await db.phases.update(open.id, { phase })
      return
    }
    const d = new Date(from)
    d.setDate(d.getDate() - 1)
    await db.phases.update(open.id, { to: d.toISOString().slice(0, 10) })
  }
  await db.phases.add({ id: newId('ph'), from, to: null, phase })
}
