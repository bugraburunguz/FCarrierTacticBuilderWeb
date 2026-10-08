import { describe, expect, it } from 'vitest'
import { solveTraditional, teamRating, type SbcCandidate, type SbcSlot } from './sbcTraditional'

const SLOTS: SbcSlot[] = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'LM', 'RM', 'ST', 'ST'].map((position, i) => ({ slotId: `s${i}`, position }))

function card(id: number, position: string, overall: number, club: string, league: string, nationality: string): SbcCandidate {
  return { id, name: `P${id}`, positions: [position], overall, club, league, nationality }
}

function pool(): SbcCandidate[] {
  const cards: SbcCandidate[] = []
  let id = 1
  ;['GK', 'LB', 'CB', 'RB', 'CM', 'LM', 'RM', 'ST'].forEach((position) => {
    ;[78, 80, 82, 84].forEach((overall) => {
      for (let copy = 0; copy < 3; copy++) {
        cards.push(card(id++, position, overall, 'Club', 'League', 'Nation'))
      }
    })
  })
  return cards
}

describe('sbc traditional', () => {
  it('takım rating formülü eşit ratinglerde ortalamayı verir ve yüksek kartları ödüllendirir', () => {
    expect(teamRating(Array(11).fill(80))).toBe(80)
    expect(teamRating([90, ...Array(10).fill(80)])).toBeGreaterThan(81)
  })

  it('kısıtları sağlayan en ucuz kadroyu bulur', () => {
    const result = solveTraditional(SLOTS, pool(), { teamRatingMin: 80, chemMin: 30 })
    expect(result.feasible).toBe(true)
    expect(result.teamRating).toBeGreaterThanOrEqual(80)
    expect(result.chemistry).toBeGreaterThanOrEqual(30)
    expect(new Set(result.picks.map((p) => p?.id)).size).toBe(11)
  })

  it('imkânsız kısıtta kısıt ihlallerini raporlar', () => {
    const result = solveTraditional(SLOTS, pool(), { teamRatingMin: 95, chemMin: 33 })
    expect(result.feasible).toBe(false)
    expect(result.violations.length).toBeGreaterThan(0)
  })

  it('aynı ligden minimum oyuncu kısıtına uyar', () => {
    const mixed = pool().map((c, i) => ({ ...c, league: i % 2 === 0 ? 'A' : 'B', club: `C${i % 5}`, nationality: `N${i % 4}` }))
    const result = solveTraditional(SLOTS, mixed, { teamRatingMin: 79, chemMin: 0, minSameLeague: 6 })
    expect(result.feasible).toBe(true)
    const counts = new Map<string, number>()
    result.picks.forEach((p) => counts.set(p!.league!, (counts.get(p!.league!) ?? 0) + 1))
    expect(Math.max(...counts.values())).toBeGreaterThanOrEqual(6)
  })

  it('XI şartı: belirli ligden en az N oyuncu', () => {
    const mixed = pool().map((c, i) => ({ ...c, league: i % 5 === 0 ? 'Rare League' : 'League', club: 'C' + (i % 7), nationality: 'N' + (i % 3) }))
    const result = solveTraditional(SLOTS, mixed, { teamRatingMin: 78, chemMin: 0, required: { league: { 'Rare League': 2 } } })
    expect(result.feasible).toBe(true)
    expect(result.picks.filter((p) => p?.league === 'Rare League').length).toBeGreaterThanOrEqual(2)
  })

  it('XI şartı sağlanamazsa ihlali raporlar', () => {
    const result = solveTraditional(SLOTS, pool(), { teamRatingMin: 78, chemMin: 0, required: { league: { Yok: 1 } } })
    expect(result.feasible).toBe(false)
    expect(result.violations.join(' ')).toContain('Yok')
  })
})

describe('coin bazlı maliyet', () => {
  it('ucuz ama rating şartını sağlamayan çözüm yerine şartı sağlayan çözümü seçer', () => {
    const cards: SbcCandidate[] = []
    let id = 1
    SLOTS.forEach((slot) => {
      for (let i = 0; i < 4; i++) {
        cards.push({ ...card(id++, slot.position, 77, 'A', 'L1', 'N1'), price: 250, source: 'market' })
      }
      for (let i = 0; i < 2; i++) {
        cards.push({ ...card(id++, slot.position, 86, 'B', 'L2', 'N2'), price: 18000, source: 'market' })
      }
    })
    const result = solveTraditional(SLOTS, cards, { teamRatingMin: 83, chemMin: 0 })
    expect(result.feasible).toBe(true)
    expect(result.teamRating).toBeGreaterThanOrEqual(83)
  })
})
