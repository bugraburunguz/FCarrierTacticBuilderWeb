import { useEffect, useState } from 'react'
import { ErrorBox, Spinner } from '../../components/ui'
import { Button, Chip, Segmented, StatTile } from '../../design/components/primitives'
import { formationName } from '../../lib/positions'
import { DEFAULT_SETUP } from '../../lib/tactic'
import { pitchSlotsOf } from '../squad/pitchSlots'
import { SquadRoleDialog, SquadWorkspaceView } from '../squad/SquadWorkspaceView'
import { TacticCodeCard } from '../squad/TacticCodeCard'
import type { SlotPanel } from '../squad/types'
import { useCareerSquadBuilder } from '../squad/useCareerSquadBuilder'
import { betterRoleText, FIT_TERMS, teamRoleFit, teamStrength } from '../../lib/fitLabels'
import { roleGroups } from '../../lib/squadBuilder'
import { TacticRisks } from './TacticRisks'
import { useLabBinding } from './useLabBinding'

const pctText = (value?: number) => (value === undefined ? undefined : `%${value}`)
type MarkerMode = 'card' | 'pawn'
const MARKERS: { id: MarkerMode; label: string }[] = [{ id: 'card', label: 'Kart' }, { id: 'pawn', label: 'Piyon' }]

/**
 * Lab › Kurucu (KARIYER-UX FAZ 4a, 15 §4.3): ortak kadro çekirdeği (SquadWorkspaceView + useCareerSquadBuilder) aktif taslağa yazar (useLabBinding).
 * Saha Cyber-Pitch, varsayılan kart, tek tıkla piyon (Q5). `initialSlot` (?slot=) slot paneli açık gelir.
 */
export function LabBuilder({ initialSlot, onSlotOpened }: { initialSlot?: string; onSlotOpened?: () => void }) {
  const b = useCareerSquadBuilder(useLabBinding)
  const { ws, views, slotTabs, setup, preset, weakReasons, autoFill, hasCareer } = b
  const { selection, selectedSlot: dialogSlot, formation } = ws
  const [marker, setMarker] = useState<MarkerMode>('card')

  useEffect(() => {
    if (initialSlot && ws.slots.some((s) => s.slotId === initialSlot)) {
      ws.select(initialSlot, 'card')
      onSlotOpened?.()
    }
  }, [initialSlot, ws, onSlotOpened])

  if (b.loading) {
    return <Spinner />
  }

  const placed = views.filter((v) => v.player)
  const fitted = placed.filter((v) => v.fit)
  const fitDisplays = fitted.flatMap((v) => (v.fit?.strength === undefined ? [] : [{ strength: v.fit.strength, roleFit: v.fit.roleFit }]))
  const weakest = fitted.length ? fitted.reduce((a, c) => ((a.fit?.pct ?? 0) <= (c.fit?.pct ?? 0) ? a : c)) : undefined
  const panel: SlotPanel | undefined = selection?.panel === 'role' ? undefined : selection?.panel
  const current = slotTabs.find((t) => t.id === panel) ?? slotTabs[0]
  const avgOvr = placed.length ? Math.round(placed.reduce((s, v) => s + (v.player?.overall ?? 0), 0) / placed.length) : undefined
  // FIT-2 madde 6: rol önerici — yalnız oyunda o mevkide olan roller (EA listesi); rol seçici bu oyuncunun değerleriyle sıralı.
  const inGame = (position: string, roleId: string) => roleGroups(ws.roles.data ?? [], position, ws.eaRoles.allowed).some((g) => g.options.some((o) => o.roleId === roleId))
  const suggestions = b.fitRows.filter((r) => r.betterRole && inGame(r.position, r.betterRole.roleId))
  const fitsOf = (slotId: string) => {
    const alternatives = b.fitRows.find((r) => r.slotId === slotId)?.roleAlternatives
    return alternatives ? new Map(alternatives.map((a) => [a.roleId, a])) : undefined
  }

  return (
    <>
      <SquadWorkspaceView
        title="Kurucu"
        slots={pitchSlotsOf(views)}
        eaCards
        field="cyber"
        marker={marker}
        selectedSlotId={dialogSlot?.slotId}
        onPickPlayer={(slotId) => ws.select(slotId, 'card')}
        onPickRole={(slotId) => ws.select(slotId, 'role')}
        onRemove={(slotId) => ws.assign(slotId, null)}
        onSwap={hasCareer ? ws.swap : undefined}
        pitchHint={b.pitchHint}
        slotPanel={
          dialogSlot && panel && current
            ? {
                title: `${dialogSlot.position} — ${current.label}`,
                onClose: ws.clearSelection,
                body: (
                  <div className="space-y-3">
                    <Segmented label="Slot ayarları" value={current.id} options={slotTabs.filter((t) => t.id !== 'role').map((t) => ({ id: t.id, label: t.label }))} onChange={(id) => ws.select(dialogSlot.slotId, id as SlotPanel)} />
                    {current.node}
                  </div>
                ),
              }
            : undefined
        }
        formations={(ws.formations.data ?? []).map((f) => ({ id: f.id, label: formationName(f) }))}
        formationsLoading={ws.formations.isLoading}
        formationsError={ws.formations.error ? 'Formasyonlar yüklenemedi.' : undefined}
        formationId={formation?.id}
        onFormation={b.changeFormation}
        setup={setup}
        onSetup={(next) => ws.patch((cur) => ({ setup: { ...(cur.setup ?? DEFAULT_SETUP), ...next } }))}
        ratingStars={avgOvr}
        allAverages={[{ label: FIT_TERMS.roleFit.team, value: pctText(teamRoleFit(fitDisplays)) }, { label: 'Dolu', value: `${placed.length}/11` }]}
        stats={[
          { label: 'Ort. OVR', value: avgOvr },
          { label: 'Dolu', value: placed.length, suffix: '/ 11' },
        ]}
        averages={ws.averages}
        sections={
          <section aria-label="Uyum" className="space-y-2">
            {/* FIT-1: iki takım değeri iki adla (Takım gücü = Güç ortalaması, Rol oturması). */}
            <h3 className="font-display text-lg font-semibold">Uyum</h3>
            <div className="grid grid-cols-2 gap-2">
              <StatTile label={FIT_TERMS.strength.team} value={pctText(teamStrength(fitDisplays))} />
              <StatTile label={FIT_TERMS.roleFit.team} value={pctText(teamRoleFit(fitDisplays))} />
              <StatTile label="En zayıf" value={weakest ? `${weakest.position} %${weakest.fit?.pct}` : undefined} />
            </div>
            {suggestions.length > 0 && (
              <ul aria-label="Rol önerileri" className="flex flex-col gap-1.5">
                {suggestions.map((r) => (
                  <li key={r.slotId} className="glass-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] p-2 text-xs">
                    <span className="flex min-w-0 flex-col items-start gap-1">
                      <span className="text-ink-2">{r.position} · {r.playerName}</span>
                      <Chip tone="info">{betterRoleText(r.betterRole!)}</Chip>
                    </span>
                    <Button variant="ghost" aria-label={`${r.position}: ${r.betterRole!.roleName} rolünü uygula`} onClick={() => ws.setRole(r.slotId, r.betterRole!.roleId)}>Uygula</Button>
                  </li>
                ))}
              </ul>
            )}
            <TacticRisks careerId={b.careerId} setup={setup} tactic={ws.tactic} assigned={ws.state.assigned} />
            {weakest && weakReasons[weakest.slotId] && <p className="text-xs text-muted">En büyük eksi: <span className="text-ink-2">{weakReasons[weakest.slotId]}</span></p>}
            {preset && <Chip tone="info">{preset.name}</Chip>}
            <ErrorBox error={ws.resolved.error ?? autoFill.error ?? b.squad.error} />
          </section>
        }
        tacticCode={<TacticCodeCard mode="career" tactic={ws.tactic} resolved={ws.resolved.data} onLoaded={ws.applyImportedCode} />}
        onClear={() => ws.clearAssigned()}
        clearDisabled={Object.keys(ws.state.assigned).length === 0}
        clearLabel="Oyuncuları temizle"
        note={ws.note}
        viewToggle={<Segmented label="Saha görünümü" value={marker} options={MARKERS} onChange={setMarker} />}
        actions={
          <>
            <Button disabled={!b.canAutoFill} onClick={() => autoFill.mutate()}>
              {autoFill.isPending ? 'Diziliyor…' : "En iyi 11'i diz"}
            </Button>
            <Button variant="ghost" onClick={b.resetBehaviors}>Davranışları sıfırla</Button>
          </>
        }
      />
      <SquadRoleDialog ws={ws} fitsOf={fitsOf} />
    </>
  )
}
