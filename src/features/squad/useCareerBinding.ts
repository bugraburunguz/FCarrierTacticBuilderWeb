import { useCallback, useMemo } from 'react'
import type { CareerPlayer } from '../../api/types'
import { remapAssignments, type Assignments } from '../../lib/squadBuilder'
import { lineupStore, useLineup } from '../../state/lineupStore'
import { DEFAULT_TACTIC, tacticStore, useTactic, type TacticState } from '../../state/tacticStore'
import type { SquadBinding, SquadPatch, SquadState } from './types'

function stateOf(tactic: TacticState, assigned: Assignments): SquadState<number> {
  const roleOverride: Record<string, string> = {}
  const tags: Record<string, string[]> = {}
  Object.entries(tactic.slots).forEach(([slotId, sel]) => {
    if (sel.roleId !== undefined) {
      roleOverride[slotId] = sel.roleId
    }
    if (sel.tags.length > 0) {
      tags[slotId] = sel.tags
    }
  })
  return { formationId: tactic.formation, presetId: tactic.presetId, setup: tactic.setup, roleOverride, tags, assigned }
}

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
