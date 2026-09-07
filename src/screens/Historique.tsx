import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { deleteWorkout } from '../data/repo'
import { useExercises, useSessions, useWorkouts } from '../hooks/useAppData'
import { formatKg } from '../domain/prefill'
import { formatDayShort } from '../domain/week'
import { Button, Chip, EmptyState, Screen, ScreenHeader, cx } from '../ui/primitives'

/** Toutes les séances passées, avec le détail de leurs séries. */
export function Historique() {
  const workouts = useWorkouts()
  const sessions = useSessions()
  const exercises = useExercises()
  const [open, setOpen] = useState<string | null>(null)

  if (!workouts || !sessions || !exercises) return null

  if (workouts.length === 0) {
    return (
      <Screen>
        <ScreenHeader title="Historique" />
        <EmptyState title="Aucune séance enregistrée">
          Démarre une séance depuis l'accueil : elle apparaîtra ici une fois terminée.
        </EmptyState>
      </Screen>
    )
  }

  return (
    <Screen>
      <ScreenHeader title="Historique" sub={`${workouts.length} SÉANCES`} />
      <ul className="space-y-2.5">
        {workouts.map((w) => {
          const session = sessions.find((s) => s.id === w.sessionId)
          const isOpen = open === w.id
          return (
            <li key={w.id} className="card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : w.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                aria-expanded={isOpen}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15.5px] font-semibold">{session?.name ?? '—'}</span>
                    {w.status === 'en-cours' ? <Chip tone="record">En cours</Chip> : null}
                    {w.status === 'abandonnee' ? <Chip tone="regress">Abandonnée</Chip> : null}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-faint">
                    S{w.weekIndex} · {formatDayShort(w.date)}
                  </span>
                </span>
                <span aria-hidden className="flex-none text-[15px] text-ink-faint">
                  {isOpen ? '▾' : '›'}
                </span>
              </button>
              {isOpen ? <WorkoutDetail workoutId={w.id} /> : null}
            </li>
          )
        })}
      </ul>
    </Screen>
  )
}

function WorkoutDetail({ workoutId }: { workoutId: string }) {
  const exercises = useExercises()
  const [confirm, setConfirm] = useState(false)
  const sets = useLiveQuery(async () => {
    const rows = await db.setLogs.where('workoutId').equals(workoutId).toArray()
    return rows.sort((a, b) => a.ts.localeCompare(b.ts))
  }, [workoutId])

  if (!sets || !exercises) return null

  // Regroupé par exercice, dans l'ordre où les séries ont été faites.
  const order: string[] = []
  for (const s of sets) if (!order.includes(s.exerciseId)) order.push(s.exerciseId)

  return (
    <div className="border-t border-line-soft px-4 py-3">
      {order.length === 0 ? (
        <p className="text-[13px] text-ink-faint">Aucune série enregistrée.</p>
      ) : (
        <ul className="space-y-3">
          {order.map((exerciseId) => {
            const ex = exercises.find((e) => e.id === exerciseId)
            const own = sets.filter((s) => s.exerciseId === exerciseId)
            return (
              <li key={exerciseId}>
                <div className="mb-1 truncate text-[13.5px] font-semibold">{ex?.name ?? 'Exercice retiré'}</div>
                <ul className="space-y-0.5">
                  {own.map((s) => (
                    <li
                      key={s.id}
                      className="num flex items-baseline gap-3 font-mono text-[12.5px] text-ink-dim"
                    >
                      <span className="w-[16px] flex-none text-ink-faint">{s.setIndex}</span>
                      <span className="flex-1">
                        {formatKg(s.kg)} kg × {s.reps} · RIR {s.rir}
                      </span>
                      <span className={cx('flex-none', s.isExtra ? 'text-saisie' : 'text-calcul')}>
                        {(Math.round(s.e1rm * 10) / 10).toString().replace('.', ',')}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      )}

      {confirm ? (
        <div className="mt-4 flex gap-2">
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              void deleteWorkout(workoutId)
              setConfirm(false)
            }}
          >
            Supprimer la séance
          </Button>
          <Button variant="ghost" className="flex-1" onClick={() => setConfirm(false)}>
            Annuler
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint"
        >
          Supprimer cette séance
        </button>
      )}
    </div>
  )
}
