import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, ErrorCodes } from '../api/client'
import { endpoints } from '../api/endpoints'
import type { Preset } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AutoFitPanel } from '../components/AutoFitPanel'
import { CareerSelect } from '../components/CareerSelect'
import { FitResults } from '../components/FitResults'
import { FormationStyleChips } from '../components/FormationStyleChips'
import { ProtectLeadCard } from '../components/ProtectLeadCard'
import { SetupChips } from '../components/SetupChips'
import { TeamSetup } from '../components/TeamSetup'
import { Pitch, pitchSlotsOf } from '../components/squadBuilder/Pitch'
import type { SlotView } from '../components/squadBuilder/PositionCard'
import { SlotModal, type SlotTab } from '../components/squadBuilder/SlotModal'
import { SquadSummaryCard } from '../components/squadBuilder/SquadSummaryCard'
import { Button, Card, ErrorBox, Field, Pill, Select, Spinner } from '../components/ui'
import { Chip, Segmented, StatTile } from '../design/components/primitives'
import { isV3 } from '../design/uiVersion'
import { SquadRoleDialog, SquadWorkspaceView } from '../features/squad/SquadWorkspaceView'
import { TacticCodeCard } from '../features/squad/TacticCodeCard'
import type { SlotPanel } from '../features/squad/types'
import { careerSlotTabs } from '../features/squad/careerSlotTabs'
import { useCareerBinding } from '../features/squad/useCareerBinding'
import { useSlotFits } from '../features/squad/useSlotFits'
import { fitDisplay } from '../lib/fitLabels'
import { useSquadWorkspace } from '../features/squad/useSquadWorkspace'
import { canPlaySlot, formationName } from '../lib/positions'
import { roleBaseName } from '../lib/squadBuilder'
import { profileOf } from '../lib/wizard'
import { useActiveCareerId } from '../state/careerStore'
import { DEFAULT_SETUP } from '../state/tacticStore'

const AUTO_FIT = '__auto_fit__'

export function SquadBuilderPage() {
  const careerId = useActiveCareerId()
  const { authenticated } = useAuth()
  const queryClient = useQueryClient()
  const [autoFit, setAutoFit] = useState(false)

  const presets = useQuery({ queryKey: ['presets'], queryFn: () => endpoints.presets() })
  const tags = useQuery({ queryKey: ['tags-all'], queryFn: () => endpoints.behaviorTags() })
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers, enabled: authenticated })
  const career = careers.data?.find((c) => c.id === careerId)
  const hasCareer = authenticated && careerId !== undefined
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId!), enabled: hasCareer })
  const { binding, playerById } = useCareerBinding(careerId, squad.data)
  const ws = useSquadWorkspace('career', binding)
  const { state, formation, roles, roleBySlot, selection, selectedSlot: dialogSlot } = ws
  const assignments = state.assigned
  const setup = state.setup ?? DEFAULT_SETUP

  const analyse = useMutation({
    mutationFn: () => endpoints.fitSquad({ careerId: careerId!, tactic: ws.tactic }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  const analysis = analyse.data?.result
  const outOfCredit = analyse.error instanceof ApiError && analyse.error.code === ErrorCodes.insufficientCredit

  const preset = presets.data?.find((p) => p.id === state.presetId)
  const roleById = useMemo(() => new Map((roles.data ?? []).map((r) => [r.id, r])), [roles.data])

  const slotRole = (slotId: string, fallback: string) => roleBySlot.get(slotId)?.roleId ?? state.roleOverride[slotId] ?? fallback
  const slotTags = (slotId: string) => state.tags[slotId] ?? []

  const { fitBySlot } = useSlotFits(ws, playerById)

  const views: SlotView[] = ws.slots.map((slot) => {
    const player = playerById.get(assignments[slot.slotId])
    const role = roleById.get(slotRole(slot.slotId, slot.defaultRole))
    const fit = fitBySlot.get(slot.slotId)
    return {
      slotId: slot.slotId,
      position: slot.position,
      x: slot.x,
      y: slot.y,
      player: player && { id: player.id, name: player.name, overall: player.overall, faceUrl: player.faceUrl, club: player.club, league: player.league, nationality: player.nationality, faceStats: player.faceStats, faceLabels: player.faceLabels, faceStatsApproximate: player.faceStatsApproximate },
      roleLabel: role ? `${roleBaseName(role)} · ${role.focus}` : '…',
      fit: fit && { pct: fitDisplay(fit).pct, band: fit.badge },
      selected: selection?.slotId === slot.slotId,
    }
  })
  const weakReasons = Object.fromEntries([...fitBySlot].map(([slotId, fit]) => [slotId, fit?.reasons[0]]))

  const autoFill = useMutation({
    mutationFn: () => endpoints.lineup(careerId!, ws.tactic),
    onSuccess: (result) => {
      const next: Record<string, number> = {}
      result.slots.forEach((s) => {
        if (s.playerId !== undefined) {
          next[s.slotId] = s.playerId
        }
      })
      ws.patch({ assigned: next })
    },
  })

  const autoFilled = useRef<string>('')
  useEffect(() => {
    const key = `${careerId}|${formation?.id}`
    if (hasCareer && formation && !ws.stale && (squad.data?.length ?? 0) >= 11 && Object.keys(assignments).length === 0 && autoFilled.current !== key && !autoFill.isPending) {
      autoFilled.current = key
      autoFill.mutate()
    }
  }, [hasCareer, careerId, formation, ws.stale, squad.data, assignments, autoFill])

  function applyPreset(p: Preset) {
    const profile = profileOf(p)
    const next = ws.formations.data?.find((f) => f.id === p.formation)
    ws.patch((cur) => ({
      formationId: p.formation,
      presetId: p.id,
      roleOverride: {},
      tags: Object.fromEntries(Object.entries(p.slotTags ?? {})),
      setup: { buildUp: profile.buildUp, depth: profile.depth },
      ...(next && p.formation !== cur.formationId ? { assigned: binding.carry(ws.slots, cur.assigned, next.slots) } : {}),
    }))
    ws.clearSelection()
  }

  function changeFormation(id: string) {
    ws.changeFormation(id, preset?.formation === id)
  }

  if (ws.formations.isLoading || presets.isLoading) {
    return <Spinner />
  }

  const dialogRoleId = dialogSlot ? slotRole(dialogSlot.slotId, dialogSlot.defaultRole) : ''
  const candidates = dialogSlot ? (squad.data ?? []).filter((c) => !c.loanedOut && canPlaySlot(c.player.positions, dialogSlot.position)) : []
  const dialogTags = dialogSlot ? (tags.data ?? []).filter((t) => t.position === dialogSlot.group) : []
  const dialogRoles = dialogSlot ? (roles.data ?? []).filter((r) => r.positions.includes(dialogSlot.position)) : []

  const slotTabs: SlotTab[] = dialogSlot
    ? careerSlotTabs({
        ws,
        slot: dialogSlot,
        hasCareer,
        careerId: career?.id,
        candidates,
        roleId: dialogRoleId,
        slotTags: slotTags(dialogSlot.slotId),
        dialogTags,
        dialogRoles,
        preset,
      })
    : []
  const tacticCode = <TacticCodeCard mode="career" tactic={ws.tactic} resolved={ws.resolved.data} onLoaded={(r) => { setAutoFit(false); ws.applyImportedCode(r) }} />
  const resetBehaviors = () => {
    ws.patch({ roleOverride: {}, tags: {}, presetId: undefined })
    ws.clearSelection()
  }
  const pitchHint = hasCareer
    ? 'Oyuncuyu başka bir karta sürükle: yer değiştirirler · karta tıkla: oyuncu seç · rol etiketine tıkla: rol ve odak · ✕: oyuncuyu kaldır.'
    : 'Oyuncu atamak için giriş yapıp bir kariyer seç; taktiği kariyersiz de kurabilirsin.'

  if (isV3()) {
    const placed = views.filter((v) => v.player)
    const fitted = placed.filter((v) => v.fit)
    const weakest = fitted.length ? fitted.reduce((a, b) => ((a.fit?.pct ?? 0) <= (b.fit?.pct ?? 0) ? a : b)) : undefined
    const panel: SlotPanel | undefined = selection?.panel === 'role' ? undefined : selection?.panel
    const current = slotTabs.find((t) => t.id === panel) ?? slotTabs[0]
    return (
      <>
        <SquadWorkspaceView
          title="Kariyer Kadro Kurucu"
          slots={pitchSlotsOf(views)}
          selectedSlotId={dialogSlot?.slotId}
          onPickPlayer={(slotId) => ws.select(slotId, 'card')}
          onPickRole={(slotId) => ws.select(slotId, 'role')}
          onRemove={(slotId) => ws.assign(slotId, null)}
          onSwap={hasCareer ? ws.swap : undefined}
          pitchHint={pitchHint}
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
          onFormation={changeFormation}
          setup={setup}
          onSetup={(next) => ws.patch((cur) => ({ setup: { ...(cur.setup ?? DEFAULT_SETUP), ...next } }))}
          squadNameKey="fc.squadName.career"
          ratingStars={placed.length ? Math.round(placed.reduce((s, v) => s + (v.player?.overall ?? 0), 0) / placed.length) : undefined}
          allAverages={[{ label: 'Rol uyumu', value: fitted.length ? `%${Math.round(fitted.reduce((s, v) => s + (v.fit?.pct ?? 0), 0) / fitted.length)}` : undefined }, { label: 'Dolu', value: `${placed.length}/11` }]}
          stats={[
            { label: 'Ort. OVR', value: placed.length ? Math.round(placed.reduce((s, v) => s + (v.player?.overall ?? 0), 0) / placed.length) : undefined },
            { label: 'Dolu', value: placed.length, suffix: '/ 11' },
          ]}
          averages={ws.averages}
          sections={
            <section aria-label="Rol uyumu" className="space-y-2">
              <CareerSelect />
              <h3 className="font-display text-lg font-semibold">Rol uyumu</h3>
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="Kadro uyumu" value={fitted.length ? `%${Math.round(fitted.reduce((s, v) => s + (v.fit?.pct ?? 0), 0) / fitted.length)}` : undefined} />
                <StatTile label="En zayıf" value={weakest ? `${weakest.position} %${weakest.fit?.pct}` : undefined} />
              </div>
              {weakest && weakReasons[weakest.slotId] && <p className="text-xs text-muted">{weakReasons[weakest.slotId]}</p>}
              {preset && <Chip tone="info">{preset.name}</Chip>}
              <ErrorBox error={ws.resolved.error ?? autoFill.error ?? squad.error} />
            </section>
          }
          tacticCode={tacticCode}
          onClear={() => ws.clearAssigned()}
          clearDisabled={Object.keys(assignments).length === 0}
          clearLabel="Oyuncuları temizle"
          note={ws.note}
          actions={
            <>
              <Button disabled={!hasCareer || autoFill.isPending || (squad.data?.length ?? 0) < 11} onClick={() => autoFill.mutate()}>
                {autoFill.isPending ? 'Diziliyor…' : "En iyi 11'i diz"}
              </Button>
              <Button variant="ghost" onClick={resetBehaviors}>Davranışları sıfırla</Button>
            </>
          }
          notice={!hasCareer ? { id: 'career-login', text: <>Oyuncu atamak için <Link to="/login" className="text-accent underline">giriş yap</Link> ve bir kariyer seç; taktiği kariyersiz de kurabilirsin.</> } : undefined}
        />
        <SquadRoleDialog ws={ws} />
      </>
    )
  }

  return (
    <div className="space-y-4">
      {autoFit && ws.formations.data && presets.data && <AutoFitPanel formations={ws.formations.data} presets={presets.data} setup={setup} />}

      <div className="flex flex-wrap items-center gap-3">
        <CareerSelect />
        <Button variant="secondary" disabled={!hasCareer || autoFill.isPending || (squad.data?.length ?? 0) < 11} onClick={() => autoFill.mutate()}>
          {autoFill.isPending ? 'Diziliyor…' : "En iyi 11'i diz"}
        </Button>
        <Button variant="ghost" onClick={resetBehaviors}>
          Davranışları sıfırla
        </Button>
      </div>
      <ErrorBox error={ws.resolved.error ?? autoFill.error ?? squad.error} />

      <div className="grid items-start gap-4 min-[820px]:grid-cols-[360px_1fr]">
        <div className="order-2 flex flex-col gap-3.5 min-[820px]:order-1">
          {tacticCode}
          <SquadSummaryCard formations={ws.formations.data ?? []} formationId={formation?.id ?? ''} onFormation={changeFormation} views={views} weakReasons={weakReasons} />
          <section className="rounded-md border border-line bg-surface p-3.5 text-ink">
            <h2 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[1.5px] text-accent">Taktik felsefesi</h2>
            <Field label="Oyun felsefesi">
              <Select
                value={autoFit ? AUTO_FIT : state.presetId ?? ''}
                onChange={(e) => {
                  if (e.target.value === AUTO_FIT) {
                    setAutoFit(true)
                    return
                  }
                  setAutoFit(false)
                  const p = presets.data?.find((x) => x.id === e.target.value)
                  if (p) {
                    applyPreset(p)
                  }
                }}
              >
                <option value="">Seçiniz…</option>
                <optgroup label="Benim / otomatik">
                  {presets.data?.filter((p) => p.kind === 'PERSONAL').map((p) => (
                    <option key={p.id} value={p.id}>Benim oyun anlayışım — {p.name}</option>
                  ))}
                  <option value={AUTO_FIT}>Takıma göre en iyi taktik (Auto-Fit)</option>
                </optgroup>
                <optgroup label="Oyun felsefeleri">
                  {presets.data?.filter((p) => p.kind === 'STYLE').map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              </Select>
            </Field>
            <Link to="/replicas" className="mt-2 inline-block text-xs font-semibold text-accent underline underline-offset-2">106 gerçek takım replikası →</Link>
            <FormationStyleChips formationId={formation?.id} />
            {preset?.signature && <p className="mt-2 text-sm text-ink/80">{preset.signature}</p>}
            <SetupChips settings={preset?.settings} />
            {preset?.sourceNote && <p className="mt-1 text-xs text-muted">{preset.sourceNote}</p>}
          </section>
          <TeamSetup careerId={careerId} />
          <ProtectLeadCard slots={ws.resolved.data?.slots ?? []} roles={roles.data ?? []} />
        </div>

        <div className="order-1 space-y-2 min-[820px]:order-2">
          <div className="rounded-md border border-line bg-surface p-2.5">
            <Pitch
              slots={views}
              onPickPlayer={(slotId) => ws.select(slotId, 'card')}
              onPickRole={(slotId) => ws.select(slotId, 'role')}
              onRemove={(slotId) => ws.assign(slotId, null)}
              onSwap={hasCareer ? ws.swap : undefined}
            />
            <p className="mt-2 px-1 text-xs text-muted">{pitchHint}</p>
          </div>
        </div>
      </div>

      <Card title="Kadro analizi" actions={<Pill tone="amber">Kredi harcar</Pill>}>
        {!authenticated ? (
          <p className="text-sm">
            Kendi kadronla uyumu, zayıf halkaları ve kimin kalıp kimin gitmesi gerektiğini görmek için <Link to="/login" className="text-accent underline">giriş yap</Link>.
          </p>
        ) : (
          <div className="space-y-2">
            <Button disabled={careerId === undefined || analyse.isPending} onClick={() => analyse.mutate()}>
              {analyse.isPending ? 'Hesaplanıyor…' : 'Mevcut taktiği analiz et'}
            </Button>
            <ErrorBox error={analyse.error} />
            {outOfCredit && (
              <p className="text-sm">
                Günlük krediler yarın yenilenir ya da <Link to="/profile" className="text-accent underline">PREMIUM</Link> ile sınırsız kullanabilirsin.
              </p>
            )}
            <p className="text-xs text-muted">Teknik hatada kredi iade edilir.</p>
          </div>
        )}
      </Card>
      {analysis && (
        <FitResults
          result={analysis}
          squad={squad.data ?? []}
          budgetEur={career?.budgetEur}
          chargedText={analyse.data && analyse.data.charged > 0 ? `${analyse.data.charged} kredi harcandı${analyse.data.balance !== undefined ? ` · kalan ${analyse.data.balance}` : ''}.` : undefined}
        />
      )}

      {selection && dialogSlot && (
        <SlotModal
          title={`${dialogSlot.slotId} · ${dialogSlot.position}`}
          hint="Oyuncu, rol, davranışlar ve öneriler"
          active={selection.panel}
          onTab={(tab) => ws.select(dialogSlot.slotId, tab as SlotPanel)}
          onClose={ws.clearSelection}
          tabs={slotTabs}
        />
      )}
    </div>
  )
}
