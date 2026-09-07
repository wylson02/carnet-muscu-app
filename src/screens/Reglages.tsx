import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../hooks/useAppData'
import { updateSettings } from '../data/repo'
import { resetProgramToSeed } from '../data/db'
import { BackupError, downloadBackup, importBackup, parseBackup, type ImportSummary } from '../data/backup'
import { formatDayShort } from '../domain/week'
import { formatDuration } from '../domain/blocks'
import {
  Button,
  Field,
  NumberInput,
  Screen,
  ScreenHeader,
  SectionTitle,
  Select,
  TextInput,
  Toggle,
  cx,
} from '../ui/primitives'

/**
 * Réglages : export / import JSON, poids de corps, incréments, repos.
 * L'export est la seule sauvegarde qui existe — rien ne part sur un serveur.
 */
export function Reglages() {
  const settings = useSettings()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [pendingReset, setPendingReset] = useState(false)

  if (!settings) return null

  const set = (patch: Parameters<typeof updateSettings>[0]) => void updateSettings(patch)

  const onExport = async () => {
    try {
      await downloadBackup()
      setMessage({ tone: 'ok', text: 'Fichier JSON téléchargé. Range-le quelque part de sûr.' })
    } catch {
      setMessage({ tone: 'err', text: "L'export a échoué. Réessaie." })
    }
  }

  const onImportFile = async (file: File) => {
    try {
      const backup = parseBackup(await file.text())
      const ok = window.confirm(
        `Importer « ${file.name} » ?\n\n` +
          `${backup.setLogs.length} séries · ${backup.workouts.length} séances · ` +
          `${backup.nutrition.length} jours de nutrition.\n\n` +
          "TOUT ce qui est actuellement dans l'app sera remplacé.",
      )
      if (!ok) return
      const summary: ImportSummary = await importBackup(backup)
      setMessage({
        tone: 'ok',
        text: `Import réussi : ${summary.series} séries, ${summary.seances} séances, ${summary.joursNutrition} jours de nutrition.`,
      })
    } catch (err) {
      setMessage({
        tone: 'err',
        text: err instanceof BackupError ? err.message : "Import impossible : fichier illisible.",
      })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Réglages" />

      {message ? (
        <div
          className={cx(
            'mb-4 rounded-xl border px-4 py-3 text-[13px] leading-snug',
            message.tone === 'ok'
              ? 'border-record/45 bg-record/8 text-record'
              : 'border-regress/45 bg-regress/8 text-regress',
          )}
        >
          {message.text}
        </div>
      ) : null}

      {/* ── Sauvegarde ── */}
      <SectionTitle>Sauvegarde</SectionTitle>
      <div className="card px-4 py-4">
        <p className="text-[13px] leading-relaxed text-ink-dim">
          Tout vit sur cet appareil. Effacer les données de Safari, changer de téléphone ou
          désinstaller l'app efface le carnet. L'export JSON contient le programme, l'historique
          complet, la nutrition et les réglages.
        </p>
        <div className="mt-3.5 flex gap-2">
          <Button variant="primary" className="flex-1" onClick={() => void onExport()}>
            Exporter en JSON
          </Button>
          <Button className="flex-1" onClick={() => fileRef.current?.click()}>
            Importer
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onImportFile(file)
          }}
        />
        <p className="mt-2.5 text-[12px] leading-snug text-saisie">
          L'import remplace tout le contenu actuel. Exporte avant, par sécurité.
        </p>
      </div>

      {/* ── Saisie en salle ── */}
      <SectionTitle>Saisie en salle</SectionTitle>
      <div className="card px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Poids de corps (kg)" hint="Pré-remplit la traction et les dips.">
            <NumberInput
              step="0.5"
              value={settings.bodyWeightKg}
              onChange={(e) => set({ bodyWeightKg: Number(e.target.value) })}
            />
          </Field>
          <Field label="Pas des kg par défaut" hint="Réglable exercice par exercice.">
            <NumberInput
              step="0.5"
              value={settings.defaultIncrementKg}
              onChange={(e) => set({ defaultIncrementKg: Number(e.target.value) })}
            />
          </Field>
          <Field label="Pas des reps">
            <NumberInput
              step="1"
              min="1"
              value={settings.repStep}
              onChange={(e) => set({ repStep: Math.max(1, Number(e.target.value)) })}
            />
          </Field>
          <Field label="Pas du RIR">
            <NumberInput
              step="1"
              min="1"
              value={settings.rirStep}
              onChange={(e) => set({ rirStep: Math.max(1, Number(e.target.value)) })}
            />
          </Field>
        </div>
      </div>

      {/* ── Repos ── */}
      <SectionTitle>Minuteur de repos</SectionTitle>
      <div className="card px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Isolation (s)" hint={formatDuration(settings.restIsoSec)}>
            <NumberInput
              step="15"
              min="0"
              value={settings.restIsoSec}
              onChange={(e) => set({ restIsoSec: Math.max(0, Number(e.target.value)) })}
            />
          </Field>
          <Field label="Polyarticulaire (s)" hint={formatDuration(settings.restPolySec)}>
            <NumberInput
              step="15"
              min="0"
              value={settings.restPolySec}
              onChange={(e) => set({ restPolySec: Math.max(0, Number(e.target.value)) })}
            />
          </Field>
        </div>
        <div className="mt-1 divide-y divide-line-soft">
          <Toggle
            label="Vibration à zéro"
            hint="iOS ignore la vibration web : garde le bip."
            checked={settings.vibrate}
            onChange={(v) => set({ vibrate: v })}
          />
          <Toggle
            label="Bip à zéro"
            checked={settings.beep}
            onChange={(v) => set({ beep: v })}
          />
          <Toggle
            label="Garder l'écran allumé"
            hint="Pendant une séance uniquement."
            checked={settings.keepAwake}
            onChange={(v) => set({ keepAwake: v })}
          />
        </div>
      </div>

      {/* ── Programme ── */}
      <SectionTitle>Programme</SectionTitle>
      <div className="card px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début du programme" hint={`Semaine 1 : ${formatDayShort(settings.startDate)}`}>
            <TextInput
              type="date"
              value={settings.startDate}
              onChange={(e) => e.target.value && set({ startDate: e.target.value })}
            />
          </Field>
          <Field label="Thème">
            <Select value={settings.theme} onChange={(e) => set({ theme: e.target.value as 'sombre' | 'clair' })}>
              <option value="sombre">Sombre</option>
              <option value="clair">Clair</option>
            </Select>
          </Field>
          <Field label="Cible protéines (g/j)">
            <NumberInput
              step="1"
              value={settings.proteinTargetG}
              onChange={(e) => set({ proteinTargetG: Number(e.target.value) })}
            />
          </Field>
          <Field label="Cap de pas (moy./j)">
            <NumberInput
              step="500"
              value={settings.stepCap}
              onChange={(e) => set({ stepCap: Number(e.target.value) })}
            />
          </Field>
        </div>

        <Link
          to="/programme"
          className="mt-4 flex min-h-[44px] items-center justify-between rounded-xl border border-line bg-raised px-4"
        >
          <span className="text-[15px] font-semibold">Éditer les exercices et les cibles</span>
          <span aria-hidden className="text-[18px] text-ink-faint">
            ›
          </span>
        </Link>
      </div>

      {/* ── Zone rouge ── */}
      <SectionTitle>Remise à zéro</SectionTitle>
      <div className="card px-4 py-4">
        <p className="text-[13px] leading-relaxed text-ink-dim">
          Réinstalle le programme d'origine du classeur : 5 séances, 35 exercices, 101 séries.
          L'historique des séances n'est pas touché.
        </p>
        {pendingReset ? (
          <div className="mt-3 flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                void resetProgramToSeed()
                setPendingReset(false)
                setMessage({ tone: 'ok', text: "Programme d'origine réinstallé." })
              }}
            >
              Confirmer
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => setPendingReset(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button variant="danger" full className="mt-3" onClick={() => setPendingReset(true)}>
            Réinstaller le programme d'origine
          </Button>
        )}
      </div>

      <p className="mt-7 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
        Carnet Système Fluide · hors-ligne · aucune donnée ne sort de l'appareil
      </p>
    </Screen>
  )
}
