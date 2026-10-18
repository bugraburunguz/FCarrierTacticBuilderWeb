import { Link } from 'react-router-dom'
import { CareerSelect } from '../../components/CareerSelect'
import { ErrorBox, Spinner } from '../../components/ui'
import { Button, Chip, Segmented, StatTile } from '../../design/components/primitives'
import { formationName } from '../../lib/positions'
import { DEFAULT_SETUP } from '../../state/tacticStore'
import { pitchSlotsOf } from './pitchSlots'
import { SquadRoleDialog, SquadWorkspaceView } from './SquadWorkspaceView'
import { TacticCodeCard } from './TacticCodeCard'
import type { SlotPanel } from './types'
import { useCareerSquadBuilder } from './useCareerSquadBuilder'
import { teamFitPct } from './useSlotFits'

const pctText = (value?: number) => (value === undefined ? undefined : `%${value}`)

/** v3 kariyer kadro kurucusu (/squad/builder): ortak kadro çekirdeği (08 §3 + §14-16: saha kahraman, sağda yapışkan panel). Mantık useCareerSquadBuilder'da. */
export function CareerSquadBuilderPage() {
  const b = useCareerSquadBuilder()
  const { ws, views, slotTabs, setup, preset, weakReasons, autoFill, hasCareer } = b
  const { selection, selectedSlot: dialogSlot, formation } = ws

  if (b.loading) {
    return <Spinner />
  }

  const placed = views.filter((v) => v.player)
  const fitted = placed.filter((v) => v.fit)
  const weakest = fitted.length ? fitted.reduce((a, c) => ((a.fit?.pct ?? 0) <= (c.fit?.pct ?? 0) ? a : c)) : undefined
  const panel: SlotPanel | undefined = selection?.panel === 'role' ? undefined : selection?.panel
  const current = slotTabs.find((t) => t.id === panel) ?? slotTabs[0]
  const avgOvr = placed.length ? Math.round(placed.reduce((s, v) => s + (v.player?.overall ?? 0), 0) / placed.length) : undefined

  return (
    <>
      <SquadWorkspaceView
        title="Kariyer Kadro Kurucu"
        slots={pitchSlotsOf(views)}
        eaCards
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
        squadNameKey="fc.squadName.career"
        ratingStars={avgOvr}
        allAverages={[{ label: 'Rol uyumu', value: pctText(teamFitPct(fitted.flatMap((v) => (v.fit ? [v.fit] : [])))) }, { label: 'Dolu', value: `${placed.length}/11` }]}
        stats={[
          { label: 'Ort. OVR', value: avgOvr },
          { label: 'Dolu', value: placed.length, suffix: '/ 11' },
        ]}
        averages={ws.averages}
        sections={
          <section aria-label="Rol uyumu" className="space-y-2">
            <CareerSelect />
            <h3 className="font-display text-lg font-semibold">Rol uyumu</h3>
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Kadro uyumu" value={pctText(teamFitPct(fitted.flatMap((v) => (v.fit ? [v.fit] : []))))} />
              <StatTile label="En zayıf" value={weakest ? `${weakest.position} %${weakest.fit?.pct}` : undefined} />
            </div>
            {weakest && weakReasons[weakest.slotId] && <p className="text-xs text-muted">{weakReasons[weakest.slotId]}</p>}
            {preset && <Chip tone="info">{preset.name}</Chip>}
            <ErrorBox error={ws.resolved.error ?? autoFill.error ?? b.squad.error} />
          </section>
        }
        tacticCode={<TacticCodeCard mode="career" tactic={ws.tactic} resolved={ws.resolved.data} onLoaded={ws.applyImportedCode} />}
        onClear={() => ws.clearAssigned()}
        clearDisabled={Object.keys(ws.state.assigned).length === 0}
        clearLabel="Oyuncuları temizle"
        note={ws.note}
        actions={
          <>
            <Button disabled={!b.canAutoFill} onClick={() => autoFill.mutate()}>
              {autoFill.isPending ? 'Diziliyor…' : "En iyi 11'i diz"}
            </Button>
            <Button variant="ghost" onClick={b.resetBehaviors}>Davranışları sıfırla</Button>
          </>
        }
        notice={!hasCareer ? { id: 'career-login', text: <>Oyuncu atamak için <Link to="/login" className="text-accent underline">giriş yap</Link> ve bir kariyer seç; taktiği kariyersiz de kurabilirsin.</> } : undefined}
      />
      <SquadRoleDialog ws={ws} />
    </>
  )
}
