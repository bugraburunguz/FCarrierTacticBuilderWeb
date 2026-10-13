import { describe, expect, it } from 'vitest'
import { prunePool, solveTraditional, teamRating, type SbcCandidate, type SbcSlot } from './sbcTraditional'

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
  it('takım rating formülü (BUG-01): bölmeden önce yuvarlar, sonucu aşağı alır', () => {
    expect(teamRating(Array(11).fill(80))).toBe(80)
    expect(teamRating([90, ...Array(10).fill(80)])).toBe(81)
    expect(teamRating([...Array(8).fill(84), ...Array(3).fill(83)])).toBe(83)
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

  it('aynı gerçek oyuncu kadroda iki kez seçilmez (BUG-02)', () => {
    const cards: SbcCandidate[] = []
    let id = 1
    ;['GK', 'LB', 'CB', 'RB', 'CM', 'LM', 'RM', 'ST'].forEach((position) => {
      // her mevkide yalnız tek gerçek oyuncu var ama hem kulüp hem katalog kopyası olarak iki kez listelenmiş
      cards.push({ ...card(id++, position, 84, 'Club', 'League', 'Nation'), playerKey: 'p:' + position, source: 'club' })
      cards.push({ ...card(id++, position, 84, 'Club', 'League', 'Nation'), playerKey: 'p:' + position, source: 'market', price: 5000 })
    })
    // CB ve ST iki slot ister: ikinci slot için tek oyuncu yetmez
    const result = solveTraditional(SLOTS, cards, { teamRatingMin: 80, chemMin: 0 })
    const keys = result.picks.flatMap((p) => (p ? [p.playerKey] : []))
    expect(new Set(keys).size).toBe(keys.length)
    expect(result.feasible).toBe(false)
  })
})

describe('kalite tavanı (WEB-BUG-03)', () => {
  it('Max Gümüş çözümünde 75+ kart seçilmez', () => {
    const cards: SbcCandidate[] = []
    let id = 1
    ;['GK', 'LB', 'CB', 'RB', 'CM', 'LM', 'RM', 'ST'].forEach((position) => {
      ;[68, 70, 72, 74, 76, 78, 80, 82].forEach((overall) => cards.push({ ...card(id++, position, overall, 'Club', 'League', 'Nation'), price: overall >= 75 ? 100 : 1000 }))
    })

    const solution = solveTraditional(SLOTS, cards, { teamRatingMin: 0, chemMin: 0, maxQuality: 2 })

    expect(solution.picks.filter(Boolean).length).toBeGreaterThan(0)
    expect(solution.picks.every((p) => !p || p.overall <= 74)).toBe(true)
  })

  it('prunePool kalite tavanını ve tam kaliteyi uygular', () => {
    const cards = [card(1, 'ST', 70, 'A', 'L', 'N'), card(2, 'ST', 80, 'A', 'L', 'N'), card(3, 'ST', 60, 'A', 'L', 'N')]
    expect(prunePool([{ slotId: 's', position: 'ST' }], cards, { teamRatingMin: 0, chemMin: 0, maxQuality: 2 }).map((c) => c.overall).sort()).toEqual([60, 70])
    expect(prunePool([{ slotId: 's', position: 'ST' }], cards, { teamRatingMin: 0, chemMin: 0, minQuality: 2, maxQuality: 2 }).map((c) => c.overall)).toEqual([70])
  })
})
