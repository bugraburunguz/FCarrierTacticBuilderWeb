import type { CareerPlayer } from '../../api/types'
import { useLineupFits } from '../squad/useLineupFits'
import { useSquadWorkspace } from '../squad/useSquadWorkspace'
import { useMainTacticBinding } from './activeTactic'

/**
 * Ana taktiğin (yoksa başlangıç önerisinin) slot başına v3 rol uyumu: Masa ve Ana sayfa aynı hesaptan okur (takım uyumu, zayıf halka, 3 iş).
 * Salt okunur; taslak (katman 3) ve eski tek kopya depo okunmaz.
 */
export function useMainTacticFits(careerId: number | undefined, squad: readonly CareerPlayer[] | undefined) {
  const main = useMainTacticBinding(careerId, squad)
  const ws = useSquadWorkspace('career', main.binding)
  // FAZ 4b: tek /fit/lineup (dizilenler kilitli) — slot başına /fit/role yok.
  const { rows, pending } = useLineupFits(ws, main.playerById, careerId)
  return { main, rows, pending }
}
