import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { endpoints } from '../../api/endpoints'
import { useAuth } from '../../auth/AuthContext'
import { fitDisplay, fitTitle } from '../../lib/fitLabels'
import { canPlaySlot } from '../../lib/positions'
import { roleBaseName } from '../../lib/squadBuilder'
import { useActiveCareerId } from '../../state/careerStore'
import type { CareerPlayer, PlayerSummary } from '../../api/types'
import { DEFAULT_SETUP } from '../../lib/tactic'
import { careerSlotTabs } from './careerSlotTabs'
import type { SlotTab, SlotView, SquadBinding } from './types'
import { useLineupFits } from './useLineupFits'
import { useSquadWorkspace } from './useSquadWorkspace'
import { worstReason } from '../dashboard/dashboardRules'

/** Kurucunun durum kaynağı: v3 Lab `useLabBinding` (aktif taslak), v2 `useCareerBinding` (eski tek kopya depo). Kararlı (modül düzeyi) bir hook olmalı. */
export type CareerBuilderBinding = (careerId: number | undefined, squad: CareerPlayer[] | undefined) => { binding: SquadBinding<number>; playerById: Map<number, PlayerSummary> }

/**
 * Kariyer kadro kurucusunun ortak mantığı (V3-07b; SquadBuilderPage'den çıkarıldı): aktif kariyer, kadro, çalışma alanı (tek çözüm sorgusu),
 * slot görünümleri, rol uyumu, otomatik diziliş ("En iyi 11'i diz" + boş kadroda ilk açılışta) ve slot paneli sekmeleri. v2 ve v3 Lab bunu kullanır;
 * nereye yazıldığını yalnız bağlama (`useBind`) belirler (KARIYER-UX FAZ 4a).
 */
export function useCareerSquadBuilder(useBind: CareerBuilderBinding) {
  const careerId = useActiveCareerId()
  const { authenticated } = useAuth()

  const presets = useQuery({ queryKey: ['presets'], queryFn: () => endpoints.presets() })
  const tags = useQuery({ queryKey: ['tags-all'], queryFn: () => endpoints.behaviorTags() })
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers, enabled: authenticated })
  const career = careers.data?.find((c) => c.id === careerId)
  const hasCareer = authenticated && careerId !== undefined
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId!), enabled: hasCareer })
  const { binding, playerById } = useBind(careerId, squad.data)
  const ws = useSquadWorkspace('career', binding)
  const { state, formation, roles, roleBySlot, selection, selectedSlot: dialogSlot } = ws
  const assignments = state.assigned
  const setup = state.setup ?? DEFAULT_SETUP

  const preset = presets.data?.find((p) => p.id === state.presetId)
  const roleById = useMemo(() => new Map((roles.data ?? []).map((r) => [r.id, r])), [roles.data])

  const slotRole = (slotId: string, fallback: string) => roleBySlot.get(slotId)?.roleId ?? state.roleOverride[slotId] ?? fallback
  const slotTags = (slotId: string) => state.tags[slotId] ?? []

  // FAZ 4b: rol uyumu tek /fit/lineup isteğiyle (dizilenler kilitli); kariyer yoksa uyum yok.
  const { fitBySlot } = useLineupFits(ws, playerById, hasCareer ? careerId : undefined)

  const views: SlotView[] = ws.slots.map((slot) => {
    const player = playerById.get(assignments[slot.slotId])
    const role = roleById.get(slotRole(slot.slotId, slot.defaultRole))
    const fit = fitBySlot.get(slot.slotId)
    return {
      slotId: slot.slotId,
      position: slot.position,
      x: slot.x,
      y: slot.y,
      player: player && { id: player.id, assetId: player.faceAssetId, name: player.name, overall: player.overall, faceUrl: player.faceUrl, club: player.club, league: player.league, nationality: player.nationality, faceStats: player.faceStats, faceLabels: player.faceLabels, faceStatsApproximate: player.faceStatsApproximate },
      roleLabel: role ? `${roleBaseName(role)} · ${role.focus}` : '…',
      fit: fit && { pct: fitDisplay(fit).pct, state: fitDisplay(fit).state, band: fit.badge, metric: fitDisplay(fit).metric, title: fitTitle(fitDisplay(fit)), strength: fitDisplay(fit).strength, roleFit: fitDisplay(fit).roleFit },
      selected: selection?.slotId === slot.slotId,
    }
  })
  // FAZ 6a-H: ham motor katkısı ("Curve +2.9") değil, en büyük eksi katkı Türkçe ("Dayanıklılık −7,5"); Masa zayıf halka kartıyla aynı kural.
  const weakReasons: Record<string, string | undefined> = Object.fromEntries([...fitBySlot].map(([slotId, fit]) => [slotId, worstReason(fit?.reasons)]))

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

  function changeFormation(id: string) {
    ws.changeFormation(id, preset?.formation === id)
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
  const resetBehaviors = () => {
    ws.patch({ roleOverride: {}, tags: {}, presetId: undefined })
    ws.clearSelection()
  }
  const canAutoFill = hasCareer && !autoFill.isPending && (squad.data?.length ?? 0) >= 11
  const pitchHint = hasCareer
    ? 'Oyuncuyu başka bir karta sürükle: yer değiştirirler · karta tıkla: oyuncu seç · rol etiketine tıkla: rol ve odak · ✕: oyuncuyu kaldır.'
    : 'Oyuncu atamak için giriş yapıp bir kariyer seç; taktiği kariyersiz de kurabilirsin.'

  return {
    careerId,
    authenticated,
    presets,
    career,
    hasCareer,
    squad,
    binding,
    ws,
    setup,
    preset,
    views,
    weakReasons,
    autoFill,
    canAutoFill,
    changeFormation,
    slotTabs,
    resetBehaviors,
    pitchHint,
    loading: ws.formations.isLoading || presets.isLoading,
  }
}
