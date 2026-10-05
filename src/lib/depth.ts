import type { CareerPlayer, Formation, Role } from '../api/types'
import type { TacticState } from '../state/tacticStore'
import { canPlaySlot, POSITION_ORDER, primaryPosition } from './positions'

export type DepthState = 'thin' | 'ok' | 'dense'

export interface PositionNeed {
  position: string
  starters: number
  demanding: number
  required: number
  natural: CareerPlayer[]
  flex: CareerPlayer[]
  state: DepthState
  reason: string
  coverCandidates: CareerPlayer[]
}

const STAMINA_TARGET = 70
const SPEED_TARGET = 75

function isDemanding(role: Role | undefined): boolean {
  if (!role) {
    return false
  }
  return role.weapons.some(
    (w) => (w.attr === 'Stamina' && w.target >= STAMINA_TARGET) || (w.attr === 'SprintSpeed' && w.target >= SPEED_TARGET),
  )
}

export function requiredDepth(starters: number, demanding: number, isGoalkeeper: boolean): number {
  if (isGoalkeeper) {
    return 2
  }
  const backups = Math.ceil(starters / 2) + Math.min(demanding, starters)
  return starters + Math.max(1, backups)
}

export function analyzeDepth(squad: CareerPlayer[], formation: Formation, tactic: TacticState, roles: Role[]): PositionNeed[] {
  const roleById = new Map(roles.map((r) => [r.id, r]))
  const perPosition = new Map<string, { starters: number; demanding: number }>()
  for (const slot of formation.slots) {
    const roleId = tactic.slots[slot.slotId]?.roleId ?? slot.defaultRole
    const current = perPosition.get(slot.position) ?? { starters: 0, demanding: 0 }
    perPosition.set(slot.position, {
      starters: current.starters + 1,
      demanding: current.demanding + (isDemanding(roleById.get(roleId)) ? 1 : 0),
    })
  }
  const rank = (p: string) => (POSITION_ORDER.includes(p) ? POSITION_ORDER.indexOf(p) : POSITION_ORDER.length)
  return [...perPosition.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([position, { starters, demanding }]) => {
      const required = requiredDepth(starters, demanding, position === 'GK')
      const natural = squad.filter((s) => canPlaySlot([primaryPosition(s.player.positions)], position))
      const flex = squad.filter(
        (s) => !natural.includes(s) && canPlaySlot(s.player.positions.slice(1), position),
      )
      const effective = natural.length + Math.floor(flex.length / 2)
      const state: DepthState = effective < required ? 'thin' : effective > required + 1 ? 'dense' : 'ok'
      const reason =
        `${starters} ilk 11 slotu` +
        (demanding > 0 ? `, ${demanding} tanesi yüksek tempolu rol (rotasyon +1)` : '') +
        ` → en az ${required} oyuncu`
      return { position, starters, demanding, required, natural, flex, state, reason, coverCandidates: flex }
    })
}

export function unusedPositionSuggestions(squad: CareerPlayer[], needs: PositionNeed[]): { player: CareerPlayer; positions: string[] }[] {
  const thin = needs.filter((n) => n.state === 'thin').map((n) => n.position)
  const used = new Set(needs.map((n) => n.position))
  return squad
    .map((player) => {
      const own = primaryPosition(player.player.positions)
      const positions = thin.filter((p) => p !== own && canPlaySlot(player.player.positions.slice(1), p))
      return { player, positions, orphan: !used.has(own) }
    })
    .filter((s) => s.positions.length > 0 || s.orphan)
    .map(({ player, positions }) => ({ player, positions }))
}
