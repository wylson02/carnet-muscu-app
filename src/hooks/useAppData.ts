import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { allWeeklySets } from '../data/repo'
import type { Exercise, Muscle, Session, Settings, WeeklySet } from '../domain/types'
import { todayISO, weekIndexOf } from '../domain/week'

/**
 * Lectures réactives. `useLiveQuery` réexécute la requête à chaque écriture
 * Dexie : aucun état à synchroniser à la main, aucun rafraîchissement manuel.
 */

export function useSettings(): Settings | undefined {
  return useLiveQuery(() => db.settings.get('settings'), [])
}

export function useSessions(): Session[] | undefined {
  return useLiveQuery(async () => (await db.sessions.toArray()).sort((a, b) => a.order - b.order), [])
}

export function useMuscles(): Muscle[] | undefined {
  return useLiveQuery(async () => (await db.muscles.toArray()).sort((a, b) => a.order - b.order), [])
}

export function useExercises(sessionId?: string): Exercise[] | undefined {
  return useLiveQuery(async () => {
    if (sessionId) {
      const list = await db.exercises.where('sessionId').equals(sessionId).toArray()
      return list.sort((a, b) => a.order - b.order)
    }
    // Sans séance précisée, on trie dans l'ordre du programme : les séances
    // dans leur ordre, puis les exercices dans le leur. Un tri sur `order` seul
    // mélangerait les cinq séances, qui commencent toutes à 1.
    const [list, sessions] = await Promise.all([db.exercises.toArray(), db.sessions.toArray()])
    const rank = new Map(sessions.map((s) => [s.id, s.order]))
    return list.sort(
      (a, b) =>
        (rank.get(a.sessionId) ?? 99) - (rank.get(b.sessionId) ?? 99) || a.order - b.order,
    )
  }, [sessionId])
}

export function useWeeklySets(): WeeklySet[] | undefined {
  return useLiveQuery(() => allWeeklySets(), [])
}

export function useActiveWorkout() {
  return useLiveQuery(() => db.workouts.where('status').equals('en-cours').first(), [])
}

export function useWorkout(workoutId?: string) {
  return useLiveQuery(() => (workoutId ? db.workouts.get(workoutId) : undefined), [workoutId])
}

export function useWorkoutSets(workoutId?: string) {
  return useLiveQuery(async () => {
    if (!workoutId) return []
    const sets = await db.setLogs.where('workoutId').equals(workoutId).toArray()
    return sets.sort((a, b) => a.setIndex - b.setIndex || a.ts.localeCompare(b.ts))
  }, [workoutId])
}

export function useNutritionDays() {
  return useLiveQuery(async () => (await db.nutrition.toArray()).sort((a, b) => a.date.localeCompare(b.date)), [])
}

export function usePhases() {
  return useLiveQuery(async () => (await db.phases.toArray()).sort((a, b) => a.from.localeCompare(b.from)), [])
}

export function useWorkouts() {
  return useLiveQuery(
    async () => (await db.workouts.toArray()).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [],
  )
}

/** La semaine du programme dans laquelle on est aujourd'hui. */
export function useCurrentWeek(settings: Settings | undefined): number {
  return settings ? weekIndexOf(todayISO(), settings.startDate) : 1
}
