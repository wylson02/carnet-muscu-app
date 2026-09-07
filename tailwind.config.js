/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Code couleur repris du classeur : jaune = saisie, bleu = calculé,
        // vert = record / dans la cible, rouge = régression / hors cible.
        ground: 'rgb(var(--c-ground) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-soft': 'rgb(var(--c-line-soft) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-dim': 'rgb(var(--c-ink-dim) / <alpha-value>)',
        'ink-faint': 'rgb(var(--c-ink-faint) / <alpha-value>)',
        saisie: 'rgb(var(--c-saisie) / <alpha-value>)',
        calcul: 'rgb(var(--c-calcul) / <alpha-value>)',
        record: 'rgb(var(--c-record) / <alpha-value>)',
        regress: 'rgb(var(--c-regress) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', '-apple-system', 'Helvetica Neue', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
