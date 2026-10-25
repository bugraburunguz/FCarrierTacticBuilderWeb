import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { endpoints } from '../../api/endpoints'
import type { PlayerSummary, RoleFit } from '../../api/types'
import { fitDisplay } from '../../lib/fitLabels'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import type { SlotFitRow } from './useSlotFits'
import type { SquadWorkspaceApi } from './useSquadWorkspace'

const LINEUP_DEBOUNCE_MS = 300

type LineupBody = { tactic: SquadWorkspaceApi<number>['tactic']; locked: Record<string, number> }

const askable = (json: string) => {
  const body = JSON.parse(json) as LineupBody
  return Boolean(body.tactic.formation) && Object.keys(body.locked).length > 0
}

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
  // GUV-2: art arda atama/rol değişiklikleri tek isteğe iner (analiz kovası 60/dk); ilk istek bekletilmez.
  // İstek ve koşulu aynı (bekletilmiş) değerden: güncel değere bakan koşul eski gövdeyle istek attırırdı.
  // Bekletilmiş değer henüz istek atılabilir değilse (ilk yükleme: kadro gelmeden kilit boş) güncel değer hemen kullanılır.
  const current = JSON.stringify({ tactic, locked })
  const settled = useDebouncedValue(current, LINEUP_DEBOUNCE_MS)
  const request = askable(settled) ? settled : current
  const body = useMemo(() => JSON.parse(request) as LineupBody, [request])
  const query = useQuery({
    queryKey: ['slot-fit', 'lineup', careerId, request],
    queryFn: () => endpoints.lineup(careerId!, body.tactic, body.locked),
    enabled: careerId !== undefined && Boolean(body.tactic.formation) && !stale && Object.keys(body.locked).length > 0,
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
      out.push({ slotId: s.slotId, position: s.position, roleId: s.roleId, roleName: s.roleName, playerId: player.id, playerName: player.name, fit, display: fitDisplay(fit), weakClass: s.weakClass })
    })
    const order = new Map(slots.map((s, i) => [s.slotId, i]))
    out.sort((a, b) => (order.get(a.slotId) ?? 0) - (order.get(b.slotId) ?? 0))
    return { fitBySlot: bySlot, rows: out }
  }, [query.data, locked, playerById, slots])
  return { fitBySlot, rows, pending: query.isLoading }
}
