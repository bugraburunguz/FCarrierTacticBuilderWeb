export interface ResolvedRole {
  slotId: string
  position: string
  roleId: string
  roleName: string
}

export interface RoleChange {
  slotId: string
  position: string
  from: string
  to: string
  toName: string
}

export interface ProtectLead {
  depth?: { from: number; to: number }
  roles: RoleChange[]
}

export const DEPTH_STEP = 15
export const MIN_DEPTH = 25

/** Saldırgan bek ve ilerleyen orta saha rollerinin bir kademe temkinli karşılığı (rol ailesi -> hedef rol kimliği öneki). */
const CONSERVATIVE: { match: RegExp; target: string }[] = [
  { match: /^(attacking_wingback|inverted_wingback)_/, target: 'fullback_defend' },
  { match: /^wingback_/, target: 'fullback_balanced' },
  { match: /^box_to_box_(?!ball_winning)/, target: 'box_to_box_ball_winning' },
]

/**
 * "Skoru koru" önerisi (Pro FC 27 Tips: savunma ağırlıklı ayar, oyuncular arası mesafeyi daralt, bek/orta saha rollerini temkinli yap).
 * Yalnızca bu oyunda tanımlı rol kimlikleri önerilir; hat yüksekliği DEPTH_STEP kadar düşer (en az MIN_DEPTH).
 */
export function protectLead(slots: ResolvedRole[], depth: number | undefined, roleNames: Record<string, string>): ProtectLead {
  const roles: RoleChange[] = []
  slots.forEach((slot) => {
    const rule = CONSERVATIVE.find((r) => r.match.test(slot.roleId))
    if (rule && rule.target !== slot.roleId && roleNames[rule.target]) {
      roles.push({ slotId: slot.slotId, position: slot.position, from: slot.roleName, to: rule.target, toName: roleNames[rule.target] })
    }
  })
  const current = depth ?? 50
  const lowered = Math.max(MIN_DEPTH, current - DEPTH_STEP)
  return { depth: lowered < current ? { from: current, to: lowered } : undefined, roles }
}
