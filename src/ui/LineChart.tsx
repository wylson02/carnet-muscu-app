import { useId } from 'react'

/**
 * Courbe e1RM par semaine. SVG à la main : aucune librairie de graphes à
 * embarquer pour tracer une polyligne de seize points.
 *
 * L'échelle est unique — points, axes et étiquettes sont placés dessus — et
 * les couleurs viennent des jetons du thème, donc la courbe reste lisible en
 * clair comme en sombre.
 */

export interface Point {
  week: number
  value: number
}

export function LineChart({
  points,
  height = 190,
  unit = 'kg',
  emphasizeLast = true,
}: {
  points: Point[]
  height?: number
  unit?: string
  emphasizeLast?: boolean
}) {
  const gradientId = useId()

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-line text-[13px] text-ink-faint"
        style={{ height }}
      >
        Pas encore de données
      </div>
    )
  }

  // Marges : de quoi loger les étiquettes d'axe sans les rogner.
  const W = 320
  const H = height
  const padL = 40
  const padR = 12
  const padT = 14
  const padB = 26

  const values = points.map((p) => p.value)
  const weeks = points.map((p) => p.week)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  // Un seul point, ou une valeur plate : on ouvre l'échelle pour éviter /0.
  const span = rawMax - rawMin
  const pad = span === 0 ? Math.max(1, rawMax * 0.1) : span * 0.15
  const yMin = Math.max(0, rawMin - pad)
  const yMax = rawMax + pad

  const xMin = Math.min(...weeks)
  const xMax = Math.max(...weeks)
  const xSpan = xMax - xMin || 1

  const x = (week: number) => padL + ((week - xMin) / xSpan) * (W - padL - padR)
  const y = (value: number) => padT + (1 - (value - yMin) / (yMax - yMin)) * (H - padT - padB)

  const line = points.map((p) => `${x(p.week)},${y(p.value)}`).join(' ')
  const area =
    `${padL},${H - padB} ` + line + ` ${x(points.at(-1)!.week)},${H - padB}`

  const ticks = [yMin, (yMin + yMax) / 2, yMax]
  const last = points.at(-1)!

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label={`Courbe : ${points.length} semaines, de ${fmt(rawMin)} à ${fmt(rawMax)} ${unit}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-calcul))" stopOpacity="0.28" />
          <stop offset="100%" stopColor="rgb(var(--c-calcul))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grille et graduations de l'axe des valeurs */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(t)}
            y2={y(t)}
            stroke="rgb(var(--c-line-soft))"
            strokeWidth="1"
          />
          <text
            x={padL - 6}
            y={y(t) + 3.5}
            textAnchor="end"
            fill="rgb(var(--c-ink-faint))"
            fontSize="9"
            fontFamily="IBM Plex Mono, monospace"
          >
            {fmt(t)}
          </text>
        </g>
      ))}

      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke="rgb(var(--c-calcul))"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {points.map((p, i) => {
        const isLast = emphasizeLast && i === points.length - 1
        return (
          <circle
            key={p.week}
            cx={x(p.week)}
            cy={y(p.value)}
            r={isLast ? 4 : 2.5}
            fill={isLast ? 'rgb(var(--c-record))' : 'rgb(var(--c-calcul))'}
            stroke="rgb(var(--c-ground))"
            strokeWidth={isLast ? 1.5 : 0}
          />
        )
      })}

      {/* Semaines : la première et la dernière suffisent à situer la courbe. */}
      <text
        x={padL}
        y={H - 8}
        fill="rgb(var(--c-ink-faint))"
        fontSize="9"
        fontFamily="IBM Plex Mono, monospace"
      >
        S{xMin}
      </text>
      {xMax !== xMin ? (
        <text
          x={W - padR}
          y={H - 8}
          textAnchor="end"
          fill="rgb(var(--c-ink-faint))"
          fontSize="9"
          fontFamily="IBM Plex Mono, monospace"
        >
          S{xMax}
        </text>
      ) : null}

      {/* Valeur courante, posée près du dernier point sans sortir du cadre. */}
      <text
        x={Math.min(W - padR, x(last.week) + 7)}
        y={Math.max(padT + 8, y(last.value) - 8)}
        textAnchor={x(last.week) > W - 70 ? 'end' : 'start'}
        fill="rgb(var(--c-record))"
        fontSize="10.5"
        fontWeight="600"
        fontFamily="IBM Plex Mono, monospace"
      >
        {fmt(last.value)} {unit}
      </text>
    </svg>
  )
}

function fmt(v: number): string {
  return (Math.round(v * 10) / 10).toString().replace('.', ',')
}
