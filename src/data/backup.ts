import { db } from './db'
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

/**
 * Export / import JSON.
 *
 * C'est la seule porte de sortie des données — pas de compte, pas de serveur.
 * Le fichier contient TOUT : programme, historique, nutrition, réglages.
 * Garde-le quelque part : c'est ta seule sauvegarde.
 */

export const BACKUP_FORMAT = 'carnet-systeme-fluide'
export const BACKUP_VERSION = 1

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  muscles: Muscle[]
  sessions: Session[]
  exercises: Exercise[]
  workouts: Workout[]
  setLogs: SetLog[]
  nutrition: NutritionDay[]
  phases: PhaseSpan[]
  checkins: Checkin[]
  settings: Settings[]
}

export async function exportBackup(): Promise<Backup> {
  const [muscles, sessions, exercises, workouts, setLogs, nutrition, phases, checkins, settings] =
    await Promise.all([
      db.muscles.toArray(),
      db.sessions.toArray(),
      db.exercises.toArray(),
      db.workouts.toArray(),
      db.setLogs.toArray(),
      db.nutrition.toArray(),
      db.phases.toArray(),
      db.checkins.toArray(),
      db.settings.toArray(),
    ])

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    muscles,
    sessions,
    exercises,
    workouts,
    setLogs,
    nutrition,
    phases,
    checkins,
    settings,
  }
}

/** Nom de fichier daté : `carnet-2026-09-07.json`. */
export function backupFilename(now = new Date()): string {
  return `carnet-${now.toISOString().slice(0, 10)}.json`
}

export async function downloadBackup(): Promise<void> {
  const backup = await exportBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFilename()
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Laisser le temps au téléchargement de démarrer avant de libérer l'URL.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export class BackupError extends Error {}

function expectArray(value: unknown, name: string): unknown[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new BackupError(`Champ « ${name} » invalide dans le fichier.`)
  return value
}

export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError("Ce fichier n'est pas du JSON valide.")
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new BackupError('Fichier vide ou illisible.')
  }

  const obj = raw as Record<string, unknown>
  if (obj.format !== BACKUP_FORMAT) {
    throw new BackupError("Ce fichier ne vient pas du Carnet Système Fluide.")
  }
  if (typeof obj.version !== 'number' || obj.version > BACKUP_VERSION) {
    throw new BackupError(
      `Fichier créé par une version plus récente de l'app (v${String(obj.version)}). Mets l'app à jour.`,
    )
  }

  return {
    format: BACKUP_FORMAT,
    version: obj.version,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    muscles: expectArray(obj.muscles, 'muscles') as Muscle[],
    sessions: expectArray(obj.sessions, 'sessions') as Session[],
    exercises: expectArray(obj.exercises, 'exercises') as Exercise[],
    workouts: expectArray(obj.workouts, 'workouts') as Workout[],
    setLogs: expectArray(obj.setLogs, 'setLogs') as SetLog[],
    nutrition: expectArray(obj.nutrition, 'nutrition') as NutritionDay[],
    phases: expectArray(obj.phases, 'phases') as PhaseSpan[],
    checkins: expectArray(obj.checkins, 'checkins') as Checkin[],
    settings: expectArray(obj.settings, 'settings') as Settings[],
  }
}

export interface ImportSummary {
  exercices: number
  seances: number
  series: number
  joursNutrition: number
  bilans: number
}

/**
 * Remplace intégralement le contenu de la base par celui du fichier.
 * Tout ou rien : une transaction unique, donc un import qui échoue ne laisse
 * pas la base à moitié écrasée.
 */
export async function importBackup(backup: Backup): Promise<ImportSummary> {
  await db.transaction(
    'rw',
    [db.muscles, db.sessions, db.exercises, db.workouts, db.setLogs, db.nutrition, db.phases, db.checkins, db.settings],
    async () => {
      await Promise.all([
        db.muscles.clear(),
        db.sessions.clear(),
        db.exercises.clear(),
        db.workouts.clear(),
        db.setLogs.clear(),
        db.nutrition.clear(),
        db.phases.clear(),
        db.checkins.clear(),
        db.settings.clear(),
      ])
      await Promise.all([
        db.muscles.bulkPut(backup.muscles),
        db.sessions.bulkPut(backup.sessions),
        db.exercises.bulkPut(backup.exercises),
        db.workouts.bulkPut(backup.workouts),
        db.setLogs.bulkPut(backup.setLogs),
        db.nutrition.bulkPut(backup.nutrition),
        db.phases.bulkPut(backup.phases),
        db.checkins.bulkPut(backup.checkins),
        db.settings.bulkPut(backup.settings),
      ])
    },
  )

  return {
    exercices: backup.exercises.length,
    seances: backup.workouts.length,
    series: backup.setLogs.length,
    joursNutrition: backup.nutrition.length,
    bilans: backup.checkins.length,
  }
}
