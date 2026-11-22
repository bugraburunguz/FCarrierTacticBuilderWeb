import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { endpoints } from '../../api/endpoints'
import type { TacticRequest } from '../../api/types'
import type { SquadBinding } from './types'

/** Formasyon, slotlar, eski kayıt tespiti ve taktik isteği: tam çalışma alanı ile salt okunur uyum (Masa, Transfer) aynı hesabı kullanır. */
export function useWorkspaceCore<T>(state: SquadBinding<T>['state']) {
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations })
  const formation = formations.data?.find((f) => f.id === state.formationId) ?? formations.data?.[0]
  const slots = useMemo(() => formation?.slots ?? [], [formation])
  const slotIds = new Set(slots.map((s) => s.slotId))
  const knownFormation = formations.data?.some((f) => f.id === state.formationId) ?? false
  const foreign = (ids: string[]) => ids.some((id) => !slotIds.has(id))
  const stale = Boolean(formations.data?.length) && (!knownFormation || foreign(Object.keys(state.roleOverride)) || foreign(Object.keys(state.tags)) || foreign(Object.keys(state.assigned)))

  const tactic: TacticRequest = useMemo(
    () => ({
      formation: formation?.id,
      presetId: state.presetId,
      slots: [...new Set([...Object.keys(state.roleOverride), ...Object.keys(state.tags)])].map((slotId) => ({ slotId, tags: state.tags[slotId] ?? [], roleId: state.roleOverride[slotId] })),
      setup: state.setup,
    }),
    [formation?.id, state.presetId, state.roleOverride, state.tags, state.setup],
  )
  return { state, formations, formation, slots, stale, tactic }
}

export type WorkspaceCore = Pick<ReturnType<typeof useWorkspaceCore<number>>, 'state' | 'slots' | 'stale' | 'tactic'>
