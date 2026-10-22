import { useCallback, useMemo } from 'react'
import type { CareerPlayer } from '../../api/types'
import { remapAssignments } from '../../lib/squadBuilder'
import { lineupStore, useLineup } from '../../state/lineupStore'
import { DEFAULT_TACTIC, tacticStore, useTactic } from '../../state/tacticStore'
import { squadStateOf as stateOf } from './tacticState'
import type { SquadBinding, SquadPatch } from './types'

/** Kariyer bağlayıcısı: taktik tacticStore'da (diğer kartlarla paylaşılır), dizilim lineupStore'da (kariyer başına, oyuncu kimliği). */
export function useCareerBinding(careerId: number | undefined, squad: CareerPlayer[] | undefined) {
  const tactic = useTactic()
  const assigned = useLineup(careerId)
  const playerById = useMemo(() => new Map((squad ?? []).map((c) => [c.player.id, c.player])), [squad])
  const state = useMemo(() => stateOf(tactic, assigned), [tactic, assigned])

  const patch = useCallback(
    (change: SquadPatch<number>) => {
      const cur = stateOf(tacticStore.get(), careerId === undefined ? {} : (lineupStore.get()[String(careerId)] ?? {}))
      const applied = typeof change === 'function' ? change(cur) : change
      const next = { ...cur, ...applied }
      const { assigned: nextAssigned, ...tacticPart } = applied
      if (Object.keys(tacticPart).length > 0) {
        const slotIds = new Set([...Object.keys(next.roleOverride), ...Object.keys(next.tags)])
        tacticStore.set({
          formation: next.formationId ?? DEFAULT_TACTIC.formation,
          presetId: next.presetId,
          setup: next.setup,
          slots: Object.fromEntries([...slotIds].map((id) => [id, { tags: next.tags[id] ?? [], roleId: next.roleOverride[id] }])),
        })
      }
      if (nextAssigned !== undefined && careerId !== undefined) {
        lineupStore.set(careerId, nextAssigned)
      }
    },
    [careerId],
  )

  const binding: SquadBinding<number> = useMemo(
    () => ({
      state,
      patch,
      carry: (_old, prev, next) => remapAssignments(prev, (pid) => playerById.get(pid)?.positions, next),
      keyOf: String,
      faceOf: (playerId) => {
        const p = playerById.get(playerId)
        return p && { faceStats: p.faceStats, faceLabels: p.faceLabels, faceStatsSource: p.faceStatsSource, faceStatsApproximate: p.faceStatsApproximate, positions: p.positions }
      },
      defaultFormation: DEFAULT_TACTIC.formation,
      keepAssignedOnImport: true,
    }),
    [state, patch, playerById],
  )
  return { binding, playerById }
}
