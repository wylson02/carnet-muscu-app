import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Minuteur de repos.
 *
 * L'échéance est stockée dans `localStorage`, pas seulement en mémoire : le
 * minuteur survit à un changement d'exercice, à un verrouillage d'écran et à un
 * rechargement de l'app. C'est un compte à rebours sur une heure absolue, donc
 * il reste juste même si le navigateur gèle le timer en arrière-plan.
 */

const KEY = 'carnet.rest.endsAt'

export interface RestTimer {
  /** Secondes restantes, 0 quand il n'y a rien en cours. */
  remaining: number
  running: boolean
  /** Durée totale du repos en cours, pour la barre de progression. */
  total: number
  start: (seconds: number) => void
  add: (seconds: number) => void
  stop: () => void
}

interface Persisted {
  endsAt: number
  total: number
}

function read(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Persisted
    if (typeof parsed?.endsAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function write(value: Persisted | null): void {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value))
    else localStorage.removeItem(KEY)
  } catch {
    // Mode privé, quota plein : le minuteur marche quand même, il ne survit
    // simplement pas à un rechargement.
  }
}

/** Bip de secours : iOS ignore `navigator.vibrate`. */
function beep(): void {
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
    osc.onended = () => void ctx.close()
  } catch {
    // Pas d'audio disponible : tant pis, l'affichage suffit.
  }
}

export function useRestTimer(opts: { vibrate: boolean; beep: boolean }): RestTimer {
  const [state, setState] = useState<Persisted | null>(() => read())
  const [now, setNow] = useState(() => Date.now())
  const firedRef = useRef<number | null>(null)
  const optsRef = useRef(opts)
  optsRef.current = opts

  // Tic à 200 ms : assez fluide pour l'affichage, assez rare pour la batterie.
  useEffect(() => {
    if (!state) return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [state])

  // Recalage immédiat au retour au premier plan.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now())
        setState(read())
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const remaining = state ? Math.max(0, (state.endsAt - now) / 1000) : 0
  const running = state !== null && remaining > 0

  // Fin du repos : vibration + bip, une seule fois par minuteur.
  useEffect(() => {
    if (!state) return
    if (remaining > 0) return
    if (firedRef.current === state.endsAt) return
    firedRef.current = state.endsAt

    if (optsRef.current.vibrate && 'vibrate' in navigator) {
      navigator.vibrate([220, 90, 220])
    }
    if (optsRef.current.beep) beep()

    write(null)
    setState(null)
  }, [remaining, state])

  const start = useCallback((seconds: number) => {
    const next = { endsAt: Date.now() + seconds * 1000, total: seconds }
    firedRef.current = null
    write(next)
    setNow(Date.now())
    setState(next)
  }, [])

  const add = useCallback((seconds: number) => {
    setState((prev) => {
      if (!prev) return prev
      const next = { endsAt: prev.endsAt + seconds * 1000, total: prev.total + seconds }
      write(next)
      return next
    })
  }, [])

  const stop = useCallback(() => {
    firedRef.current = null
    write(null)
    setState(null)
  }, [])

  return { remaining, running, total: state?.total ?? 0, start, add, stop }
}
