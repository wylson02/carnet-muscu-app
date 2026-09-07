import { useEffect } from 'react'

/**
 * Garde l'écran allumé pendant une séance. Sans ça, le téléphone se verrouille
 * entre deux séries et il faut le rallumer d'une main.
 *
 * Non supporté partout — l'appel échoue en silence, ce n'est pas grave.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    if (!('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void lock.release()
          return
        }
        sentinel = lock
      } catch {
        // Batterie faible, onglet en arrière-plan : on laisse tomber.
      }
    }

    // Le verrou saute quand l'app passe en arrière-plan : on le reprend au retour.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && sentinel === null) void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
      sentinel = null
    }
  }, [active])
}
