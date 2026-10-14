import { useEffect, useRef } from 'react'
import { endpoints } from '../../api/endpoints'
import type { SquadWorkspaceApi } from './useSquadWorkspace'

const MIN_SQUAD = 11

/** Dizilim henüz kurulmamışsa (Kadro kurucu açılmadıysa) sahadaki ile aynı otomatik dizilimle doldurur; Masa ve Transfer Merkezi aynı diziliminden okur. */
export function useAutoLineup(ws: SquadWorkspaceApi<number>, careerId: number | undefined, squadSize: number) {
  const done = useRef('')
  const { formation, stale, state, tactic, patch } = ws
  const empty = Object.keys(state.assigned).length === 0
  useEffect(() => {
    const key = `${careerId}|${formation?.id}`
    if (careerId !== undefined && formation && !stale && squadSize >= MIN_SQUAD && empty && done.current !== key) {
      done.current = key
      endpoints
        .lineup(careerId, tactic)
        .then((result) => patch({ assigned: Object.fromEntries(result.slots.flatMap((s) => (s.playerId !== undefined ? [[s.slotId, s.playerId]] : []))) }))
        .catch(() => undefined)
    }
  }, [careerId, formation, stale, squadSize, empty, tactic, patch])
}
