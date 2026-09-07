import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ensureSeeded } from './data/db'
import './index.css'

/**
 * Le service worker précache tout le bundle : une fois l'app ouverte une
 * première fois, elle démarre sans réseau. `autoUpdate` récupère la nouvelle
 * version en arrière-plan et l'active au prochain lancement — jamais au milieu
 * d'une séance.
 */
registerSW({ immediate: true })

const root = document.getElementById('root')
if (!root) throw new Error('#root introuvable')

// Le programme est installé avant le premier rendu : aucun écran ne voit une
// base vide au démarrage.
ensureSeeded()
  .catch((err: unknown) => {
    console.error("Initialisation de la base impossible", err)
  })
  .finally(() => {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
