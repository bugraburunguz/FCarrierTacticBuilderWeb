import type { Assignments } from '../../lib/squadBuilder'
import { DEFAULT_TACTIC, type TacticState } from '../../lib/tactic'
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

/** squadStateOf'un tersi (KARIYER-UX FAZ 4a): kurucu durumu → taslak taktiği. Rol ya da etiketi olan slotlar yazılır; diziliş ayrı (lineup). */
export function tacticOf(state: SquadState<number>): TacticState {
  const slotIds = new Set([...Object.keys(state.roleOverride), ...Object.keys(state.tags)])
  const slots: TacticState['slots'] = Object.fromEntries([...slotIds].map((id) => [id, state.roleOverride[id] === undefined
    ? { tags: state.tags[id] ?? [] }
    : { tags: state.tags[id] ?? [], roleId: state.roleOverride[id] }]))
  return {
    formation: state.formationId ?? DEFAULT_TACTIC.formation,
    ...(state.presetId === undefined ? {} : { presetId: state.presetId }),
    ...(state.setup === undefined ? {} : { setup: state.setup as TacticState['setup'] }),
    slots,
  }
}
