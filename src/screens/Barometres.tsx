import { useCurrentWeek, useExercises, useSettings, useWeeklySets } from '../hooks/useAppData'
import { VERDICT_FROM_WEEK, barometerVerdict, bestByWeek, type BarometerVerdict, type IndicatorWindow } from '../domain/barometers'
import { EmptyState, Screen, ScreenHeader, cx } from '../ui/primitives'
import { LineChart } from '../ui/LineChart'
import type { Exercise } from '../domain/types'

/**
 * Baromètres : les deux indicateurs qui décident du volume total.
 * Si les deux plafonnent trois semaines de suite, le volume est trop haut.
 */
export function Barometres() {
  const settings = useSettings()
  const exercises = useExercises()
  const sets = useWeeklySets()
  const week = useCurrentWeek(settings)

  if (!settings || !exercises || !sets) return null

  const ex1 = exercises.find((e) => e.barometer === 1)
  const ex2 = exercises.find((e) => e.barometer === 2)

  if (!ex1 || !ex2) {
    return (
      <Screen>
        <ScreenHeader title="Baromètres" />
        <EmptyState title="Les deux baromètres ne sont pas définis">
          Marque un exercice « Baromètre 1 » et un autre « Baromètre 2 » dans Plus → Éditer le
          programme. Par défaut : élévation latérale uni câble (Push) et traction pronation.
        </EmptyState>
      </Screen>
    )
  }

  const by1 = bestByWeek(sets, ex1.id)
  const by2 = bestByWeek(sets, ex2.id)
  const reading = barometerVerdict(by1, by2, week)

  return (
    <Screen>
      <ScreenHeader title="Baromètres" sub={`SEMAINE ${week} · VERDICT DÈS S${VERDICT_FROM_WEEK}`} />

      <div
        className={cx(
          'rounded-xl border px-4 py-4',
          verdictBox(reading.verdict),
        )}
      >
        <p className={cx('text-[18px] font-bold tracking-tight', verdictText(reading.verdict))}>
          {reading.label}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">{reading.detail}</p>
      </div>

      <Indicator title="Indicateur 1" exercise={ex1} data={by1} window={reading.indicator1} />
      <Indicator title="Indicateur 2" exercise={ex2} data={by2} window={reading.indicator2} note={
        ex2.loadMode === 'poids-corps'
          ? `Charge = poids de corps + lest. Ton poids de corps (${fmt1(settings.bodyWeightKg)} kg) pré-remplit le champ.`
          : undefined
      } />

      <div className="mt-6 space-y-1.5 text-[12.5px] leading-relaxed text-ink-faint">
        <p>On compare max(3 dernières semaines) à max(3 semaines d'avant), sur les deux indicateurs.</p>
        <p>Les deux ≤ → STOP. Un seul ≤ → Vigilance. Aucun → OK.</p>
        <p>Un baromètre plat pendant un déficit calorique est normal : la règle vaut à maintenance ou en surplus.</p>
      </div>
    </Screen>
  )
}

function Indicator({
  title,
  exercise,
  data,
  window: w,
  note,
}: {
  title: string
  exercise: Exercise
  data: Map<number, number>
  window: IndicatorWindow
  note?: string
}) {
  const points = [...data.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, value]) => ({ week, value }))

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="label-xs">{title}</div>
          <h2 className="mt-0.5 truncate text-[16px] font-semibold tracking-tight">{exercise.name}</h2>
        </div>
        {w.flat !== null ? (
          <span
            className={cx(
              'flex-none font-mono text-[10px] uppercase tracking-[0.09em]',
              w.flat ? 'text-regress' : 'text-record',
            )}
          >
            {w.flat ? 'Plafonne' : 'Monte'}
          </span>
        ) : null}
      </div>

      <div className="card p-3">
        <LineChart points={points} height={160} />
        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line-soft pt-2.5">
          <Window label="3 dernières sem." value={w.recent} />
          <Window label="3 sem. d'avant" value={w.prior} />
        </div>
      </div>

      {note ? <p className="mt-2 text-[12px] leading-snug text-saisie">{note}</p> : null}
    </section>
  )
}

function Window({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="label-xs">{label}</div>
      <div className="num mt-0.5 font-mono text-[16px] font-semibold text-calcul">
        {value === null ? '—' : fmt1(value)}
      </div>
    </div>
  )
}

function verdictBox(v: BarometerVerdict): string {
  switch (v) {
    case 'stop':
      return 'border-regress/45 bg-regress/8'
    case 'vigilance':
      return 'border-saisie/45 bg-saisie/8'
    case 'ok':
      return 'border-record/45 bg-record/8'
    default:
      return 'border-line bg-panel'
  }
}

function verdictText(v: BarometerVerdict): string {
  switch (v) {
    case 'stop':
      return 'text-regress'
    case 'vigilance':
      return 'text-saisie'
    case 'ok':
      return 'text-record'
    default:
      return 'text-ink'
  }
}

function fmt1(value: number): string {
  return (Math.round(value * 10) / 10).toString().replace('.', ',')
}
