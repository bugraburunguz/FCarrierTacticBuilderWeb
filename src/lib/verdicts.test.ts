import { describe, expect, it } from 'vitest'
import type { CareerPlayer, SquadFit } from '../api/types'
import { computeVerdicts } from './verdicts'

const entry = (id: number, overall: number, age: number, potential: number): CareerPlayer => ({
  player: { id, name: `P${id}`, positions: ['ST'], overall, age, potential, valuationEstimated: false },
  onLoan: false,
  dynamicPotential: potential,
})

const fit = {
  squadFit: 80,
  summary: '',
  attackPattern: '',
  weakLinks: [],
  rules: [],
  bench: [],
  slots: [
    { slotId: 'ST', roleId: 'x', roleName: 'x', tags: [], playerId: 1, depth: [{ playerId: 2, playerName: 'P2', combined: 70, roleFitScore: 70, badge: 'GREEN' }] },
  ],
} as unknown as SquadFit

describe('verdicts', () => {
  const squad = [entry(1, 82, 27, 82), entry(2, 74, 26, 75), entry(3, 62, 19, 82), entry(4, 78, 20, 88), entry(5, 66, 33, 66), entry(6, 63, 23, 70)]
  const byId = (budget?: number) => new Map(computeVerdicts(squad, fit, budget).map((v) => [v.playerId, v.verdict]))

  it('keeps starters and first backups', () => {
    expect(byId().get(1)).toBe('KEEP')
    expect(byId().get(2)).toBe('KEEP')
  })

  it('loans a young prospect who will not play and develops one near the first team', () => {
    expect(byId().get(3)).toBe('LOAN')
    expect(byId().get(4)).toBe('DEVELOP')
  })

  it('sells old surplus players and loans a mid prospect', () => {
    expect(byId().get(5)).toBe('SELL')
    expect(byId().get(6)).toBe('LOAN')
  })

  it('mentions the tight budget when selling', () => {
    const sale = computeVerdicts(squad, fit, 1_000_000).find((v) => v.playerId === 5)
    expect(sale?.reason).toContain('bütçe')
  })
})
