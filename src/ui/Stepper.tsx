import { useCallback, useEffect, useRef } from 'react'
import { cx } from './primitives'

/**
 * Le champ de saisie en salle. Jamais de clavier : deux gros boutons et une
 * valeur au milieu.
 *
 *  · Gris  = la valeur pré-remplie, celle de la même série la semaine dernière.
 *  · Jaune = tu l'as bougée toi.
 *
 * Appui maintenu = répétition, pour ne pas taper vingt fois au premier passage.
 */

const HOLD_DELAY_MS = 450
const HOLD_INTERVAL_MS = 110

export interface StepperProps {
  label: string
  unit: string
  value: number
  step: number
  min?: number
  max?: number
  /** `true` tant que la valeur pré-remplie n'a pas été touchée. */
  ghost: boolean
  onChange: (next: number) => void
  decimals?: number
}

export function Stepper({
  label,
  unit,
  value,
  step,
  min = 0,
  max = 999,
  ghost,
  onChange,
  decimals = 1,
}: StepperProps) {
  const timers = useRef<{ timeout?: number; interval?: number }>({})

  const clamp = useCallback(
    (n: number) => {
      // On repasse par un arrondi : 0.1 + 0.2 ne doit pas donner 0,30000000004.
      const rounded = Math.round(n * 1000) / 1000
      return Math.min(max, Math.max(min, rounded))
    },
    [min, max],
  )

  const stopHold = useCallback(() => {
    if (timers.current.timeout) window.clearTimeout(timers.current.timeout)
    if (timers.current.interval) window.clearInterval(timers.current.interval)
    timers.current = {}
  }, [])

  useEffect(() => stopHold, [stopHold])

  const bump = useCallback(
    (direction: -1 | 1) => {
      onChange(clamp(value + direction * step))
    },
    [clamp, onChange, step, value],
  )

  // `value` change à chaque répétition : on lit la dernière valeur via une ref
  // pour que l'intervalle ne reste pas collé à celle du premier appui.
  const latest = useRef({ value, step, clamp, onChange })
  latest.current = { value, step, clamp, onChange }

  const startHold = useCallback(
    (direction: -1 | 1) => {
      stopHold()
      timers.current.timeout = window.setTimeout(() => {
        timers.current.interval = window.setInterval(() => {
          const l = latest.current
          l.onChange(l.clamp(l.value + direction * l.step))
        }, HOLD_INTERVAL_MS)
      }, HOLD_DELAY_MS)
    },
    [stopHold],
  )

  const formatted = formatValue(value, decimals)

  const buttonClass =
    'flex h-[56px] w-[58px] flex-none items-center justify-center rounded-xl border ' +
    'border-line bg-raised text-[26px] font-medium leading-none text-ink ' +
    'active:bg-line disabled:opacity-30'

  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[34px] flex-none font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </span>

      <button
        type="button"
        aria-label={`${label} moins ${step}`}
        className={buttonClass}
        disabled={value <= min}
        onClick={() => bump(-1)}
        onPointerDown={() => startHold(-1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
      >
        −
      </button>

      <output
        className={cx(
          'num flex h-[56px] flex-1 items-baseline justify-center gap-1 rounded-xl border',
          'border-line-soft bg-ground',
        )}
      >
        <span
          className={cx(
            'text-[26px] leading-none tracking-tight',
            ghost ? 'font-normal text-ink-faint' : 'font-semibold text-saisie',
          )}
        >
          {formatted}
        </span>
        <span className="font-mono text-[11px] text-ink-faint">{unit}</span>
      </output>

      <button
        type="button"
        aria-label={`${label} plus ${step}`}
        className={buttonClass}
        disabled={value >= max}
        onClick={() => bump(1)}
        onPointerDown={() => startHold(1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
      >
        +
      </button>
    </div>
  )
}

/** 14 → « 14 », 14.5 → « 14,5 ». Virgule décimale, pas de zéro inutile. */
export function formatValue(value: number, decimals: number): string {
  if (decimals === 0) return String(Math.round(value))
  const rounded = Math.round(value * 10 ** decimals) / 10 ** decimals
  return String(rounded).replace('.', ',')
}
