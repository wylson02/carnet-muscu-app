import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { finishWorkout, lastFinishedWorkout, logSet, undoLastSet } from '../data/repo'
import {
  useExercises,
  useMuscles,
  useSessions,
  useSettings,
  useWorkout,
  useWorkoutSets,
} from '../hooks/useAppData'
import { useRestTimer } from '../hooks/useRestTimer'
import { useWakeLock } from '../hooks/useWakeLock'
import { blockTargetSets, formatDuration, groupIntoBlocks, restSecFor } from '../domain/blocks'
import { e1rm } from '../domain/e1rm'
import { recordBefore, setsOfExercise } from '../domain/progression'
import { formatKg, prefillForSet, referenceLabel } from '../domain/prefill'
import type { Exercise, SetLog, Settings, WeeklySet } from '../domain/types'
import { Button, Chip, Screen, cx } from '../ui/primitives'
import { Stepper } from '../ui/Stepper'

/**
 * L'écran de séance — le seul qui compte vraiment.
 *
 * Un bloc visible à la fois. Trois valeurs déjà remplies avec celles de la même
 * série la semaine dernière. Un bouton pleine largeur pour valider. Le minuteur
 * de repos part tout seul.
 */

interface Draft {
  kg: number
  reps: number
  rir: number
  touched: { kg: boolean; reps: boolean; rir: boolean }
}

export function WorkoutScreen() {
  const { workoutId } = useParams<{ workoutId: string }>()
  const navigate = useNavigate()

  const settings = useSettings()
  const workout = useWorkout(workoutId)
  const sessions = useSessions()
  const exercises = useExercises(workout?.sessionId)
  const sets = useWorkoutSets(workoutId)

  // Historique nécessaire au pré-remplissage et aux records.
  const history = useLiveQuery(async () => {
    if (!workout) return null
    const previous = await lastFinishedWorkout(workout.sessionId, workout.id)
    const previousSets = previous
      ? await db.setLogs.where('workoutId').equals(previous.id).toArray()
      : []
    const allSets = await db.setLogs.toArray()
    const allWorkouts = await db.workouts.toArray()
    return { previous, previousSets, allSets, allWorkouts }
  }, [workout?.id, workout?.sessionId])

  const [blockIndex, setBlockIndex] = useState(0)
  const [extraSets, setExtraSets] = useState<Record<string, number>>({})
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [flash, setFlash] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const timer = useRestTimer({
    vibrate: settings?.vibrate ?? true,
    beep: settings?.beep ?? true,
  })
  useWakeLock((settings?.keepAwake ?? true) && workout?.status === 'en-cours')

  const blocks = useMemo(() => (exercises ? groupIntoBlocks(exercises) : []), [exercises])

  /** Séries validées de cet exercice, ce soir. */
  const setsFor = useCallback(
    (exerciseId: string) => (sets ?? []).filter((s) => s.exerciseId === exerciseId && s.status === 'validee'),
    [sets],
  )

  /** e1RM record à battre, toutes semaines précédentes confondues. */
  const recordsByExercise = useMemo(() => {
    const out = new Map<string, number | null>()
    if (!history || !workout || !exercises) return out
    const wById = new Map(history.allWorkouts.map((w) => [w.id, w]))
    const weekly: WeeklySet[] = history.allSets.flatMap((s) => {
      const w = wById.get(s.workoutId)
      if (!w) return []
      return [{
        weekIndex: w.weekIndex,
        exerciseId: s.exerciseId,
        muscleId: '',
        kg: s.kg, reps: s.reps, rir: s.rir, e1rm: s.e1rm,
        status: s.status, date: w.date,
      }]
    })
    for (const ex of exercises) {
      out.set(ex.id, recordBefore(setsOfExercise(weekly, ex.id), workout.weekIndex))
    }
    return out
  }, [history, workout, exercises])

  const draftKey = (exerciseId: string, setIndex: number) => `${exerciseId}:${setIndex}`

  const setDraftValue = useCallback(
    (exerciseId: string, setIndex: number, field: 'kg' | 'reps' | 'rir', value: number, base: Draft) => {
      const key = draftKey(exerciseId, setIndex)
      setDrafts((prev) => {
        const current = prev[key] ?? base
        return {
          ...prev,
          [key]: {
            ...current,
            [field]: value,
            touched: { ...current.touched, [field]: true },
          },
        }
      })
    },
    [],
  )

  if (!settings || !workout || !sessions || !exercises || !sets || !history) {
    return <Screen className="pt-10 text-center text-ink-faint">Chargement…</Screen>
  }

  const session = sessions.find((s) => s.id === workout.sessionId)
  if (blocks.length === 0) {
    return (
      <Screen className="pt-10">
        <p className="text-center text-ink-dim">Cette séance ne contient aucun exercice.</p>
        <Button full className="mt-4" onClick={() => navigate('/programme')}>
          Éditer le programme
        </Button>
      </Screen>
    )
  }

  const index = Math.min(blockIndex, blocks.length - 1)
  const block = blocks[index]
  const extra = extraSets[block.key] ?? 0

  /** Cible de chaque membre du bloc, séries ajoutées comprises. */
  const targetOf = (ex: Exercise) => ex.targetSets + extra
  const blockTarget = blockTargetSets(block) + extra

  const doneCount = Math.max(...block.exercises.map((ex) => setsFor(ex.id).length))
  const setIndex = doneCount + 1
  const blockDone = setIndex > blockTarget
  const activeMembers = block.exercises.filter((ex) => setIndex <= targetOf(ex))

  /** Valeurs affichées : le brouillon s'il existe, sinon le pré-remplissage. */
  const resolve = (ex: Exercise): { draft: Draft; label: string | null; record: number | null } => {
    const prefill = prefillForSet({
      exercise: ex,
      setIndex,
      previousWorkoutSets: history.previousSets.filter((s) => s.exerciseId === ex.id),
      currentWorkoutSets: setsFor(ex.id),
      lastKnownSet: lastKnownFrom(history.allSets, ex.id),
      bodyWeightKg: settings.bodyWeightKg,
    })
    const base: Draft = {
      kg: prefill.kg,
      reps: prefill.reps,
      rir: prefill.rir,
      touched: { kg: false, reps: false, rir: false },
    }
    return {
      draft: drafts[draftKey(ex.id, setIndex)] ?? base,
      label: referenceLabel(prefill),
      record: recordsByExercise.get(ex.id) ?? null,
    }
  }

  const validate = async () => {
    let beat: string | null = null

    for (const ex of activeMembers) {
      const { draft, record } = resolve(ex)
      if (draft.kg <= 0) continue
      await logSet({
        workoutId: workout.id,
        exercise: ex,
        setIndex,
        kg: draft.kg,
        reps: draft.reps,
        rir: draft.rir,
        isExtra: setIndex > ex.targetSets,
        bodyWeightKg: settings.bodyWeightKg,
      })
      const value = e1rm(draft.kg, draft.reps, draft.rir)
      if (record !== null && value > record) {
        beat = `Record battu · e1RM ${fmt1(value)} (+${fmt1(value - record)})`
      }
    }

    setFlash(beat)
    if (beat) window.setTimeout(() => setFlash(null), 5000)

    timer.start(restSecFor(block, settings))

    // Bloc terminé : on passe au suivant, mais on ne quitte pas la séance tout seul.
    if (setIndex >= blockTarget && index < blocks.length - 1) {
      setBlockIndex(index + 1)
    }
  }

  const onUndo = async () => {
    for (const ex of block.exercises) await undoLastSet(workout.id, ex.id)
    setMenuOpen(false)
  }

  const onFinish = async () => {
    await finishWorkout(workout.id)
    timer.stop()
    navigate('/')
  }

  const progress = (index + (blockDone ? 1 : 0)) / blocks.length

  return (
    <Screen className="pb-4">
      {/* ── En-tête ── */}
      <div className="flex items-center gap-3 py-2.5">
        <button
          onClick={() => navigate('/')}
          aria-label="Retour à l'accueil"
          className="w-6 text-[20px] leading-none text-ink-dim"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{session?.name ?? 'Séance'}</div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-faint">
            Bloc {index + 1} / {blocks.length} · Semaine {workout.weekIndex}
          </div>
        </div>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu de la séance"
          aria-expanded={menuOpen}
          className="w-6 text-right text-[20px] leading-none text-ink-dim"
        >
          ⋯
        </button>
      </div>

      <div className="h-[3px] overflow-hidden rounded-full bg-line-soft">
        <div
          className="h-full rounded-full bg-calcul transition-[width]"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {menuOpen ? (
        <div className="card mt-3 divide-y divide-line-soft">
          <MenuItem onClick={onUndo} disabled={doneCount === 0}>
            Annuler la dernière série de ce bloc
          </MenuItem>
          <MenuItem
            onClick={() => {
              setExtraSets((prev) => ({ ...prev, [block.key]: extra + 1 }))
              setMenuOpen(false)
            }}
          >
            Ajouter une série à ce bloc
          </MenuItem>
          <MenuItem onClick={() => { timer.stop(); setMenuOpen(false) }} disabled={!timer.running}>
            Arrêter le minuteur
          </MenuItem>
          <MenuItem onClick={onFinish} tone="record">
            Terminer la séance
          </MenuItem>
        </div>
      ) : null}

      {/* ── Minuteur de repos ── */}
      {timer.running ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-calcul/35 bg-calcul/8 px-3 py-2.5">
          <span className="num flex-none font-mono text-[23px] font-semibold leading-none text-calcul">
            {formatDuration(timer.remaining)}
          </span>
          <span className="min-w-0 flex-1 font-mono text-[10px] uppercase leading-tight tracking-[0.1em] text-ink-faint">
            Repos {block.exercises[0].kind === 'poly' ? 'polyarticulaire' : 'isolation'}
            <span className="mt-0.5 block text-[10.5px] normal-case tracking-normal text-ink-dim">
              {settings.vibrate ? 'Vibre à zéro' : 'Bip à zéro'}
            </span>
          </span>
          <button
            onClick={() => timer.add(30)}
            className="flex-none rounded-lg border border-calcul/35 px-2.5 py-2 font-mono text-[11px] text-calcul"
          >
            +30 s
          </button>
          <button
            onClick={timer.stop}
            className="flex-none rounded-lg border border-line px-2.5 py-2 font-mono text-[11px] text-ink-dim"
          >
            Passer
          </button>
        </div>
      ) : null}

      {flash ? (
        <div className="mt-3 rounded-xl border border-record/45 bg-record/10 px-3.5 py-2.5 text-[13.5px] font-semibold text-record">
          {flash}
        </div>
      ) : null}

      {/* ── Le bloc ── */}
      <div className="mt-4">
        {block.kind === 'superset' ? (
          <div className="mb-3 flex items-center gap-2">
            <Chip tone="saisie">{block.tag}</Chip>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
              Superset — enchaîne, pas de repos entre les deux
            </span>
          </div>
        ) : null}

        {block.exercises.map((ex) => (
          <ExerciseHeader key={ex.id} exercise={ex} settings={settings} compact={block.kind === 'superset'} />
        ))}

        {/* Séries déjà faites */}
        {block.exercises.map((ex) =>
          setsFor(ex.id).map((s) => (
            <DoneRow
              key={s.id}
              set={s}
              showName={block.kind === 'superset'}
              name={ex.name}
              record={recordsByExercise.get(ex.id) ?? null}
            />
          )),
        )}

        {blockDone ? (
          <div className="card mt-2 px-4 py-5 text-center">
            <p className="font-semibold text-record">Bloc terminé</p>
            <p className="mt-1 text-[13px] text-ink-dim">
              {blockTarget} série{blockTarget > 1 ? 's' : ''} validée{blockTarget > 1 ? 's' : ''}.
            </p>
            <Button
              className="mt-3"
              onClick={() => setExtraSets((prev) => ({ ...prev, [block.key]: extra + 1 }))}
            >
              + Ajouter une série
            </Button>
          </div>
        ) : (
          <div className="mt-2 rounded-2xl border border-line bg-panel p-3">
            {activeMembers.map((ex, i) => {
              const { draft, label, record } = resolve(ex)
              return (
                <div key={ex.id} className={cx(i > 0 && 'mt-4 border-t border-line-soft pt-4')}>
                  {activeMembers.length > 1 ? (
                    <div className="mb-2 truncate text-[14px] font-semibold">{ex.name}</div>
                  ) : null}

                  <div className="num mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line-soft pb-2.5 font-mono text-[11px]">
                    <span className="text-ink-dim">{label ?? 'Première fois sur cet exercice'}</span>
                    {record !== null ? (
                      <span className="text-record">Record {fmt1(record)} ▲</span>
                    ) : (
                      <span className="text-ink-faint">Pas de record</span>
                    )}
                  </div>

                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.11em] text-calcul">
                    Série {setIndex} sur {targetOf(ex)}
                    {ex.loadMode === 'poids-corps' ? ' · poids de corps + lest' : ''}
                  </div>

                  <div className="space-y-2">
                    <Stepper
                      label="kg"
                      unit="kg"
                      value={draft.kg}
                      step={ex.incrementKg}
                      max={500}
                      ghost={!draft.touched.kg}
                      onChange={(v) => setDraftValue(ex.id, setIndex, 'kg', v, draft)}
                    />
                    <Stepper
                      label="reps"
                      unit="reps"
                      value={draft.reps}
                      step={settings.repStep}
                      min={1}
                      max={60}
                      decimals={0}
                      ghost={!draft.touched.reps}
                      onChange={(v) => setDraftValue(ex.id, setIndex, 'reps', v, draft)}
                    />
                    <Stepper
                      label="rir"
                      unit="rir"
                      value={draft.rir}
                      step={settings.rirStep}
                      min={0}
                      max={10}
                      decimals={0}
                      ghost={!draft.touched.rir}
                      onChange={(v) => setDraftValue(ex.id, setIndex, 'rir', v, draft)}
                    />
                  </div>

                  <div className="num mt-2 text-right font-mono text-[10.5px] text-ink-faint">
                    e1RM {fmt1(e1rm(draft.kg, draft.reps, draft.rir))}
                  </div>
                </div>
              )
            })}

            {/* Une série à 0 kg n'existe pas en salle : c'est un tap raté, et elle
                compterait quand même dans le volume et écraserait le record. */}
            {activeMembers.every((ex) => resolve(ex).draft.kg <= 0) ? (
              <>
                <Button variant="primary" full disabled className="mt-3 min-h-[56px] text-[17px]">
                  {block.kind === 'superset' ? 'Bloc validé' : 'Série validée'}
                </Button>
                <p className="mt-1.5 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  Monte la charge d'abord
                </p>
              </>
            ) : (
              <Button
                variant="primary"
                full
                className="mt-3 min-h-[56px] text-[17px]"
                onClick={() => void validate()}
              >
                {block.kind === 'superset' ? 'Bloc validé' : 'Série validée'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation entre blocs ── */}
      <div className="mt-5 flex gap-2">
        <Button
          className="flex-1"
          disabled={index === 0}
          onClick={() => setBlockIndex(index - 1)}
        >
          ‹ Préc.
        </Button>
        <Button
          variant="ghost"
          className="flex-1"
          onClick={() =>
            index < blocks.length - 1 ? setBlockIndex(index + 1) : void onFinish()
          }
        >
          {index < blocks.length - 1 ? 'Passer' : 'Terminer'}
        </Button>
        <Button
          className="flex-1"
          disabled={index >= blocks.length - 1}
          onClick={() => setBlockIndex(index + 1)}
        >
          Suiv. ›
        </Button>
      </div>

      {index >= blocks.length - 1 ? (
        <Button variant="primary" full className="mt-3" onClick={() => void onFinish()}>
          Terminer la séance
        </Button>
      ) : null}
    </Screen>
  )
}

// ── Sous-composants ─────────────────────────────────────────────────

function ExerciseHeader({
  exercise,
  settings,
  compact,
}: {
  exercise: Exercise
  settings: Settings
  compact: boolean
}) {
  const muscles = useMuscles()
  const rest = exercise.restSec ?? (exercise.kind === 'poly' ? settings.restPolySec : settings.restIsoSec)
  const muscleName = muscles?.find((m) => m.id === exercise.muscleId)?.name ?? exercise.muscleId
  if (compact) return null
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        <Chip tone="calcul">{muscleName}</Chip>
        <Chip>
          {exercise.kind === 'poly' ? 'Polyarticulaire' : 'Isolation'} · {formatDuration(rest)}
        </Chip>
        {exercise.barometer ? <Chip tone="record">Baromètre {exercise.barometer}</Chip> : null}
      </div>
      <h2 className="text-[21px] font-bold leading-tight tracking-tight">{exercise.name}</h2>
      {exercise.note ? (
        <p className="mt-1.5 text-[12.5px] leading-snug text-saisie">{exercise.note}</p>
      ) : null}
    </div>
  )
}

function DoneRow({
  set,
  showName,
  name,
  record,
}: {
  set: SetLog
  showName: boolean
  name: string
  record: number | null
}) {
  const beat = record !== null && set.e1rm > record
  return (
    <div className="mb-1.5 flex items-center gap-2.5 rounded-lg border border-line-soft bg-panel px-3 py-2">
      <span className="w-[52px] flex-none font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
        Série {set.setIndex}
      </span>
      <span className="num min-w-0 flex-1 truncate font-mono text-[13px] text-ink-dim">
        {showName ? <span className="text-ink-faint">{name} · </span> : null}
        {formatKg(set.kg)} kg × {set.reps} · RIR {set.rir}
      </span>
      <span className={cx('num flex-none font-mono text-[11px]', beat ? 'text-record' : 'text-ink-faint')}>
        {fmt1(set.e1rm)}
        {beat ? ' ▲' : ''}
      </span>
    </div>
  )
}

function MenuItem({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode
  onClick: () => void | Promise<void>
  disabled?: boolean
  tone?: 'record'
}) {
  return (
    <button
      onClick={() => void onClick()}
      disabled={disabled}
      className={cx(
        'block w-full px-4 py-3.5 text-left text-[14.5px] disabled:opacity-35',
        tone === 'record' ? 'font-semibold text-record' : 'text-ink',
      )}
    >
      {children}
    </button>
  )
}

// ── Utilitaires locaux ──────────────────────────────────────────────

function lastKnownFrom(all: SetLog[], exerciseId: string): SetLog | null {
  return (
    all
      .filter((s) => s.exerciseId === exerciseId && s.status === 'validee')
      .sort((a, b) => a.ts.localeCompare(b.ts))
      .at(-1) ?? null
  )
}

function fmt1(value: number): string {
  return (Math.round(value * 10) / 10).toString().replace('.', ',')
}
