import { useState } from 'react'
import { useCurrentWeek, useMuscles, useSettings, useWeeklySets } from '../hooks/useAppData'
import { cutOrder, weeklyVolume, type VolumeStatus } from '../domain/volume'
import { formatDateShort, weekRange } from '../domain/week'
import { Bar, Button, Screen, ScreenHeader, cx } from '../ui/primitives'

/**
 * Volume : séries réellement réalisées par muscle, contre la cible.
 * Vert dans ±20 %. Rouge au-dessus. Ambre en dessous.
 */
export function VolumeScreen() {
  const settings = useSettings()
  const muscles = useMuscles()
  const sets = useWeeklySets()
  const currentWeek = useCurrentWeek(settings)
  const [week, setWeek] = useState<number | null>(null)

  if (!settings || !muscles || !sets) return null

  const shown = week ?? currentWeek
  const rows = weeklyVolume(sets, muscles, shown)
  const range = weekRange(shown, settings.startDate)
  const total = rows.reduce((n, r) => n + r.done, 0)
  const targetTotal = rows.reduce((n, r) => n + r.target, 0)
  const drift = rows.filter((r) => r.status === 'over')

  return (
    <Screen>
      <ScreenHeader
        title="Volume"
        sub={`SEMAINE ${shown} · ${formatDateShort(range.from).toUpperCase()} – ${formatDateShort(range.to).toUpperCase()}`}
        right={
          <div className="flex flex-none gap-1.5">
            <Button className="min-h-[38px] px-3" disabled={shown <= 1} onClick={() => setWeek(shown - 1)}>
              ‹
            </Button>
            <Button className="min-h-[38px] px-3" onClick={() => setWeek(shown + 1)}>
              ›
            </Button>
          </div>
        }
      />

      <div className="card mb-4 flex items-baseline justify-between px-4 py-3">
        <span className="label-xs">Total séries</span>
        <span className="num font-mono text-[20px] font-semibold">
          {total} <span className="text-[13px] font-normal text-ink-faint">/ {targetTotal}</span>
        </span>
      </div>

      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.muscle.id} className="card px-3.5 py-3">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[15px] font-semibold">{row.muscle.name}</span>
              <span className="num flex-none font-mono text-[13px]">
                <span className={toneText(row.status)}>{row.done}</span>
                <span className="text-ink-faint"> / {row.target}</span>
              </span>
            </div>
            <Bar ratio={row.target > 0 ? row.done / row.target : 0} tone={toneBar(row.status)} />
            <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em]">
              <span className="text-ink-faint">{row.muscle.category}</span>
              <span className={toneText(row.status)}>{statusLabel(row.status)}</span>
            </div>
          </li>
        ))}
      </ul>

      {drift.length > 0 ? (
        <div className="mt-5 rounded-xl border border-regress/40 bg-regress/8 px-4 py-3.5">
          <p className="text-[13.5px] font-semibold text-regress">
            {drift.map((d) => d.muscle.name).join(', ')} au-dessus de la cible
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-dim">
            Plus de 20 % au-dessus, c'est de la fatigue accumulée pour rien. Ordre de coupe :{' '}
            {cutOrder(muscles).map((m) => m.name).join(' → ')}. Jamais les prioritaires en premier.
          </p>
        </div>
      ) : null}

      <div className="mt-5 space-y-1.5 text-[12.5px] leading-relaxed text-ink-faint">
        <p>Vert = dans ±20 % de la cible. Rouge = plus de 20 % au-dessus. Ambre = plus de 20 % en dessous.</p>
        <p>
          Une semaine à 0 sur un prioritaire (Épaules, Dorsaux, Mollets) est à corriger dès la semaine
          suivante.
        </p>
        <p>Les cibles s'éditent dans Plus → Éditer le programme.</p>
      </div>
    </Screen>
  )
}

function statusLabel(status: VolumeStatus): string {
  return status === 'ok' ? 'Dans la cible' : status === 'over' ? 'Au-dessus' : 'En dessous'
}

function toneText(status: VolumeStatus): string {
  return cx(status === 'ok' && 'text-record', status === 'over' && 'text-regress', status === 'under' && 'text-saisie')
}

function toneBar(status: VolumeStatus): 'record' | 'regress' | 'saisie' {
  return status === 'ok' ? 'record' : status === 'over' ? 'regress' : 'saisie'
}
