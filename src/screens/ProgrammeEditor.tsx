import { useState } from 'react'
import { useExercises, useMuscles, useSessions } from '../hooks/useAppData'
import {
  addExercise,
  moveExercise,
  removeExercise,
  restoreExercise,
  updateExercise,
  updateMuscleTarget,
} from '../data/repo'
import type { Exercise, Muscle } from '../domain/types'
import {
  Button,
  Chip,
  Field,
  NumberInput,
  Screen,
  ScreenHeader,
  SectionTitle,
  Select,
  TextInput,
  cx,
} from '../ui/primitives'

/**
 * Éditeur de programme.
 *
 * Tout se change ici, sans toucher au code : ajouter, retirer, réordonner,
 * changer les séries cibles, les supersets, les incréments. L'historique tient
 * parce qu'il pointe sur des identifiants stables — renommer un exercice ne
 * casse pas sa courbe.
 */
export function ProgrammeEditor() {
  const sessions = useSessions()
  const exercises = useExercises()
  const muscles = useMuscles()
  const [openSession, setOpenSession] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  if (!sessions || !exercises || !muscles) return null

  const archived = exercises.filter((e) => e.archived)

  return (
    <Screen>
      <ScreenHeader title="Programme" sub="ÉDITABLE — RIEN N'EST FIGÉ DANS LE CODE" />

      {sessions.map((session) => {
        const own = exercises.filter((e) => e.sessionId === session.id && !e.archived)
        const open = openSession === session.id
        const sets = own.reduce((n, e) => n + e.targetSets, 0)

        return (
          <section key={session.id} className="mb-2.5">
            <button
              onClick={() => setOpenSession(open ? null : session.id)}
              className="card flex w-full items-center gap-3 px-4 py-3.5 text-left"
              aria-expanded={open}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold tracking-tight">{session.name}</span>
                <span className="mt-0.5 block font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-faint">
                  {own.length} exos · {sets} séries
                </span>
              </span>
              <span aria-hidden className="flex-none text-[16px] text-ink-faint">
                {open ? '▾' : '›'}
              </span>
            </button>

            {open ? (
              <div className="mt-2 space-y-2 pl-1">
                {own.map((ex, i) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    muscles={muscles}
                    isFirst={i === 0}
                    isLast={i === own.length - 1}
                    editing={editing === ex.id}
                    onToggleEdit={() => setEditing(editing === ex.id ? null : ex.id)}
                  />
                ))}
                <Button
                  full
                  className="border-dashed"
                  onClick={() => void addExercise(session.id).then(setEditing)}
                >
                  + Ajouter un exercice
                </Button>
              </div>
            ) : null}
          </section>
        )
      })}

      {/* ── Cibles de volume ── */}
      <SectionTitle>Cibles de volume hebdomadaire</SectionTitle>
      <div className="card divide-y divide-line-soft">
        {muscles.map((m) => {
          const programmed = exercises
            .filter((e) => e.muscleId === m.id && !e.archived)
            .reduce((n, e) => n + e.targetSets, 0)
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{m.name}</span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  {m.category} · {programmed} série{programmed > 1 ? 's' : ''} au programme
                </span>
              </span>
              <NumberInput
                className="w-[86px] flex-none text-center"
                step="1"
                min="0"
                value={m.targetSets}
                onChange={(e) => void updateMuscleTarget(m.id, Math.max(0, Number(e.target.value)))}
                aria-label={`Cible ${m.name}`}
              />
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[12px] leading-snug text-ink-faint">
        « Au programme » compte les séries écrites dans les séances. Si l'écart avec la cible est
        durable, c'est l'un des deux qu'il faut corriger.
      </p>

      {/* ── Archivés ── */}
      {archived.length > 0 ? (
        <>
          <SectionTitle
            right={
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="font-mono text-[10px] uppercase tracking-[0.08em] text-calcul"
              >
                {showArchived ? 'Masquer' : `Voir (${archived.length})`}
              </button>
            }
          >
            Exercices retirés
          </SectionTitle>
          {showArchived ? (
            <div className="card divide-y divide-line-soft">
              {archived.map((ex) => (
                <div key={ex.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink-dim">{ex.name}</span>
                  <Button className="min-h-[38px] flex-none px-3" onClick={() => void restoreExercise(ex.id)}>
                    Remettre
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          <p className="mt-2 text-[12px] leading-snug text-ink-faint">
            Un exercice avec de l'historique est archivé, pas supprimé : ses courbes restent lisibles.
          </p>
        </>
      ) : null}
    </Screen>
  )
}

function ExerciseRow({
  exercise: ex,
  muscles,
  isFirst,
  isLast,
  editing,
  onToggleEdit,
}: {
  exercise: Exercise
  muscles: Muscle[]
  isFirst: boolean
  isLast: boolean
  editing: boolean
  onToggleEdit: () => void
}) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const muscle = muscles.find((m) => m.id === ex.muscleId)
  const patch = (values: Partial<Exercise>) => void updateExercise(ex.id, values)

  return (
    <div className={cx('card overflow-hidden', editing && 'border-calcul/45')}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-none flex-col gap-1">
          <button
            aria-label="Monter"
            disabled={isFirst}
            onClick={() => void moveExercise(ex.id, -1)}
            className="h-[26px] w-[30px] rounded border border-line text-[12px] text-ink-dim disabled:opacity-25"
          >
            ▲
          </button>
          <button
            aria-label="Descendre"
            disabled={isLast}
            onClick={() => void moveExercise(ex.id, 1)}
            className="h-[26px] w-[30px] rounded border border-line text-[12px] text-ink-dim disabled:opacity-25"
          >
            ▼
          </button>
        </div>

        <button onClick={onToggleEdit} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[14.5px] font-semibold">{ex.name}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1">
            <Chip tone="calcul">{muscle?.name ?? ex.muscleId}</Chip>
            <Chip>{ex.targetSets} séries</Chip>
            <Chip>{ex.kind === 'poly' ? 'Poly' : 'Iso'}</Chip>
            {ex.supersetTag ? <Chip tone="saisie">{ex.supersetTag}</Chip> : null}
            {ex.barometer ? <Chip tone="record">Baro {ex.barometer}</Chip> : null}
          </span>
        </button>

        <span aria-hidden className="flex-none text-[15px] text-ink-faint">
          {editing ? '▾' : '›'}
        </span>
      </div>

      {editing ? (
        <div className="border-t border-line-soft px-3 py-3.5">
          <Field label="Nom">
            <TextInput defaultValue={ex.name} onBlur={(e) => patch({ name: e.target.value.trim() || ex.name })} />
          </Field>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Muscle">
              <Select value={ex.muscleId} onChange={(e) => patch({ muscleId: e.target.value })}>
                {muscles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Séries cibles">
              <NumberInput
                step="1"
                min="1"
                value={ex.targetSets}
                onChange={(e) => patch({ targetSets: Math.max(1, Number(e.target.value)) })}
              />
            </Field>
            <Field label="Type" hint="Décide du repos par défaut.">
              <Select value={ex.kind} onChange={(e) => patch({ kind: e.target.value as Exercise['kind'] })}>
                <option value="iso">Isolation — 1:30</option>
                <option value="poly">Polyarticulaire — 3:00</option>
              </Select>
            </Field>
            <Field label="Pas des kg">
              <NumberInput
                step="0.5"
                min="0.5"
                value={ex.incrementKg}
                onChange={(e) => patch({ incrementKg: Math.max(0.5, Number(e.target.value)) })}
              />
            </Field>
            <Field label="Superset" hint="Même tag = même bloc enchaîné.">
              <TextInput
                placeholder="SS1, BS1…"
                defaultValue={ex.supersetTag ?? ''}
                onBlur={(e) => patch({ supersetTag: e.target.value.trim() || null })}
              />
            </Field>
            <Field label="Charge">
              <Select
                value={ex.loadMode}
                onChange={(e) => patch({ loadMode: e.target.value as Exercise['loadMode'] })}
              >
                <option value="externe">Charge externe</option>
                <option value="poids-corps">Poids de corps + lest</option>
              </Select>
            </Field>
            <Field label="Repos (s)" hint="Vide = valeur du type.">
              <NumberInput
                step="15"
                min="0"
                placeholder="auto"
                value={ex.restSec ?? ''}
                onChange={(e) =>
                  patch({ restSec: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })
                }
              />
            </Field>
            <Field label="Baromètre">
              <Select
                value={ex.barometer ?? ''}
                onChange={(e) =>
                  patch({ barometer: e.target.value === '' ? null : (Number(e.target.value) as 1 | 2) })
                }
              >
                <option value="">Aucun</option>
                <option value="1">Indicateur 1</option>
                <option value="2">Indicateur 2</option>
              </Select>
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Note" hint="S'affiche en salle, au-dessus des séries.">
              <TextInput
                defaultValue={ex.note ?? ''}
                placeholder="PRIORITAIRE — passe en premier…"
                onBlur={(e) => patch({ note: e.target.value.trim() || null })}
              />
            </Field>
          </div>

          {confirmRemove ? (
            <div className="mt-4 flex gap-2">
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  void removeExercise(ex.id)
                  setConfirmRemove(false)
                }}
              >
                Retirer définitivement
              </Button>
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmRemove(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <Button variant="danger" full className="mt-4" onClick={() => setConfirmRemove(true)}>
              Retirer du programme
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
