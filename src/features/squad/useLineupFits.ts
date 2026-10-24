import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { endpoints } from '../../api/endpoints'
import type { PlayerSummary, RoleFit } from '../../api/types'
import { fitDisplay } from '../../lib/fitLabels'
import type { SlotFitRow } from './useSlotFits'
import type { SquadWorkspaceApi } from './useSquadWorkspace'

/**
 * Dolu slotların rol uyumu, tek istekte (KARIYER-UX FAZ 4b, toplu uyum): `/fit/lineup` dizilen oyuncular kilitli çağrılır; yanıt slot başına
 * sunucunun rolünü, etiketini, levelFit'i ve nedenlerini (/fit/role ile aynı biçim) taşır. 11 ayrı /fit/role yerine. useSlotFits ile aynı dönüş şekli.
 * Anahtar 'slot-fit' ile başlar: "Ana taktiğim yap" sonrası yenilenir. Oyuncu kadro kaydıyla (kariyer) hesaplanır.
 */
export function useLineupFits(ws: SquadWorkspaceApi<number>, playerById: Map<number, PlayerSummary>, careerId: number | undefined) {
  const { state, slots, stale, tactic } = ws
  const locked = useMemo(
    () => Object.fromEntries(slots.flatMap((s) => (state.assigned[s.slotId] !== undefined && playerById.has(state.assigned[s.slotId]) ? [[s.slotId, state.assigned[s.slotId]]] : []))) as Record<string, number>,
    [slots, state.assigned, playerById],
  )
  const query = useQuery({
    queryKey: ['slot-fit', 'lineup', careerId, JSON.stringify(tactic), JSON.stringify(locked)],
    queryFn: () => endpoints.lineup(careerId!, tactic, locked),
    enabled: careerId !== undefined && Boolean(tactic.formation) && !stale && Object.keys(locked).length > 0,
    staleTime: 300_000,
    retry: false,
  })
  const { fitBySlot, rows } = useMemo(() => {
    const bySlot = new Map<string, RoleFit | undefined>()
    const out: SlotFitRow[] = []
    ;(query.data?.slots ?? []).forEach((s) => {
      const playerId = locked[s.slotId]
      const player = playerId === undefined ? undefined : playerById.get(playerId)
      // Kilitli oyuncu yerinde kalmadıysa (kadrodan düşmüş vb.) o slot için uyum gösterilmez; çözücünün doldurduğu boş slotlar da gösterilmez.
      if (!player || s.playerId !== playerId || !s.roleFit) {
        return
      }
      const fit = { ...s.roleFit, roleName: s.roleFit.roleName ?? s.roleName, reasons: s.roleFit.reasons ?? [] } as RoleFit
      bySlot.set(s.slotId, fit)
      out.push({ slotId: s.slotId, position: s.position, roleId: s.roleId, roleName: s.roleName, playerId: player.id, playerName: player.name, fit, display: fitDisplay(fit) })
    })
    const order = new Map(slots.map((s, i) => [s.slotId, i]))
    out.sort((a, b) => (order.get(a.slotId) ?? 0) - (order.get(b.slotId) ?? 0))
    return { fitBySlot: bySlot, rows: out }
  }, [query.data, locked, playerById, slots])
  return { fitBySlot, rows, pending: query.isLoading }
}
