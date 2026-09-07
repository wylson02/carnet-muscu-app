import type { Exercise, ExerciseKind, LoadMode, Muscle, Session, Settings } from '../domain/types'

/**
 * Le programme, transcrit du classeur « Carnet Entrainement — Système Fluide ».
 *
 * 5 séances · 35 exercices · 101 séries par semaine.
 * Ce fichier ne sert qu'à la première ouverture : ensuite le programme vit en
 * base et s'édite dans les réglages.
 */

export const SEED_START_DATE = '2026-08-24' // un lundi
export const SEED_BODY_WEIGHT = 78
export const SEED_PROTEIN_TARGET = 156
export const SEED_STEP_CAP = 12_000

export const SEED_MUSCLES: Muscle[] = [
  { id: 'epaules', name: 'Épaules', targetSets: 21, category: 'Prioritaire', cutOrder: null, order: 1 },
  { id: 'dorsaux', name: 'Dorsaux', targetSets: 21, category: 'Prioritaire', cutOrder: null, order: 2 },
  { id: 'mollets', name: 'Mollets', targetSets: 12, category: 'Prioritaire', cutOrder: null, order: 3 },
  { id: 'pectoraux', name: 'Pectoraux', targetSets: 12, category: 'Modérée', cutOrder: 1, order: 4 },
  { id: 'triceps', name: 'Triceps', targetSets: 9, category: 'Modérée', cutOrder: 2, order: 5 },
  { id: 'ischios', name: 'Ischios', targetSets: 9, category: 'Modérée', cutOrder: null, order: 6 },
  { id: 'quadriceps', name: 'Quadriceps', targetSets: 8, category: 'Modérée', cutOrder: 3, order: 7 },
  { id: 'biceps', name: 'Biceps', targetSets: 6, category: 'Maintenance', cutOrder: null, order: 8 },
  { id: 'adducteurs', name: 'Adducteurs', targetSets: 3, category: 'Maintenance', cutOrder: null, order: 9 },
]

export const SEED_SESSIONS: Session[] = [
  { id: 'push', name: 'Push', order: 1 },
  { id: 'pull', name: 'Pull', order: 2 },
  { id: 'lower', name: 'Lower', order: 3 },
  { id: 'upper', name: 'Upper', order: 4 },
  { id: 'chaine-post', name: 'Chaine post', order: 5 },
]

/** Forme compacte pour tenir la table lisible. */
type Row = {
  id: string
  name: string
  muscleId: string
  sets: number
  kind: ExerciseKind
  note?: string
  ss?: string
  load?: LoadMode
  /** Pas des kg. 1 kg sur les petites charges (latérales, pec deck) — 2,5 ailleurs. */
  inc?: number
  baro?: 1 | 2
}

const PROGRAM: Record<string, Row[]> = {
  // ── PUSH · 7 exercices · 19 séries ────────────────────────────────
  push: [
    { id: 'push-1', name: 'Elévation latérale uni (cable)', muscleId: 'epaules', sets: 3, kind: 'iso',
      note: 'PRIORITAIRE — passe en premier, à froid', inc: 1, baro: 1 },
    { id: 'push-2', name: 'Extension mollets debout (machine)', muscleId: 'mollets', sets: 3, kind: 'iso' },
    { id: 'push-3', name: 'Développé décliné unilatérale machine', muscleId: 'pectoraux', sets: 2, kind: 'poly',
      note: 'Exo roi — version unilatérale' },
    { id: 'push-4', name: 'Développé incliné uni (machine)', muscleId: 'pectoraux', sets: 2, kind: 'poly',
      note: 'Inclinaison 30-45°' },
    { id: 'push-5', name: 'Ecarté (poulie)', muscleId: 'pectoraux', sets: 3, kind: 'iso',
      note: 'Adduction complète — travail interne' },
    { id: 'push-6', name: 'Tirage latéral (haltère)', muscleId: 'epaules', sets: 3, kind: 'iso', inc: 1 },
    { id: 'push-7', name: 'Extension nuque', muscleId: 'triceps', sets: 3, kind: 'iso' },
  ],

  // ── PULL · 7 exercices · 21 séries ────────────────────────────────
  pull: [
    { id: 'pull-1', name: 'Pec deck inversé', muscleId: 'epaules', sets: 3, kind: 'iso',
      note: 'Deltoïde postérieur frais', inc: 1 },
    { id: 'pull-2', name: 'Pullover poulie (sur banc)', muscleId: 'dorsaux', sets: 3, kind: 'iso' },
    { id: 'pull-3', name: 'Tirage verticale uni prise neutre avec banc', muscleId: 'dorsaux', sets: 3, kind: 'poly',
      note: 'Vertical = largeur' },
    { id: 'pull-4', name: 'T BAR', muscleId: 'dorsaux', sets: 3, kind: 'poly',
      note: 'Horizontal = épaisseur' },
    { id: 'pull-5', name: 'Tirage horizontal assis', muscleId: 'dorsaux', sets: 3, kind: 'poly' },
    { id: 'pull-6', name: 'Curl incliné', muscleId: 'biceps', sets: 3, kind: 'iso',
      note: 'Biset → enchaîne sur le marteau sans repos', ss: 'BS1', inc: 1 },
    { id: 'pull-7', name: 'Curl marteau (haltère)', muscleId: 'biceps', sets: 3, kind: 'iso',
      note: 'Biset — 2e partie', ss: 'BS1', inc: 1 },
  ],

  // ── LOWER · 7 exercices · 20 séries ───────────────────────────────
  lower: [
    { id: 'lower-1', name: 'Elévation latérale (machine)', muscleId: 'epaules', sets: 3, kind: 'iso',
      note: 'PRIORITAIRE — avant les jambes', inc: 1 },
    { id: 'lower-2', name: 'Leg curl assis', muscleId: 'ischios', sets: 3, kind: 'iso',
      note: 'Pré-activation genoux' },
    { id: 'lower-3', name: 'Hack Squat', muscleId: 'quadriceps', sets: 2, kind: 'poly' },
    { id: 'lower-4', name: 'Presse à cuisse unilatéral', muscleId: 'quadriceps', sets: 3, kind: 'poly' },
    { id: 'lower-5', name: 'Leg extension', muscleId: 'quadriceps', sets: 3, kind: 'iso' },
    { id: 'lower-6', name: 'Adducteur machine', muscleId: 'adducteurs', sets: 3, kind: 'iso',
      note: 'Maintenance' },
    { id: 'lower-7', name: 'Extension mollets (assis)', muscleId: 'mollets', sets: 3, kind: 'iso' },
  ],

  // ── UPPER · 7 exercices · 20 séries ───────────────────────────────
  upper: [
    { id: 'upper-1', name: 'Pec deck inversé', muscleId: 'epaules', sets: 3, kind: 'iso',
      note: 'Deltoïde postérieur frais — charge-le, pas un finisher', inc: 1 },
    { id: 'upper-2', name: 'Elévation latérale uni (cable)', muscleId: 'epaules', sets: 3, kind: 'iso',
      note: 'PRIORITAIRE — 3e passage latéral de la semaine', inc: 1 },
    { id: 'upper-3', name: 'Développé décliné machine', muscleId: 'pectoraux', sets: 2, kind: 'poly',
      note: 'Exo roi — version bilatérale' },
    { id: 'upper-4', name: 'Développé incliné (smith machine)', muscleId: 'pectoraux', sets: 3, kind: 'poly',
      note: 'Exo de force : 8-10 reps stables, pars plus léger' },
    { id: 'upper-5', name: 'Extension triceps (poulie haute)', muscleId: 'triceps', sets: 3, kind: 'iso',
      note: 'Superset avec tirage coudes ouverts', ss: 'SS1' },
    { id: 'upper-6', name: 'Extension triceps enroulée', muscleId: 'triceps', sets: 3, kind: 'iso' },
    { id: 'upper-7', name: 'Tirage coudes ouverts (haltères)', muscleId: 'epaules', sets: 3, kind: 'iso',
      note: 'Superset avec ext. triceps poulie', ss: 'SS1', inc: 1 },
  ],

  // ── CHAINE POST · 7 exercices · 21 séries ─────────────────────────
  'chaine-post': [
    { id: 'cp-1', name: 'Extension mollets debout (machine)', muscleId: 'mollets', sets: 3, kind: 'iso' },
    { id: 'cp-2', name: 'Traction pronation', muscleId: 'dorsaux', sets: 3, kind: 'poly',
      note: 'PRIORITAIRE — seul exo prise large. Charge = poids de corps + lest',
      load: 'poids-corps', baro: 2 },
    { id: 'cp-3', name: 'Tirage verticale uni prise neutre (poulie)', muscleId: 'dorsaux', sets: 3, kind: 'poly' },
    { id: 'cp-4', name: 'Leg curl allongé', muscleId: 'ischios', sets: 3, kind: 'iso' },
    { id: 'cp-5', name: 'Soulevé de terre jambes semi-tendues (barre)', muscleId: 'ischios', sets: 3, kind: 'poly',
      note: 'Charge à faire monter — fessier indirect' },
    { id: 'cp-6', name: 'Tirage horizontal buste soutenu prise neutre (machine)', muscleId: 'dorsaux', sets: 3, kind: 'poly' },
    { id: 'cp-7', name: 'Extension mollets (assis)', muscleId: 'mollets', sets: 3, kind: 'iso' },
  ],
}

export const SEED_EXERCISES: Exercise[] = SEED_SESSIONS.flatMap((session) =>
  PROGRAM[session.id].map((row, i) => ({
    id: row.id,
    sessionId: session.id,
    order: i + 1,
    name: row.name,
    muscleId: row.muscleId,
    targetSets: row.sets,
    note: row.note ?? null,
    supersetTag: row.ss ?? null,
    kind: row.kind,
    restSec: null,
    loadMode: row.load ?? 'externe',
    incrementKg: row.inc ?? 2.5,
    barometer: row.baro ?? null,
    archived: false,
  })),
)

export const SEED_SETTINGS: Settings = {
  id: 'settings',
  bodyWeightKg: SEED_BODY_WEIGHT,
  startDate: SEED_START_DATE,
  defaultIncrementKg: 2.5,
  repStep: 1,
  rirStep: 1,
  restIsoSec: 90,
  restPolySec: 180,
  vibrate: true,
  beep: true,
  keepAwake: true,
  theme: 'sombre',
  proteinTargetG: SEED_PROTEIN_TARGET,
  stepCap: SEED_STEP_CAP,
}
