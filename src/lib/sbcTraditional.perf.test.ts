import { describe, expect, it } from 'vitest'
import { solveTraditional, type SbcCandidate, type SbcSlot } from './sbcTraditional'

// Performans testi ana `npm test` dışındadır (yük altında flaky); `npm run test:perf` ile koşulur.
const SLOTS: SbcSlot[] = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'LM', 'RM', 'ST', 'ST'].map((position, i) => ({ slotId: `s${i}`, position }))

function card(id: number, position: string, overall: number, club: string, league: string, nationality: string): SbcCandidate {
  return { id, name: `P${id}`, positions: [position], overall, club, league, nationality }
}

describe('coin bazlı maliyet (performans)', () => {
  it('3000 kartlık havuzda 1.5 sn içinde çözer (BUG-03)', () => {
    const cards: SbcCandidate[] = []
    let id = 1
    ;['GK', 'LB', 'CB', 'RB', 'CM', 'LM', 'RM', 'ST'].forEach((position) => {
      for (let n = 0; n < 375; n++) {
        const overall = 70 + (n % 20)
        cards.push({ ...card(id++, position, overall, 'Club' + (n % 40), 'League' + (n % 8), 'Nation' + (n % 25)), price: 200 * (overall - 65) + (n % 7) * 50, source: 'market' })
      }
    })
    const started = performance.now()
    const result = solveTraditional(SLOTS, cards, { teamRatingMin: 82, chemMin: 18 })
    expect(performance.now() - started).toBeLessThan(1500)
    expect(result.picks.filter(Boolean)).toHaveLength(11)
  })
})
