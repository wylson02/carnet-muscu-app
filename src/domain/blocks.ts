import type { Exercise, Settings } from './types'

/**
 * Découpage d'une séance en blocs de saisie.
 *
 * Deux exercices qui partagent le même `supersetTag` ([SS1], [BS1]) forment un
 * seul bloc : on les enchaîne sans repos, un seul bouton valide les deux séries,
 * et le minuteur ne démarre qu'après la seconde.
 *
 * Le bloc est posé à l'emplacement du PREMIER de ses membres dans l'ordre du
 * programme. Dans Upper, l'exercice 6 (extension triceps enroulée) est écrit
 * entre les deux membres du SS1 : il est décalé après le bloc. C'est le seul
 * écart avec l'ordre du classeur, et il est voulu — un superset ne s'interrompt pas.
 */

export interface SingleBlock {
  kind: 'single'
  key: string
  exercises: [Exercise]
}

export interface SupersetBlock {
  kind: 'superset'
  key: string
  tag: string
  exercises: Exercise[]
}

export type Block = SingleBlock | SupersetBlock

export function groupIntoBlocks(exercises: Exercise[]): Block[] {
  const ordered = [...exercises]
    .filter((e) => !e.archived)
    .sort((a, b) => a.order - b.order)

  const blocks: Block[] = []
  const consumed = new Set<string>()

  for (const ex of ordered) {
    if (consumed.has(ex.id)) continue

    const tag = ex.supersetTag?.trim()
    if (tag) {
      const members = ordered.filter((e) => e.supersetTag?.trim() === tag)
      members.forEach((m) => consumed.add(m.id))
      if (members.length > 1) {
        blocks.push({ kind: 'superset', key: `ss-${tag}`, tag, exercises: members })
        continue
      }
      // Un tag orphelin ne fait pas un superset.
    }

    consumed.add(ex.id)
    blocks.push({ kind: 'single', key: ex.id, exercises: [ex] })
  }

  return blocks
}

/** Nombre de séries visées par un bloc : la plus haute cible de ses membres. */
export function blockTargetSets(block: Block): number {
  return Math.max(...block.exercises.map((e) => e.targetSets))
}

/**
 * Repos après une série. Un override sur l'exercice l'emporte ; sinon
 * 1 min 30 en isolation, 3 min en polyarticulaire.
 * Sur un superset, c'est le plus long des deux qui s'applique.
 */
export function restSecFor(block: Block, settings: Settings): number {
  return Math.max(
    ...block.exercises.map(
      (e) => e.restSec ?? (e.kind === 'poly' ? settings.restPolySec : settings.restIsoSec),
    ),
  )
}

/** « 1:30 », « 3:00 ». */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
