import type { ReactNode } from 'react'

/** Concaténation de classes, en ignorant les valeurs vides. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

// ── Boutons ─────────────────────────────────────────────────────────

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'neutral' | 'ghost' | 'danger'
  full?: boolean
}

/** 44 px minimum partout : c'est la plus petite cible tapable au pouce. */
export function Button({ variant = 'neutral', full, className, ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 min-h-[44px] ' +
    'font-semibold text-[15px] transition-colors disabled:opacity-40 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-record text-ground hover:brightness-110 active:brightness-95',
    neutral: 'bg-raised text-ink border border-line active:bg-line',
    ghost: 'text-ink-dim active:text-ink',
    danger: 'bg-regress/12 text-regress border border-regress/40 active:bg-regress/20',
  }
  return <button className={cx(base, variants[variant], full && 'w-full', className)} {...rest} />
}

// ── Étiquettes ──────────────────────────────────────────────────────

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'calcul' | 'record' | 'saisie' | 'regress'
  className?: string
}) {
  const tones = {
    neutral: 'border-line text-ink-dim',
    calcul: 'border-calcul/45 text-calcul',
    record: 'border-record/45 text-record',
    saisie: 'border-saisie/45 text-saisie',
    regress: 'border-regress/45 text-regress',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center rounded border px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.09em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

// ── Structure d'écran ───────────────────────────────────────────────

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-2xl px-4', className)}>{children}</div>
}

export function ScreenHeader({
  title,
  sub,
  right,
}: {
  title: string
  sub?: ReactNode
  right?: ReactNode
}) {
  return (
    <header className="flex items-end justify-between gap-4 pb-4 pt-3">
      <div className="min-w-0">
        <h1 className="text-[23px] font-bold leading-tight tracking-tight">{title}</h1>
        {sub ? <div className="mt-1 font-mono text-[10.5px] tracking-[0.08em] text-calcul">{sub}</div> : null}
      </div>
      {right}
    </header>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-baseline justify-between gap-3">
      <h2 className="label-xs">{children}</h2>
      {right}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card px-5 py-8 text-center">
      <p className="font-semibold">{title}</p>
      {children ? <p className="mx-auto mt-2 max-w-[46ch] text-[13.5px] text-ink-dim">{children}</p> : null}
    </div>
  )
}

/** Barre horizontale d'une valeur contre sa cible. */
export function Bar({
  ratio,
  tone,
}: {
  ratio: number
  tone: 'record' | 'regress' | 'saisie' | 'calcul'
}) {
  const tones = { record: 'bg-record', regress: 'bg-regress', saisie: 'bg-saisie', calcul: 'bg-calcul' }
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line-soft">
      <div
        className={cx('h-full rounded-full transition-[width]', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
      />
    </div>
  )
}

// ── Champs de formulaire (hors salle) ───────────────────────────────

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="label-xs">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1.5 text-[12px] leading-snug text-ink-faint">{hint}</p> : null}
    </label>
  )
}

const inputBase =
  'w-full min-h-[44px] rounded-lg border border-line bg-raised px-3 text-[15px] ' +
  'text-ink placeholder:text-ink-faint focus:border-calcul'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputBase, props.className)} />
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      inputMode="decimal"
      type="number"
      {...props}
      className={cx(inputBase, 'num', props.className)}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputBase, 'pr-8', props.className)} />
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-faint">{hint}</span> : null}
      </span>
      <span
        className={cx(
          'relative h-[30px] w-[52px] flex-none rounded-full border transition-colors',
          checked ? 'border-record bg-record/85' : 'border-line bg-raised',
        )}
      >
        <span
          className={cx(
            'absolute top-[3px] h-[22px] w-[22px] rounded-full bg-ground transition-[left]',
            checked ? 'left-[26px]' : 'left-[3px]',
          )}
        />
      </span>
    </button>
  )
}
