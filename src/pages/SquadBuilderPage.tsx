import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { endpoints } from '../api/endpoints'
import { CareerSelect } from '../components/CareerSelect'
import { PlayerSelectModal } from '../components/squadBuilder/PlayerSelectModal'
import { Pitch } from '../components/squadBuilder/Pitch'
import type { SlotView } from '../components/squadBuilder/PositionCard'
import { RoleFocusModal } from '../components/squadBuilder/RoleFocusModal'
import { EaCodeCard } from '../components/squadBuilder/EaCodeCard'
import { SquadSummaryCard } from '../components/squadBuilder/SquadSummaryCard'
import { TeamSetup } from '../components/TeamSetup'
import { Button, Card, EmptyState, ErrorBox, Spinner } from '../components/ui'
import { canPlaySlot } from '../lib/positions'
import { remapAssignments, roleBaseName, roleGroups } from '../lib/squadBuilder'
import { useActiveCareerId } from '../state/careerStore'
import { lineupStore, useLineup } from '../state/lineupStore'
import { tacticStore, toTacticRequest, useTactic } from '../state/tacticStore'

type Dialog = { kind: 'player' | 'role'; slotId: string }

export function SquadBuilderPage() {
  const careerId = useActiveCareerId()
  const tactic = useTactic()
  const assignments = useLineup(careerId)
  const [dialog, setDialog] = useState<Dialog | null>(null)

  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations })
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles, staleTime: Infinity })
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId!), enabled: careerId !== undefined })
  const request = toTacticRequest(tactic)
  const resolved = useQuery({ queryKey: ['resolve', JSON.stringify(request)], queryFn: () => endpoints.resolveTactic(request), retry: false })

  const formation = formations.data?.find((f) => f.id === tactic.formation)
  const roleById = useMemo(() => new Map((roles.data ?? []).map((r) => [r.id, r])), [roles.data])
  const playerById = useMemo(() => new Map((squad.data ?? []).map((c) => [c.player.id, c.player])), [squad.data])
  const resolvedBySlot = useMemo(() => new Map((resolved.data?.slots ?? []).map((s) => [s.slotId, s])), [resolved.data])

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
    if (careerId !== undefined && formation && (squad.data?.length ?? 0) >= 11 && Object.keys(assignments).length === 0 && autoFilled.current !== key && !autoFill.isPending) {
      autoFilled.current = key
      autoFill.mutate()
    }
  }, [careerId, formation, squad.data, assignments, tactic.formation, autoFill])

  function changeFormation(id: string) {
    const next = formations.data?.find((f) => f.id === id)
    if (!next || careerId === undefined) {
      return
    }
    lineupStore.set(careerId, remapAssignments(assignments, (pid) => playerById.get(pid)?.positions, next.slots))
    tacticStore.set({ formation: id, slots: {}, setup: tactic.setup })
  }

  function pickPlayer(slotId: string, playerId: number | null) {
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
    lineupStore.set(careerId!, next)
    setDialog(null)
  }

  function applyRole(slotId: string, roleId: string) {
    const current = tactic.slots[slotId] ?? { tags: [] }
    tacticStore.set({ ...tactic, slots: { ...tactic.slots, [slotId]: { ...current, roleId } } })
    setDialog(null)
  }

  if (careerId === undefined) {
    return (
      <Card title="Kadro kurucu">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Kadro kurucu kariyerindeki oyuncularla çalışır. Önce bir kariyer seç ya da oluştur.</p>
          <CareerSelect />
        </div>
      </Card>
    )
  }
  if (formations.isLoading || roles.isLoading || squad.isLoading) {
    return <Spinner />
  }

  const dialogSlot = formation?.slots.find((s) => s.slotId === dialog?.slotId)
  const dialogRoleId = dialogSlot ? slotRole(dialogSlot.slotId, dialogSlot.defaultRole) : ''
  const candidates = dialogSlot
    ? (squad.data ?? []).filter((c) => !c.loanedOut && canPlaySlot(c.player.positions, dialogSlot.position))
    : []

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <CareerSelect />
        <Button variant="secondary" disabled={autoFill.isPending || (squad.data?.length ?? 0) < 11} onClick={() => autoFill.mutate()}>
          {autoFill.isPending ? 'Diziliyor…' : "En iyi 11'i diz"}
        </Button>
      </div>
      <ErrorBox error={resolved.error ?? autoFill.error ?? squad.error} />
      {(squad.data?.length ?? 0) === 0 ? (
        <EmptyState>Kadro boş. Önce Kadro sayfasından oyuncu ekle ya da içe aktar.</EmptyState>
      ) : (
        <div className="grid items-start gap-4 min-[820px]:grid-cols-[360px_1fr]">
          <div className="order-2 flex flex-col gap-3.5 min-[820px]:order-1">
            <EaCodeCard />
            <SquadSummaryCard formations={formations.data ?? []} formationId={tactic.formation} onFormation={changeFormation} views={views} weakReasons={weakReasons} />
            <TeamSetup careerId={careerId} />
          </div>
          <div className="order-1 rounded-2xl border border-slate-700 bg-slate-900 p-2.5 min-[820px]:order-2">
            <Pitch slots={views} onPickPlayer={(slotId) => setDialog({ kind: 'player', slotId })} onPickRole={(slotId) => setDialog({ kind: 'role', slotId })} />
          </div>
        </div>
      )}
      {dialog?.kind === 'player' && dialogSlot && (
        <PlayerSelectModal
          position={dialogSlot.position}
          roleId={dialogRoleId}
          tags={slotTags(dialogSlot.slotId)}
          candidates={candidates}
          currentPlayerId={assignments[dialogSlot.slotId]}
          onPick={(pid) => pickPlayer(dialogSlot.slotId, pid)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'role' && dialogSlot && (
        <RoleFocusModal
          position={dialogSlot.position}
          groups={roleGroups(roles.data ?? [], dialogSlot.position)}
          currentRoleId={dialogRoleId}
          onApply={(rid) => applyRole(dialogSlot.slotId, rid)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
