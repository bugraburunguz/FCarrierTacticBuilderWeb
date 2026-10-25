import type { SlotSelection, StarterTactic, TacticRequest, UserTactic } from '../api/types'
import defaults from './tacticDefaults.json'

/*
 * Tek taktik modeli (KARIYER-UX FAZ 1, düzeltme 10). Web'de TacticState; sunucuda aynı gövde TacticRequest (formation, presetId, setup,
 * slots[slotId, roleId, tags]) ve user_tactic satırı. Lab taslağı, ana taktik, başlangıç önerisi ve (ileride) lig simülasyonu bu eşlemeyi kullanır;
 * ikinci bir taktik şekli üretilmez.
 */

export interface TeamSetupState {
  buildUp: 'Short' | 'Balanced' | 'Counter'
  depth: number
}

/** Varsayılan kurulum: backend seed/tactic-defaults.json ile birebir aynı kopya (tacticDefaults.json; iki tarafta parite testi). */
export const DEFAULT_SETUP: TeamSetupState = defaults.setup as TeamSetupState

export interface TacticState {
  formation: string
  presetId?: string
  setup?: TeamSetupState
  slots: Record<string, { tags: string[]; roleId?: string }>
}

export const DEFAULT_TACTIC: TacticState = { formation: '4-3-3', slots: {} }

/** slotId → oyuncu kimliği (base_player.id). */
export type Lineup = Record<string, number>

/** KARIYER-UX FAZ 1 göçünün eski taslak adı; ana taktik adı olarak gösterilmez (FAZ 6a-F). */
const LEGACY_DRAFT_NAME = 'Önceki taslak'

/** Ana taktik adı: kullanıcının verdiği ad; göçten gelen ya da boş ad "Ana taktik · <formasyon>" (FAZ 6a-F). */
export function mainTacticName(name: string | null | undefined, formation: string): string {
  const trimmed = name?.trim()
  return !trimmed || trimmed === LEGACY_DRAFT_NAME ? `Ana taktik · ${formation}` : trimmed
}

export function toTacticRequest(state: TacticState): TacticRequest {
  const slots: SlotSelection[] = Object.entries(state.slots).map(([slotId, selection]) => ({
    slotId,
    tags: selection.tags,
    roleId: selection.roleId,
  }))
  return { formation: state.formation, presetId: state.presetId, slots, setup: state.setup }
}

/** Seçili davranışlarla çelişen tag'leri döner (client'ta kilitlenir). */
export function lockedBy(selected: string[], conflictsOf: (id: string) => string[]): Set<string> {
  const locked = new Set<string>()
  selected.forEach((id) => conflictsOf(id).forEach((c) => locked.add(c)))
  return locked
}

/** Lab taslağı → PUT /user-tactics/{slot} gövdesi (taslak biçimi). */
export function toSaveBody(careerId: number, name: string, tactic: TacticState, lineup: Lineup | undefined) {
  return { careerId, name, tactic: toTacticRequest(tactic), ...(lineup ? { lineup } : {}) } as { careerId: number; name: string; tactic: TacticRequest; lineup?: Lineup }
}

/** user_tactic (ana taktik ya da slot) → TacticState + diziliş. Gidiş-dönüş birebir (tactic.test). */
export function fromUserTactic(t: UserTactic): { tactic: TacticState; lineup: Lineup } {
  const setup = t.buildUp !== null || t.depth !== null
    ? { buildUp: (t.buildUp ?? DEFAULT_SETUP.buildUp) as TeamSetupState['buildUp'], depth: t.depth ?? DEFAULT_SETUP.depth }
    : undefined
  const slots: TacticState['slots'] = {}
  t.slots.forEach((row) => {
    slots[row.slot] = row.roleId ? { tags: row.tags ?? [], roleId: row.roleId } : { tags: row.tags ?? [] }
  })
  return {
    tactic: { formation: t.formation, ...(t.presetId ? { presetId: t.presetId } : {}), ...(setup ? { setup } : {}), slots },
    lineup: { ...(t.lineup ?? {}) },
  }
}

/** Başlangıç önerisi → TacticState + diziliş (Lab'da düzenle, ana taktik yap). */
export function fromStarter(s: StarterTactic): { tactic: TacticState; lineup: Lineup } {
  const slots: TacticState['slots'] = {}
  s.slots.forEach((row) => {
    slots[row.slotId] = { tags: [], roleId: row.roleId }
  })
  return { tactic: { formation: s.formationId, setup: s.setup as TeamSetupState, slots }, lineup: { ...s.lineup } }
}
