import { useEffect } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useSettings } from './hooks/useAppData'
import { cx } from './ui/primitives'
import { Home } from './screens/Home'
import { WorkoutScreen } from './screens/Workout'
import { Progression } from './screens/Progression'
import { VolumeScreen } from './screens/Volume'
import { Barometres } from './screens/Barometres'
import { Nutrition } from './screens/Nutrition'
import { Plus } from './screens/Plus'
import { Reglages } from './screens/Reglages'
import { ProgrammeEditor } from './screens/ProgrammeEditor'
import { Historique } from './screens/Historique'

/**
 * Routage par hash (`#/volume`). Aucune réécriture serveur nécessaire :
 * l'app démarre depuis n'importe où, y compris depuis le cache hors-ligne.
 */

const TABS = [
  { to: '/', label: 'Accueil', icon: '▣', end: true },
  { to: '/progression', label: 'Progrès', icon: '◹', end: false },
  { to: '/volume', label: 'Volume', icon: '▤', end: false },
  { to: '/nutrition', label: 'Nutrition', icon: '◐', end: false },
  { to: '/plus', label: 'Plus', icon: '⋯', end: false },
]

function TabBar() {
  return (
    <nav className="safe-bottom sticky bottom-0 z-20 flex border-t border-line-soft bg-ground/95 px-1 pt-1.5 backdrop-blur">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cx(
              'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5',
              'font-mono text-[9.5px] tracking-[0.04em]',
              isActive ? 'text-calcul' : 'text-ink-faint',
            )
          }
        >
          <span aria-hidden className="text-[16px] leading-none">
            {tab.icon}
          </span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Remonte en haut à chaque changement d'écran. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Shell() {
  const location = useLocation()
  // L'écran de séance a sa propre navigation : pas de barre d'onglets par-dessus.
  const inWorkout = location.pathname.startsWith('/seance/')

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <ScrollToTop />
      <main className="safe-top flex-1 pb-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/seance/:workoutId" element={<WorkoutScreen />} />
          <Route path="/progression" element={<Progression />} />
          <Route path="/volume" element={<VolumeScreen />} />
          <Route path="/barometres" element={<Barometres />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/plus" element={<Plus />} />
          <Route path="/reglages" element={<Reglages />} />
          <Route path="/programme" element={<ProgrammeEditor />} />
          <Route path="/historique" element={<Historique />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {inWorkout ? null : <TabBar />}
    </div>
  )
}

/** Applique le thème choisi à la racine du document. */
function useTheme() {
  const settings = useSettings()
  const theme = settings?.theme ?? 'sombre'
  useEffect(() => {
    document.documentElement.classList.toggle('clair', theme === 'clair')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'clair' ? '#F8F9FA' : '#0B0E11')
  }, [theme])
}

export default function App() {
  useTheme()
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
