import { useState } from 'react'
import { useExercises, useMuscles, useSessions, useWeeklySets } from '../hooks/useAppData'
import { exerciseSummary } from '../domain/progression'
import { Chip, EmptyState, Screen, ScreenHeader, Select, cx } from '../ui/primitives'
import { LineChart } from '../ui/LineChart'

/**
 * Progression par exercice : la courbe e1RM semaine par semaine, et les charges
 * derrière. Le meilleur e1RM est l'indicateur de surcharge progressive.
 */
export function Progression() {
  const exercises = useExercises()
  const sessions = useSessions()
  const muscles = useMuscles()
  const sets = useWeeklySets()
  const [selected, setSelected] = useState<string | null>(null)

  if (!exercises || !sessions || !muscles || !sets) return null

  const active = exercises.filter((e) => !e.archived)

  // À l'ouverture, on montre le dernier exercice travaillé : une courbe vide au
  // premier coup d'œil ne sert à rien.
  const lastWorked = [...sets]
    .filter((s) => s.status === 'validee')
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1)?.exerciseId
  const fallback = active.find((e) => e.id === lastWorked) ?? active[0]
  const current = active.find((e) => e.id === selected) ?? fallback

  if (!current) {
    return (
      <Screen>
        <ScreenHeader title="Progression" />
        <EmptyState title="Aucun exercice au programme">
          Ajoute des exercices depuis Plus → Éditer le programme.
        </EmptyState>
      </Screen>
    )
  }

  const summary = exerciseSummary(sets, current.id)
  const muscle = muscles.find((m) => m.id === current.muscleId)
  const points = summary.weeks.map((w) => ({ week: w.weekIndex, value: w.best }))

  return (
    <Screen>
      <ScreenHeader title="Progression" sub="MEILLEUR e1RM PAR SEMAINE" />

      <Select
        value={current.id}
        onChange={(e) => setSelected(e.target.value)}
        aria-label="Choisir un exercice"
      >
        {sessions.map((session) => (
          <optgroup key={session.id} label={session.name}>
            {active
              .filter((e) => e.sessionId === session.id)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </optgroup>
        ))}
      </Select>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {muscle ? <Chip tone="calcul">{muscle.name}</Chip> : null}
        <Chip>{current.kind === 'poly' ? 'Polyarticulaire' : 'Isolation'}</Chip>
        {current.barometer ? <Chip tone="record">Baromètre {current.barometer}</Chip> : null}
        {current.loadMode === 'poids-corps' ? <Chip tone="saisie">Poids de corps + lest</Chip> : null}
      </div>

      {summary.weeks.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Pas encore de série sur cet exercice">
            La courbe apparaîtra dès la première séance validée.
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="card mt-4 p-3">
            <LineChart points={points} />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="1er e1RM" value={fmt1(summary.firstE1rm)} />
            <Stat label="Meilleur" value={fmt1(summary.bestE1rm)} tone="record" />
            <Stat
              label="Δ depuis S1"
              value={summary.deltaPct === null ? '—' : `${summary.deltaPct >= 0 ? '+' : ''}${fmt1(summary.deltaPct)} %`}
              tone={
                summary.deltaPct === null ? undefined : summary.deltaPct >= 0 ? 'record' : 'regress'
              }
            />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="border-b border-line">
                  {['Sem.', 'Séries', 'Charge', 'e1RM', 'Δ record'].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-2 pb-2 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint first:pl-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...summary.weeks].reverse().map((w) => (
                  <tr key={w.weekIndex} className="border-b border-line-soft">
                    <td className="num px-2 py-2.5 pl-0 font-mono text-ink">S{w.weekIndex}</td>
                    <td className="num px-2 py-2.5 text-ink-dim">{w.sets}</td>
                    <td className="num px-2 py-2.5 text-ink-dim">{fmt1(w.topKg)} kg</td>
                    <td className="num px-2 py-2.5 font-mono text-calcul">{fmt1(w.best)}</td>
                    <td
                      className={cx(
                        'num px-2 py-2.5 font-mono',
                        w.delta === null ? 'text-ink-faint' : w.delta >= 0 ? 'text-record' : 'text-regress',
                      )}
                    >
                      {w.delta === null ? '—' : `${w.delta >= 0 ? '+' : ''}${fmt1(w.delta)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
            Δ vs record = meilleur e1RM de la semaine moins le meilleur de toutes les semaines
            précédentes. Vert quand tu bats ton record, rouge quand tu régresses.
          </p>
        </>
      )}
    </Screen>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'record' | 'regress'
}) {
  return (
    <div className="card px-3 py-2.5">
      <div className="label-xs">{label}</div>
      <div
        className={cx(
          'num mt-1 font-mono text-[19px] font-semibold',
          tone === 'record' ? 'text-record' : tone === 'regress' ? 'text-regress' : 'text-ink',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function fmt1(value: number | null): string {
  if (value === null) return '—'
  return (Math.round(value * 10) / 10).toString().replace('.', ',')
}
