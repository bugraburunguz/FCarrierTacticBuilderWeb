import type { Assignments } from '../../lib/squadBuilder'
import type { TacticState } from '../../lib/tactic'
import type { SquadState } from './types'

/** Tek taktik modeli (TacticState) + diziliş → kadro çekirdeğinin durumu. Kariyer bağlamaları (taslak, ana taktik) ortak kullanır. */
export function squadStateOf(tactic: Readonly<TacticState>, assigned: Assignments): SquadState<number> {
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
