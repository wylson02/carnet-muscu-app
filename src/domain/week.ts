/**
 * Numérotation des semaines.
 *
 * Semaine ISO : elle commence le lundi. La semaine 1 est celle qui contient
 * `startDate` (24 août 2026 dans le classeur, un lundi).
 *
 * Tout est manipulé en dates locales `YYYY-MM-DD`, jamais en UTC : une séance
 * du dimanche 22 h ne doit pas basculer dans la semaine suivante.
 */

const DAY_MS = 86_400_000

/** `YYYY-MM-DD` d'un `Date` local. */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** `YYYY-MM-DD` → `Date` à minuit local (et non UTC, ce que ferait `new Date(s)`). */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** Le lundi de la semaine contenant cette date. */
export function mondayOf(iso: string): Date {
  const d = fromISODate(iso)
  // getDay() : 0 = dimanche. On veut 0 = lundi.
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  return d
}

/** Numéro de semaine du programme. La semaine de `startDate` vaut 1. */
export function weekIndexOf(iso: string, startDate: string): number {
  const a = mondayOf(startDate).getTime()
  const b = mondayOf(iso).getTime()
  return Math.floor((b - a) / (7 * DAY_MS)) + 1
}

/** Le lundi et le dimanche d'une semaine du programme. */
export function weekRange(weekIndex: number, startDate: string): { from: string; to: string } {
  const start = mondayOf(startDate)
  start.setDate(start.getDate() + (weekIndex - 1) * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { from: toISODate(start), to: toISODate(end) }
}

/** Décale une date de `n` jours. */
export function addDays(iso: string, n: number): string {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Nombre de jours entiers entre deux dates (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / DAY_MS)
}

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const MOIS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

/** « mar. 2 sept. » */
export function formatDayShort(iso: string): string {
  const d = fromISODate(iso)
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`
}

/** « 2 sept. » */
export function formatDateShort(iso: string): string {
  const d = fromISODate(iso)
  return `${d.getDate()} ${MOIS[d.getMonth()]}`
}

/** « Aujourd'hui », « Hier », « Il y a 4 j », sinon la date. */
export function formatAgo(iso: string, today = todayISO()): string {
  const n = daysBetween(iso, today)
  if (n === 0) return "Aujourd'hui"
  if (n === 1) return 'Hier'
  if (n > 1 && n < 14) return `Il y a ${n} j`
  return formatDayShort(iso)
}
