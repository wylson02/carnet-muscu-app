import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  useActiveWorkout,
  useCurrentWeek,
  useExercises,
  useSessions,
  useSettings,
} from '../hooks/useAppData'
import { lastDateBySession, startWorkout } from '../data/repo'
import { db } from '../data/db'
import { formatAgo, formatDateShort, weekRange } from '../domain/week'
import { groupIntoBlocks } from '../domain/blocks'
import type { Session } from '../domain/types'
import { Button, Chip, Screen, ScreenHeader, cx } from '../ui/primitives'

/**
 * Accueil : les 5 séances, la date de la dernière fois, un bouton Démarrer.
 * Si une séance est ouverte, elle passe au-dessus de tout — on ne perd jamais
 * une saisie en fermant l'app.
 */
export function Home() {
  const navigate = useNavigate()
  const settings = useSettings()
  const sessions = useSessions()
  const exercises = useExercises()
  const active = useActiveWorkout()
  const lastDates = useLiveQuery(() => lastDateBySession(), [])
  const week = useCurrentWeek(settings)
  const [starting, setStarting] = useState<string | null>(null)

  const activeSession = sessions?.find((s) => s.id === active?.sessionId)

  if (!settings || !sessions || !exercises) return null

  const range = weekRange(week, settings.startDate)

  const onStart = async (session: Session) => {
    if (starting) return
    setStarting(session.id)
    try {
      const workout = await startWorkout(session.id)
      navigate(`/seance/${workout.id}`)
    } finally {
      setStarting(null)
    }
  }

  return (
    <Screen>
      <ScreenHeader
        title="Système Fluide"
        sub={`SEMAINE ${week} · ${formatDateShort(range.from).toUpperCase()} – ${formatDateShort(range.to).toUpperCase()}`}
      />

      {active && activeSession ? (
        <button
          onClick={() => navigate(`/seance/${active.id}`)}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-record/45 bg-record/10 px-3.5 py-3 text-left"
        >
          <span className="h-2 w-2 flex-none rounded-full bg-record" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold">{activeSession.name} en cours</span>
            <ActiveProgress workoutId={active.id} sessionId={active.sessionId} />
          </span>
          <span className="flex-none font-mono text-[11px] tracking-[0.06em] text-record">REPRENDRE ›</span>
        </button>
      ) : null}

      <ul className="space-y-2.5">
        {sessions.map((session) => {
          const own = exercises.filter((e) => e.sessionId === session.id && !e.archived)
          const sets = own.reduce((n, e) => n + e.targetSets, 0)
          const baro = own.some((e) => e.barometer)
          const last = lastDates?.get(session.id)
          const isActive = active?.sessionId === session.id

          return (
            <li key={session.id} className="card flex items-center gap-3 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[17px] font-semibold tracking-tight">{session.name}</span>
                  {baro ? <Chip tone="saisie">Baromètre</Chip> : null}
                </div>
                <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-faint">
                  {own.length} exos · {sets} séries
                </div>
                <div
                  className={cx(
                    'num mt-1.5 font-mono text-[11.5px]',
                    isActive ? 'text-record' : last ? 'text-ink-dim' : 'text-saisie',
                  )}
                >
                  {isActive
                    ? 'En cours'
                    : last
                      ? `${formatAgo(last)} · ${formatDateShort(last)}`
                      : 'Jamais faite'}
                </div>
              </div>

              <Button
                variant={isActive ? 'neutral' : 'primary'}
                disabled={starting !== null}
                onClick={() => (isActive ? navigate(`/seance/${active!.id}`) : void onStart(session))}
                className="flex-none"
              >
                {isActive ? 'Reprendre' : starting === session.id ? '…' : 'Démarrer'}
              </Button>
            </li>
          )
        })}
      </ul>

      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
        {exercises.filter((e) => !e.archived).length} exercices ·{' '}
        {exercises.filter((e) => !e.archived).reduce((n, e) => n + e.targetSets, 0)} séries / semaine
      </p>
    </Screen>
  )
}

/** « Exercice 3 / 7 · commencée à 18:04 » sous le bandeau de reprise. */
function ActiveProgress({ workoutId, sessionId }: { workoutId: string; sessionId: string }) {
  const exercises = useExercises(sessionId)
  const [startedLabel, setStartedLabel] = useState('')

  const done = useLiveQuery(async () => {
    const sets = await db.setLogs.where('workoutId').equals(workoutId).toArray()
    return new Set(sets.map((s) => s.exerciseId)).size
  }, [workoutId])

  useEffect(() => {
    void db.workouts.get(workoutId).then((w) => {
      if (!w) return
      const d = new Date(w.startedAt)
      setStartedLabel(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      )
    })
  }, [workoutId])

  const total = exercises ? groupIntoBlocks(exercises).length : 0

  return (
    <span className="mt-0.5 block font-mono text-[11px] text-ink-dim">
      {total > 0 ? `Bloc ${Math.min((done ?? 0) + 1, total)} / ${total}` : '…'}
      {startedLabel ? ` · commencée à ${startedLabel}` : ''}
    </span>
  )
}
