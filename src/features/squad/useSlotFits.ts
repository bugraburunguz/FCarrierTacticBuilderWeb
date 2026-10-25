import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { endpoints } from '../../api/endpoints'
import type { PlayerSummary, RoleFit } from '../../api/types'
import { fitDisplay, isWeakFit, type FitDisplay, type WeakClass } from '../../lib/fitLabels'
import type { DeskSlot } from '../../lib/deskRules'
import type { SquadWorkspaceApi } from './useSquadWorkspace'

export interface SlotFitRow {
  slotId: string
  position: string
  roleId: string
  roleName: string
  playerId: number
  playerName: string
  fit: RoleFit
  display: FitDisplay
  /** FIT-1 madde 2: /fit/lineup slot.weakClass (iki eksenli sınıf); eski kaynaklarda yok. */
  weakClass?: WeakClass
}

/**
 * Dolu slotların rol uyumu (v3): sahadaki rozet ve Transfer Merkezi "İhtiyaçlar" AYNI sorgudan okur (aynı anahtar, aynı sayı).
 * Rol = çözülmüş taktiğin rolü → kullanıcının seçtiği rol → formasyonun varsayılanı.
 */
export function useSlotFits(ws: SquadWorkspaceApi<number>, playerById: Map<number, PlayerSummary>) {
  const { state, slots, roleBySlot } = ws
  const filled = slots.filter((s) => state.assigned[s.slotId] !== undefined && playerById.has(state.assigned[s.slotId]))
  const roleOf = (slotId: string, fallback: string) => roleBySlot.get(slotId)?.roleId ?? state.roleOverride[slotId] ?? fallback
  const tagsOf = (slotId: string) => state.tags[slotId] ?? []
  const queries = useQueries({
    queries: filled.map((s) => ({
      queryKey: ['slot-fit', 'v3', state.assigned[s.slotId], roleOf(s.slotId, s.defaultRole), s.position, tagsOf(s.slotId).join(',')],
      queryFn: () => endpoints.fitRole({ playerId: state.assigned[s.slotId], roleId: roleOf(s.slotId, s.defaultRole), position: s.position, tags: tagsOf(s.slotId), engineVersion: 'v3' }),
      staleTime: 300_000,
      retry: false,
    })),
  })
  const fitBySlot = useMemo(
    () => new Map(filled.map((s, i) => [s.slotId, queries[i]?.data?.roleFit] as const)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filled.map((s) => s.slotId).join(','), queries.map((q) => q.dataUpdatedAt).join(',')],
  )
  const rows: SlotFitRow[] = filled.flatMap((s) => {
    const fit = fitBySlot.get(s.slotId)
    const player = playerById.get(state.assigned[s.slotId])
    return fit && player ? [{ slotId: s.slotId, position: s.position, roleId: roleOf(s.slotId, s.defaultRole), roleName: fit.roleName, playerId: player.id, playerName: player.name, fit, display: fitDisplay(fit) }] : []
  })
  return { fitBySlot, rows, pending: queries.some((q) => q.isLoading) }
}

/** İhtiyaçlar: yalnız sarı (WEAK) ve kırmızı (WRONG_ROLE) bantlar, seviyesine göre artan; `all` ile tüm kadro. */
export function needsFromFits(rows: SlotFitRow[], all = false): SlotFitRow[] {
  return rows.filter((r) => all || isWeakFit(r.fit.fitLabel)).sort((a, b) => a.display.pct - b.display.pct || a.slotId.localeCompare(b.slotId))
}

/** Takım uyumu (V3-06d, tek tanım): dizilimdeki slotların seviyesine göre % ortalaması; Masa göstergesi ve kadro kurucu "Kadro uyumu" aynı fonksiyon. */
export function teamFitPct(displays: { pct: number }[]): number | undefined {
  return displays.length === 0 ? undefined : Math.round(displays.reduce((sum, d) => sum + d.pct, 0) / displays.length)
}

/** Masa kuralları için aynı satırlar (aynı yüzde, aynı etiket). */
export const toDeskSlots = (rows: SlotFitRow[]): DeskSlot[] =>
  rows.map((r) => ({ slotId: r.slotId, position: r.position, roleId: r.roleId, playerId: r.playerId, playerName: r.playerName, pct: r.display.pct, fitLabel: r.fit.fitLabel, weakClass: r.weakClass, strength: r.display.strength }))
