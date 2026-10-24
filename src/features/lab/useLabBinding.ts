import { useCallback, useMemo } from 'react'
import type { CareerPlayer } from '../../api/types'
import { remapAssignments } from '../../lib/squadBuilder'
import { DEFAULT_TACTIC } from '../../lib/tactic'
import { labStore, useLab } from '../../state/labStore'
import { squadStateOf, tacticOf } from '../squad/tacticState'
import type { SquadBinding, SquadPatch } from '../squad/types'

/**
 * Katman 3 · Lab kurucusu bağlaması (KARIYER-UX FAZ 4a, D-28): kadro çekirdeği aktif taslağı görür ve yalnız ona yazar (labStore.patch → kirli).
 * Eski tek kopya taktik/diziliş deposu kullanılmaz. Taslak yoksa durum varsayılan taktik, patch hiçbir şey yazmaz.
 */
export function useLabBinding(careerId: number | undefined, squad: readonly CareerPlayer[] | undefined) {
  const lab = useLab(careerId)
  const draft = lab.drafts.find((d) => d.id === lab.activeId)
  const playerById = useMemo(() => new Map((squad ?? []).map((c) => [c.player.id, c.player])), [squad])
  const state = useMemo(() => squadStateOf(draft?.tactic ?? DEFAULT_TACTIC, { ...(draft?.lineup ?? {}) }), [draft])
  const draftId = draft?.id

  const patch = useCallback((change: SquadPatch<number>) => {
    if (careerId === undefined || draftId === undefined) {
      return
    }
    labStore.patch(careerId, draftId, (d) => {
      const cur = squadStateOf(d.tactic, { ...d.lineup })
      const next = { ...cur, ...(typeof change === 'function' ? change(cur) : change) }
      return { tactic: tacticOf(next), lineup: next.assigned }
    })
  }, [careerId, draftId])

  const binding: SquadBinding<number> = useMemo(() => ({
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
  }), [state, patch, playerById])

  return { binding, playerById, lab, draft }
}
