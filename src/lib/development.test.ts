import { describe, expect, it } from 'vitest'
import type { PlayerRoleFit } from '../api/types'
import { developmentPlan, difficultyOf, playableRoles, totalGap } from './development'

const role = (roleId: string, position: string, gaps: { attr: string; value: number; needed: number }[], score = 50): PlayerRoleFit => ({
  position, roleId, roleName: roleId, score, projectedRating: 70, badge: gaps.length ? 'RED' : 'GREEN', badgeText: '', reasons: [], gaps,
})

describe('development plan', () => {
  it('sums the attribute gaps of a role', () => {
    expect(totalGap(role('a', 'ST', [{ attr: 'Finishing', value: 60, needed: 64 }, { attr: 'Agility', value: 80, needed: 85 }]))).toBe(9)
  })

  it('orders roles by the smallest total gap and keeps one entry per role', () => {
    const plan = developmentPlan([
      role('winger', 'LW', [{ attr: 'Crossing', value: 61, needed: 64 }]),
      role('winger', 'RW', [{ attr: 'Crossing', value: 61, needed: 64 }, { attr: 'Pace', value: 70, needed: 75 }]),
      role('inside', 'LW', [{ attr: 'Finishing', value: 50, needed: 70 }]),
      role('free', 'LW', []),
    ], 5)
    expect(plan.map((p) => p.role.roleId)).toEqual(['winger', 'inside'])
    expect(plan[0].totalGap).toBe(3)
    expect(plan[0].role.position).toBe('LW')
  })

  it('marks hard when there is no growth headroom left', () => {
    expect(difficultyOf(5, 8)).toBe('easy')
    expect(difficultyOf(10, 8)).toBe('medium')
    expect(difficultyOf(20, 8)).toBe('hard')
    expect(difficultyOf(8, 0)).toBe('hard')
  })

  it('lists already playable roles once', () => {
    const playable = playableRoles([role('a', 'LW', []), role('a', 'RW', []), role('b', 'LW', [{ attr: 'X', value: 1, needed: 2 }])])
    expect(playable.map((r) => r.roleId)).toEqual(['a'])
  })
})
