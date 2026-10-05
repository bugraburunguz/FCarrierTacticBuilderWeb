import { describe, expect, it } from 'vitest'
import type { CareerPlayer, Formation, Role } from '../api/types'
import { analyzeDepth, requiredDepth } from './depth'

const p = (id: number, positions: string[]): CareerPlayer => ({
  player: { id, name: `P${id}`, positions, overall: 75, valuationEstimated: false },
  onLoan: false,
})
const formation: Formation = {
  id: '4-1-2-3',
  slots: [
    { slotId: 'cdm', position: 'CDM', group: 'MID', defaultRole: 'anchor', x: 0, y: 0 },
    { slotId: 'cm1', position: 'CM', group: 'MID', defaultRole: 'b2b', x: 0, y: 0 },
    { slotId: 'cm2', position: 'CM', group: 'MID', defaultRole: 'b2b', x: 0, y: 0 },
  ],
}
const roles = [
  { id: 'b2b', weapons: [{ attr: 'Stamina', hardMin: 60, target: 80 }] },
  { id: 'anchor', weapons: [] },
] as unknown as Role[]

describe('depth advisor', () => {
  it('four CMs are not enough when the tactic also needs a CDM', () => {
    const squad = [p(1, ['CM']), p(2, ['CM']), p(3, ['CM']), p(4, ['CM'])]
    const needs = analyzeDepth(squad, formation, { formation: '4-1-2-3', slots: {} }, roles)
    expect(needs.find((n) => n.position === 'CDM')?.state).toBe('thin')
    expect(needs.find((n) => n.position === 'CM')?.required).toBe(5)
    expect(needs.find((n) => n.position === 'CM')?.state).toBe('thin')
  })

  it('goalkeepers need two', () => {
    expect(requiredDepth(1, 0, true)).toBe(2)
  })

  it('a CM who lists CDM as secondary position partly covers the CDM slot', () => {
    const squad = [p(1, ['CM', 'CDM']), p(2, ['CM', 'CDM']), p(3, ['CM'])]
    const cdm = analyzeDepth(squad, formation, { formation: '4-1-2-3', slots: {} }, roles).find((n) => n.position === 'CDM')!
    expect(cdm.flex.length).toBe(2)
  })
})
