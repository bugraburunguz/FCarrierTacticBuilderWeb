import { describe, expect, it } from 'vitest'
import type { CareerPlayer, SquadFit } from '../api/types'
import { pickBench } from './bench'

const p = (id: number, positions: string[], overall: number): CareerPlayer => ({
  player: { id, name: `P${id}`, positions, overall, valuationEstimated: false },
  onLoan: false,
})

describe('pickBench', () => {
  const squad = [p(1, ['GK'], 80), p(2, ['ST'], 80), p(3, ['LW'], 78), p(10, ['GK'], 60), p(11, ['ST'], 70), p(12, ['LW'], 72), p(13, ['CB'], 65)]
  const fit = {
    slots: [
      { slotId: 'GK', playerId: 1, depth: [{ playerId: 10, playerName: 'P10', combined: 60, roleFitScore: 60, badge: 'GREEN' }] },
      { slotId: 'ST', playerId: 2, depth: [{ playerId: 11, playerName: 'P11', combined: 70, roleFitScore: 70, badge: 'GREEN' }] },
      { slotId: 'LW', playerId: 3, depth: [{ playerId: 12, playerName: 'P12', combined: 72, roleFitScore: 72, badge: 'GREEN' }, { playerId: 11, playerName: 'P11', combined: 60, roleFitScore: 60, badge: 'YELLOW' }] },
    ],
  } as unknown as SquadFit

  it('puts a reserve goalkeeper first and then the players who back up the most slots', () => {
    const bench = pickBench(squad, fit, 3)

    expect(bench[0].player.player.id).toBe(10)
    expect(bench.map((b) => b.player.player.id)).toEqual([10, 11, 12])
    expect(bench[1].covers.map((c) => c.slotId)).toEqual(['ST', 'LW'])
  })

  it('never lists a starter on the bench', () => {
    expect(pickBench(squad, fit, 7).map((b) => b.player.player.id)).not.toContain(2)
  })
})
