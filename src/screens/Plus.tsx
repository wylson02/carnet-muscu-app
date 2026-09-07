import { Link } from 'react-router-dom'
import { useCurrentWeek, useSettings } from '../hooks/useAppData'
import { Screen, ScreenHeader } from '../ui/primitives'

/** Ce qui ne tient pas dans cinq onglets : baromètres, historique, réglages. */
export function Plus() {
  const settings = useSettings()
  const week = useCurrentWeek(settings)

  const items = [
    {
      to: '/barometres',
      title: 'Baromètres',
      sub: 'Les deux indicateurs qui décident du volume total',
    },
    {
      to: '/historique',
      title: 'Historique',
      sub: 'Toutes les séances, avec leurs séries',
    },
    {
      to: '/programme',
      title: 'Éditer le programme',
      sub: 'Ajouter, retirer, réordonner, changer les cibles',
    },
    {
      to: '/reglages',
      title: 'Réglages',
      sub: 'Export / import JSON, poids de corps, incréments, repos',
    },
  ]

  return (
    <Screen>
      <ScreenHeader title="Plus" sub={`SEMAINE ${week} DU PROGRAMME`} />
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="card flex items-center gap-3 px-4 py-3.5 active:bg-raised"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold tracking-tight">{item.title}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-dim">{item.sub}</span>
              </span>
              <span aria-hidden className="flex-none text-[18px] text-ink-faint">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-center text-[12px] leading-relaxed text-ink-faint">
        Tout est stocké sur cet appareil. Pas de compte, pas de serveur, pas de synchro.
        <br />
        Ta seule sauvegarde, c'est l'export JSON des réglages.
      </p>
    </Screen>
  )
}
