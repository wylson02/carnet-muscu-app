import { useEffect, useState } from 'react'
import { useNutritionDays, usePhases, useSettings } from '../hooks/useAppData'
import { setPhaseFrom, upsertNutrition } from '../data/repo'
import { nutritionReading } from '../domain/nutrition'
import { PHASES, type Phase } from '../domain/types'
import { formatDayShort, todayISO } from '../domain/week'
import { Button, Field, NumberInput, Screen, ScreenHeader, Select, cx } from '../ui/primitives'

/**
 * Nutrition : poids du matin, kcal, pas.
 * On ne lit jamais le poids brut — seulement la moyenne 7 j et sa tendance,
 * qui décident du +200 / −200 selon la phase.
 */
export function Nutrition() {
  const settings = useSettings()
  const days = useNutritionDays()
  const phases = usePhases()

  const [date, setDate] = useState(todayISO())
  const [form, setForm] = useState({ weightKg: '', kcal: '', steps: '', proteinG: '' })
  const [saved, setSaved] = useState(false)

  // On recharge le formulaire quand la date change ou quand la base répond.
  useEffect(() => {
    const existing = days?.find((d) => d.date === date)
    setForm({
      weightKg: existing?.weightKg != null ? String(existing.weightKg) : '',
      kcal: existing?.kcal != null ? String(existing.kcal) : '',
      steps: existing?.steps != null ? String(existing.steps) : '',
      proteinG: existing?.proteinG != null ? String(existing.proteinG) : '',
    })
  }, [date, days])

  if (!settings || !days || !phases) return null

  const reading = nutritionReading(days, phases, todayISO())

  const save = async () => {
    await upsertNutrition({
      date,
      weightKg: num(form.weightKg),
      kcal: num(form.kcal),
      steps: num(form.steps),
      proteinG: num(form.proteinG),
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  const changePhase = async (phase: Phase) => {
    await setPhaseFrom(phase, todayISO())
  }

  const recent = [...days].reverse().slice(0, 14)

  return (
    <Screen>
      <ScreenHeader title="Nutrition" sub="PESÉE LE MATIN, MÊMES CONDITIONS" />

      {/* ── Lecture ── */}
      <div className="card px-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="label-xs">Moyenne 7 j</div>
            <div className="num mt-1 font-mono text-[26px] font-semibold tracking-tight">
              {reading.avg7 === null ? '—' : `${fmt2(reading.avg7)}`}
              <span className="ml-1 text-[13px] font-normal text-ink-faint">kg</span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
              {reading.daysLogged} / 7 jours pesés
            </div>
          </div>
          <div>
            <div className="label-xs">Tendance 7 j</div>
            <div
              className={cx(
                'num mt-1 font-mono text-[26px] font-semibold tracking-tight',
                reading.trend === null
                  ? 'text-ink-faint'
                  : reading.label === 'baisse'
                    ? 'text-calcul'
                    : reading.label === 'hausse'
                      ? 'text-saisie'
                      : 'text-ink-dim',
              )}
            >
              {reading.trend === null ? '—' : `${reading.trend >= 0 ? '+' : '−'}${fmt2(Math.abs(reading.trend))}`}
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
              {reading.label ?? 'seuil ±0,15 kg'}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-soft pt-3">
          <Mini label="Kcal moy." value={reading.kcal7 === null ? '—' : String(Math.round(reading.kcal7))} />
          <Mini
            label="Pas moy."
            value={reading.steps7 === null ? '—' : Math.round(reading.steps7).toLocaleString('fr-FR')}
            tone={reading.steps7 !== null && reading.steps7 > settings.stepCap ? 'saisie' : undefined}
          />
          <Mini
            label={`Prot. / ${settings.proteinTargetG} g`}
            value={reading.protein7 === null ? '—' : String(Math.round(reading.protein7))}
            tone={
              reading.protein7 !== null && reading.protein7 < settings.proteinTargetG * 0.9
                ? 'regress'
                : 'record'
            }
          />
        </div>
      </div>

      {/* ── Phase et décision ── */}
      <div className="mt-3 card px-4 py-4">
        <Field label="Phase en cours">
          <Select
            value={reading.phase ?? ''}
            onChange={(e) => void changePhase(e.target.value as Phase)}
          >
            <option value="" disabled>
              Choisis ta phase
            </option>
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>

        <div className="mt-3.5 border-t border-line-soft pt-3.5">
          <div className="label-xs">Décision suggérée</div>
          {reading.decision ? (
            <>
              <div
                className={cx(
                  'num mt-1 text-[22px] font-semibold',
                  // Un chiffre se lit mieux en chasse fixe ; une phrase, non.
                  reading.decision.kcal === 0 ? 'tracking-tight text-ink-dim' : 'font-mono',
                  reading.decision.kcal > 0 && 'text-record',
                  reading.decision.kcal < 0 && 'text-regress',
                )}
              >
                {reading.decision.kcal === 0
                  ? 'Ne touche à rien'
                  : `${reading.decision.kcal > 0 ? '+' : '−'}${Math.abs(reading.decision.kcal)} kcal`}
              </div>
              <p className="mt-1 text-[13px] leading-snug text-ink-dim">{reading.decision.text}</p>
            </>
          ) : (
            <p className="mt-1 text-[13px] leading-snug text-ink-faint">
              {reading.phase
                ? 'Il faut 14 jours de pesées pour calculer une tendance.'
                : 'Choisis ta phase pour obtenir une décision.'}
            </p>
          )}
        </div>
      </div>

      {/* ── Saisie ── */}
      <div className="mt-3 card px-4 py-4">
        <Field label="Jour">
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-line bg-raised px-3 text-[15px] text-ink"
          />
        </Field>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Poids (kg)">
            <NumberInput
              step="0.1"
              placeholder="78,0"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
            />
          </Field>
          <Field label="Kcal">
            <NumberInput
              step="10"
              placeholder="2400"
              value={form.kcal}
              onChange={(e) => setForm({ ...form, kcal: e.target.value })}
            />
          </Field>
          <Field label="Pas">
            <NumberInput
              step="100"
              placeholder="10000"
              value={form.steps}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
            />
          </Field>
          <Field label="Protéines (g)">
            <NumberInput
              step="5"
              placeholder={String(settings.proteinTargetG)}
              value={form.proteinG}
              onChange={(e) => setForm({ ...form, proteinG: e.target.value })}
            />
          </Field>
        </div>

        <Button variant="primary" full className="mt-4" onClick={() => void save()}>
          {saved ? 'Enregistré' : 'Enregistrer'}
        </Button>
      </div>

      {/* ── Historique court ── */}
      {recent.length > 0 ? (
        <>
          <h2 className="label-xs mb-2 mt-6">14 derniers jours</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  {['Jour', 'Poids', 'Kcal', 'Pas', 'Prot.'].map((h) => (
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
                {recent.map((d) => (
                  <tr key={d.date} className="border-b border-line-soft">
                    <td className="px-2 py-2 pl-0 text-ink">{formatDayShort(d.date)}</td>
                    <td className="num px-2 py-2 font-mono text-ink-dim">
                      {d.weightKg != null ? fmt2(d.weightKg) : '—'}
                    </td>
                    <td className="num px-2 py-2 font-mono text-ink-dim">{d.kcal ?? '—'}</td>
                    <td className="num px-2 py-2 font-mono text-ink-dim">
                      {d.steps != null ? d.steps.toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="num px-2 py-2 font-mono text-ink-dim">{d.proteinG ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </Screen>
  )
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: 'record' | 'regress' | 'saisie' }) {
  return (
    <div>
      <div className="label-xs">{label}</div>
      <div
        className={cx(
          'num mt-0.5 font-mono text-[15px] font-semibold',
          tone === 'record' ? 'text-record' : tone === 'regress' ? 'text-regress' : tone === 'saisie' ? 'text-saisie' : 'text-ink',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function num(value: string): number | null {
  const parsed = Number(value.replace(',', '.'))
  return value.trim() === '' || Number.isNaN(parsed) ? null : parsed
}

function fmt2(value: number): string {
  return value.toFixed(1).replace('.', ',')
}
