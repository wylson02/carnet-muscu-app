import Dexie, { type EntityTable } from 'dexie'
import type {
  Checkin,
  Exercise,
  Muscle,
  NutritionDay,
  PhaseSpan,
  Session,
  SetLog,
  Settings,
  Workout,
} from '../domain/types'
import { SEED_EXERCISES, SEED_MUSCLES, SEED_SESSIONS, SEED_SETTINGS } from './seed'

/**
 * La base locale. Rien ne sort de l'appareil : pas de compte, pas de serveur.
 * L'export/import JSON des réglages est le seul pont vers l'extérieur.
 */
export class CarnetDB extends Dexie {
  muscles!: EntityTable<Muscle, 'id'>
  sessions!: EntityTable<Session, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  setLogs!: EntityTable<SetLog, 'id'>
  nutrition!: EntityTable<NutritionDay, 'date'>
  phases!: EntityTable<PhaseSpan, 'id'>
  checkins!: EntityTable<Checkin, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('carnet-systeme-fluide')
    this.version(1).stores({
      muscles: 'id, order',
      sessions: 'id, order',
      exercises: 'id, sessionId, muscleId, order, barometer, [sessionId+order]',
      workouts: 'id, sessionId, date, weekIndex, status, [sessionId+status]',
      setLogs: 'id, workoutId, exerciseId, [workoutId+exerciseId], [exerciseId+ts], ts',
      nutrition: 'date',
      phases: 'id, from',
      checkins: 'id, date',
      settings: 'id',
    })
  }
}

export const db = new CarnetDB()

/**
 * Première ouverture : on installe le programme du classeur.
 * Idempotent — si des données existent déjà, on ne touche à rien.
 */
export async function ensureSeeded(): Promise<void> {
  const count = await db.sessions.count()
  if (count > 0) {
    // Les réglages peuvent manquer si un import partiel a eu lieu.
    const settings = await db.settings.get('settings')
    if (!settings) await db.settings.put(SEED_SETTINGS)
    return
  }

  await db.transaction('rw', db.muscles, db.sessions, db.exercises, db.settings, async () => {
    await db.muscles.bulkPut(SEED_MUSCLES)
    await db.sessions.bulkPut(SEED_SESSIONS)
    await db.exercises.bulkPut(SEED_EXERCISES)
    await db.settings.put(SEED_SETTINGS)
  })
}

/** Remet le programme d'origine sans toucher à l'historique. */
export async function resetProgramToSeed(): Promise<void> {
  await db.transaction('rw', db.muscles, db.sessions, db.exercises, async () => {
    await db.muscles.clear()
    await db.sessions.clear()
    await db.exercises.clear()
    await db.muscles.bulkPut(SEED_MUSCLES)
    await db.sessions.bulkPut(SEED_SESSIONS)
    await db.exercises.bulkPut(SEED_EXERCISES)
  })
}

/** Identifiant stable, sans dépendance externe. */
export function newId(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rnd}`
}
