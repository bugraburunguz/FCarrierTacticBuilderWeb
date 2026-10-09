import { useEaRoleSet } from '../lib/eaRoles'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { SlotSuggestions } from '../components/SlotSuggestions'
import { TeamSetup } from '../components/TeamSetup'
import { BehaviorsPanel } from '../components/squadBuilder/BehaviorsPanel'
import { EaCodeCard } from '../components/squadBuilder/EaCodeCard'
import { PlayerSelectPanel } from '../components/squadBuilder/PlayerSelectModal'
import { Pitch } from '../components/squadBuilder/Pitch'
import type { SlotView } from '../components/squadBuilder/PositionCard'
import { RoleFocusPanel } from '../components/squadBuilder/RoleFocusModal'
import { SlotModal } from '../components/squadBuilder/SlotModal'
import { SquadSummaryCard } from '../components/squadBuilder/SquadSummaryCard'
import { Button, Card, ErrorBox, Field, Pill, Select, Spinner } from '../components/ui'
import { canPlaySlot } from '../lib/positions'
import { remapAssignments, roleBaseName, roleGroups, swapSlots } from '../lib/squadBuilder'
import { profileOf } from '../lib/wizard'
import { useActiveCareerId } from '../state/careerStore'
import { lineupStore, useLineup } from '../state/lineupStore'
import { tacticStore, toTacticRequest, useTactic } from '../state/tacticStore'

const AUTO_FIT = '__auto_fit__'

type Dialog = { slotId: string; tab: 'player' | 'role' | 'behaviors' | 'suggest' }

export function SquadBuilderPage() {
  const careerId = useActiveCareerId()
  const tactic = useTactic()
  const { authenticated } = useAuth()
  const queryClient = useQueryClient()
  const assignments = useLineup(careerId)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [autoFit, setAutoFit] = useState(false)

  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations })
  const presets = useQuery({ queryKey: ['presets'], queryFn: () => endpoints.presets() })
  const tags = useQuery({ queryKey: ['tags-all'], queryFn: () => endpoints.behaviorTags() })
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles, staleTime: Infinity })
  const eaRoles = useEaRoleSet()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers, enabled: authenticated })
  const career = careers.data?.find((c) => c.id === careerId)
  const hasCareer = authenticated && careerId !== undefined
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId!), enabled: hasCareer })
  const request = toTacticRequest(tactic)
  const resolved = useQuery({ queryKey: ['resolve', JSON.stringify(request)], queryFn: () => endpoints.resolveTactic(request), retry: false })

  const analyse = useMutation({
    mutationFn: () => endpoints.fitSquad({ careerId: careerId!, tactic: toTacticRequest(tactic) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  const analysis = analyse.data?.result
  const outOfCredit = analyse.error instanceof ApiError && analyse.error.code === ErrorCodes.insufficientCredit

  const formation = formations.data?.find((f) => f.id === tactic.formation)
  const preset = presets.data?.find((p) => p.id === tactic.presetId)
  const roleById = useMemo(() => new Map((roles.data ?? []).map((r) => [r.id, r])), [roles.data])
  const playerById = useMemo(() => new Map((squad.data ?? []).map((c) => [c.player.id, c.player])), [squad.data])
  const resolvedBySlot = useMemo(() => new Map((resolved.data?.slots ?? []).map((s) => [s.slotId, s])), [resolved.data])
  const replicaGroups = useMemo(() => {
    const groups = new Map<string, Preset[]>()
    ;(presets.data ?? []).filter((p) => p.kind === 'REPLICA').forEach((p) => groups.set(p.club ?? 'Diğer', [...(groups.get(p.club ?? 'Diğer') ?? []), p]))
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'tr')).map(([club, items]) => [club, [...items].sort((a, b) => (a.season ?? '').localeCompare(b.season ?? ''))] as [string, Preset[]])
  }, [presets.data])

  const slotRole = (slotId: string, fallback: string) => resolvedBySlot.get(slotId)?.roleId ?? tactic.slots[slotId]?.roleId ?? fallback
  const slotTags = (slotId: string) => tactic.slots[slotId]?.tags ?? []

  const fitSlots = (formation?.slots ?? []).filter((s) => assignments[s.slotId] !== undefined && playerById.has(assignments[s.slotId]))
  const fits = useQueries({
    queries: fitSlots.map((s) => {
      const roleId = slotRole(s.slotId, s.defaultRole)
      return {
        queryKey: ['slot-fit', assignments[s.slotId], roleId, s.position, slotTags(s.slotId).join(',')],
        queryFn: () => endpoints.fitRole({ playerId: assignments[s.slotId], roleId, position: s.position, tags: slotTags(s.slotId) }),
        staleTime: 300_000,
        retry: false,
      }
    }),
  })
  const fitBySlot = new Map(fitSlots.map((s, i) => [s.slotId, fits[i]?.data?.roleFit]))

  const views: SlotView[] = (formation?.slots ?? []).map((slot) => {
    const player = playerById.get(assignments[slot.slotId])
    const role = roleById.get(slotRole(slot.slotId, slot.defaultRole))
    const fit = fitBySlot.get(slot.slotId)
    return {
      slotId: slot.slotId,
      position: slot.position,
      x: slot.x,
      y: slot.y,
      player: player && { id: player.id, name: player.name, overall: player.overall },
      roleLabel: role ? `${roleBaseName(role)} · ${role.focus}` : '…',
      fit: fit && { pct: Math.round(fit.score), band: fit.badge },
      selected: dialog?.slotId === slot.slotId,
    }
  })
  const weakReasons = Object.fromEntries([...fitBySlot].map(([slotId, fit]) => [slotId, fit?.reasons[0]]))

  const autoFill = useMutation({
    mutationFn: () => endpoints.lineup(careerId!, request),
    onSuccess: (result) => {
      const next: Record<string, number> = {}
      result.slots.forEach((s) => {
        if (s.playerId !== undefined) {
          next[s.slotId] = s.playerId
        }
      })
      lineupStore.set(careerId!, next)
    },
  })

  const autoFilled = useRef<string>('')
  useEffect(() => {
    const key = `${careerId}|${tactic.formation}`
    if (hasCareer && formation && (squad.data?.length ?? 0) >= 11 && Object.keys(assignments).length === 0 && autoFilled.current !== key && !autoFill.isPending) {
      autoFilled.current = key
      autoFill.mutate()
    }
  }, [hasCareer, careerId, formation, squad.data, assignments, tactic.formation, autoFill])

  useEffect(() => {
    if (formations.data && !formation) {
      tacticStore.set({ formation: '4-3-3', slots: {} })
    }
  }, [formations.data, formation])

  function changeFormation(id: string) {
    const next = formations.data?.find((f) => f.id === id)
    if (!next) {
      return
    }
    if (careerId !== undefined) {
      lineupStore.set(careerId, remapAssignments(assignments, (pid) => playerById.get(pid)?.positions, next.slots))
    }
    tacticStore.set({ formation: id, presetId: preset?.formation === id ? tactic.presetId : undefined, slots: preset?.formation === id ? tactic.slots : {}, setup: tactic.setup })
    setDialog(null)
  }

  function applyPreset(p: Preset) {
    const slots: Record<string, { tags: string[] }> = {}
    Object.entries(p.slotTags ?? {}).forEach(([slotId, ids]) => (slots[slotId] = { tags: ids }))
    const profile = profileOf(p)
    const next = formations.data?.find((f) => f.id === p.formation)
    if (careerId !== undefined && next && p.formation !== tactic.formation) {
      lineupStore.set(careerId, remapAssignments(assignments, (pid) => playerById.get(pid)?.positions, next.slots))
    }
    tacticStore.set({ formation: p.formation, presetId: p.id, slots, setup: { buildUp: profile.buildUp, depth: profile.depth } })
    setDialog(null)
  }

  function updateSlot(slotId: string, change: { tags?: string[]; roleId?: string | undefined }) {
    const current = tactic.slots[slotId] ?? { tags: [] }
    tacticStore.set({ ...tactic, slots: { ...tactic.slots, [slotId]: { ...current, ...change } } })
  }

  function pickPlayer(slotId: string, playerId: number | null) {
    if (careerId === undefined) {
      return
    }
    const next = { ...assignments }
    if (playerId === null) {
      delete next[slotId]
    } else {
      Object.keys(next).forEach((k) => {
        if (next[k] === playerId) {
          delete next[k]
        }
      })
      next[slotId] = playerId
    }
    lineupStore.set(careerId, next)
    setDialog(null)
  }

  function swapPlayers(from: string, to: string) {
    if (careerId !== undefined) {
      lineupStore.set(careerId, swapSlots(assignments, from, to))
    }
  }

  if (formations.isLoading || presets.isLoading) {
    return <Spinner />
  }

  const dialogSlot = formation?.slots.find((s) => s.slotId === dialog?.slotId)
  const dialogRoleId = dialogSlot ? slotRole(dialogSlot.slotId, dialogSlot.defaultRole) : ''
  const candidates = dialogSlot ? (squad.data ?? []).filter((c) => !c.loanedOut && canPlaySlot(c.player.positions, dialogSlot.position)) : []
  const dialogTags = dialogSlot ? (tags.data ?? []).filter((t) => t.position === dialogSlot.group) : []
  const dialogRoles = dialogSlot ? (roles.data ?? []).filter((r) => r.positions.includes(dialogSlot.position)) : []

  return (
    <div className="space-y-4">
      {autoFit && formations.data && presets.data && <AutoFitPanel formations={formations.data} presets={presets.data} setup={tactic.setup} />}

      <div className="flex flex-wrap items-center gap-3">
        <CareerSelect />
        <Button variant="secondary" disabled={!hasCareer || autoFill.isPending || (squad.data?.length ?? 0) < 11} onClick={() => autoFill.mutate()}>
          {autoFill.isPending ? 'Diziliyor…' : "En iyi 11'i diz"}
        </Button>
        <Button variant="ghost" onClick={() => { tacticStore.set({ formation: tactic.formation, slots: {}, setup: tactic.setup }); setDialog(null) }}>
          Davranışları sıfırla
        </Button>
      </div>
      <ErrorBox error={resolved.error ?? autoFill.error ?? squad.error} />

      <div className="grid items-start gap-4 min-[820px]:grid-cols-[360px_1fr]">
        <div className="order-2 flex flex-col gap-3.5 min-[820px]:order-1">
          <EaCodeCard onImported={() => { setAutoFit(false); setDialog(null) }} />
          <SquadSummaryCard formations={formations.data ?? []} formationId={tactic.formation} onFormation={changeFormation} views={views} weakReasons={weakReasons} />
          <section className="rounded-md border border-line bg-surface p-3.5 text-ink">
            <h2 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[1.5px] text-accent">Taktik felsefesi</h2>
            <Field label="Preset / replika">
              <Select
                value={autoFit ? AUTO_FIT : tactic.presetId ?? ''}
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
                {replicaGroups.map(([club, items]) => (
                  <optgroup key={club} label={club}>
                    {items.map((p) => (
                      <option key={p.id} value={p.id}>{p.season ? `${p.season} · ` : ''}{p.coach ?? p.name}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <FormationStyleChips formationId={tactic.formation} />
            {preset?.signature && <p className="mt-2 text-sm text-ink/80">{preset.signature}</p>}
            <SetupChips settings={preset?.settings} />
            {preset?.sourceNote && <p className="mt-1 text-xs text-muted">{preset.sourceNote}</p>}
          </section>
          <TeamSetup careerId={careerId} />
          <ProtectLeadCard slots={resolved.data?.slots ?? []} roles={roles.data ?? []} />
        </div>

        <div className="order-1 space-y-2 min-[820px]:order-2">
          <div className="rounded-md border border-line bg-surface p-2.5">
            <Pitch
              slots={views}
              onPickPlayer={(slotId) => setDialog({ slotId, tab: 'player' })}
              onPickRole={(slotId) => setDialog({ slotId, tab: 'role' })}
              onRemove={(slotId) => pickPlayer(slotId, null)}
              onSwap={hasCareer ? swapPlayers : undefined}
            />
            <p className="mt-2 px-1 text-xs text-muted">
              Oyuncuyu başka bir karta sürükle: yer değiştirirler · karta tıkla: oyuncu seç · rol etiketine tıkla: rol ve odak · popup'ta Davranışlar ve Öneriler sekmeleri de var · ✕: oyuncuyu kaldır.
              {!hasCareer && ' Oyuncu atamak için giriş yapıp bir kariyer seç; taktiği kariyersiz de kurabilirsin.'}
            </p>
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

      {dialog && dialogSlot && (
        <SlotModal
          title={`${dialogSlot.slotId} · ${dialogSlot.position}`}
          hint="Oyuncu, rol, davranışlar ve öneriler"
          active={dialog.tab}
          onTab={(tab) => setDialog({ slotId: dialog.slotId, tab: tab as Dialog['tab'] })}
          onClose={() => setDialog(null)}
          tabs={[
            {
              id: 'player',
              label: 'Oyuncu',
              node: hasCareer ? (
                <PlayerSelectPanel
                  position={dialogSlot.position}
                  roleId={dialogRoleId}
                  tags={slotTags(dialogSlot.slotId)}
                  candidates={candidates}
                  currentPlayerId={assignments[dialogSlot.slotId]}
                  onPick={(pid) => pickPlayer(dialogSlot.slotId, pid)}
                />
              ) : (
                <p className="text-sm text-ink/80">Oyuncu atamak için giriş yapıp bir kariyer seç. Öneriler sekmesi kariyersiz de çalışır.</p>
              ),
            },
            {
              id: 'role',
              label: 'Rol & odak',
              node: (
                <RoleFocusPanel
                  position={dialogSlot.position}
                  groups={roleGroups(roles.data ?? [], dialogSlot.position, eaRoles)}
                  currentRoleId={dialogRoleId}
                  onApply={(rid) => {
                    updateSlot(dialogSlot.slotId, { roleId: rid })
                    setDialog(null)
                  }}
                  onClose={() => setDialog(null)}
                />
              ),
            },
            {
              id: 'behaviors',
              label: 'Davranışlar',
              node: (
                <BehaviorsPanel
                  derivedRoleName={resolvedBySlot.get(dialogSlot.slotId)?.roleName}
                  roleHint={preset?.roleHints?.[dialogSlot.slotId]}
                  tags={dialogTags}
                  selected={slotTags(dialogSlot.slotId)}
                  onTags={(next) => updateSlot(dialogSlot.slotId, { tags: next })}
                  roleOverride={tactic.slots[dialogSlot.slotId]?.roleId}
                  roles={dialogRoles}
                  onRole={(rid) => updateSlot(dialogSlot.slotId, { roleId: rid })}
                />
              ),
            },
            {
              id: 'suggest',
              label: 'Öneriler',
              node: <SlotSuggestions roleId={resolvedBySlot.get(dialogSlot.slotId)?.roleId} position={dialogSlot.position} tags={slotTags(dialogSlot.slotId)} gender={career?.gender} setup={tactic.setup} />,
            },
          ]}
        />
      )}
    </div>
  )
}
