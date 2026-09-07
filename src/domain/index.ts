/**
 * La couche de calcul.
 *
 * Tout ce qui est ici est une fonction pure : pas d'IndexedDB, pas de React,
 * pas de `Date.now()` caché. On lui passe des tableaux, elle rend des valeurs.
 * C'est ce qui permettra de brancher une synchro serveur plus tard sans
 * retoucher une seule règle de calcul.
 */

export * from './types'
export * from './e1rm'
export * from './week'
export * from './progression'
export * from './volume'
export * from './barometers'
export * from './nutrition'
export * from './prefill'
export * from './blocks'
