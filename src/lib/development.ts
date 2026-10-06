import type { PlayerRoleFit } from '../api/types'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface RolePlan {
  role: PlayerRoleFit
  totalGap: number
  difficulty: Difficulty
}

const EASY_GAP = 6
const MEDIUM_GAP = 15
const TIGHT_HEADROOM = 1

export function totalGap(role: PlayerRoleFit): number {
  return role.gaps.reduce((sum, g) => sum + (g.needed - g.value), 0)
}

export function difficultyOf(gap: number, headroom: number): Difficulty {
  if (headroom <= TIGHT_HEADROOM && gap > EASY_GAP) {
    return 'hard'
  }
  if (gap <= EASY_GAP) {
    return 'easy'
  }
  return gap <= MEDIUM_GAP ? 'medium' : 'hard'
}

/** Oyuncunun şu an tam oynayamadığı rolleri, açmak için gereken toplam attribute artışına göre sıralar (rol başına en uygun mevki). */
export function developmentPlan(roles: PlayerRoleFit[], headroom: number, limit = 6): RolePlan[] {
  const best = new Map<string, RolePlan>()
  for (const role of roles) {
    if (role.gaps.length === 0) {
      continue
    }
    const gap = totalGap(role)
    const current = best.get(role.roleId)
    if (!current || gap < current.totalGap) {
      best.set(role.roleId, { role, totalGap: gap, difficulty: difficultyOf(gap, headroom) })
    }
  }
  return [...best.values()].sort((a, b) => a.totalGap - b.totalGap || b.role.score - a.role.score).slice(0, limit)
}

export function playableRoles(roles: PlayerRoleFit[]): PlayerRoleFit[] {
  const seen = new Set<string>()
  return roles.filter((r) => r.gaps.length === 0 && !seen.has(r.roleId) && seen.add(r.roleId))
}
