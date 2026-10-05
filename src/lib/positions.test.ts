import { describe, expect, it } from 'vitest'
import type { CareerPlayer } from '../api/types'
import { canPlaySlot, compatiblePositions, depthState, groupByPrimaryPosition } from './positions'

const entry = (id: number, name: string, positions: string[], overall: number): CareerPlayer => ({
  player: { id, name, positions, overall, valuationEstimated: false },
  onLoan: false,
})

describe('positions', () => {
  it('a goalkeeper slot only accepts goalkeepers', () => {
    expect(canPlaySlot(['GK'], 'GK')).toBe(true)
    expect(canPlaySlot(['ST', 'CF'], 'GK')).toBe(false)
    expect(canPlaySlot(['CB'], 'GK')).toBe(false)
  })

  it('treats wing-back/full-back and winger/wide-midfielder as equivalents', () => {
    expect(compatiblePositions('LB')).toEqual(['LB', 'LWB'])
    expect(canPlaySlot(['RWB'], 'RB')).toBe(true)
    expect(canPlaySlot(['LM'], 'LW')).toBe(true)
    expect(canPlaySlot(['LW'], 'RW')).toBe(false)
  })

  it('groups the squad by primary position in pitch order, best player first', () => {
    const groups = groupByPrimaryPosition([
      entry(1, 'ST küçük', ['ST'], 70),
      entry(2, 'Kaleci', ['GK'], 80),
      entry(3, 'ST büyük', ['ST', 'CF'], 85),
      entry(4, 'Stoper', ['CB', 'CDM'], 75),
    ])

    expect(groups.map((g) => g.position)).toEqual(['GK', 'CB', 'ST'])
    expect(groups[2].players.map((p) => p.player.name)).toEqual(['ST büyük', 'ST küçük'])
    expect(groups[0].label).toBe('Kaleciler')
  })

  it('flags thin, balanced and dense areas', () => {
    expect(depthState('GK', 1)).toBe('thin')
    expect(depthState('GK', 2)).toBe('ok')
    expect(depthState('ST', 5)).toBe('dense')
  })
})
