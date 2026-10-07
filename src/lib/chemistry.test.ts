import { describe, expect, it } from 'vitest'
import { squadChemistry, thresholdPoints, type ChemSlot } from './chemistry'

const card = (id: number, club: string, league: string, nationality: string, positions = ['ST']) => ({ id, club, league, nationality, positions })

describe('chemistry', () => {
  it('eşik puanlarını doğru verir', () => {
    expect(thresholdPoints(1, [2, 4, 7])).toBe(0)
    expect(thresholdPoints(4, [2, 4, 7])).toBe(2)
    expect(thresholdPoints(8, [3, 5, 8])).toBe(3)
  })

  it('aynı kulüp/lig/ülkeden 11 oyuncu 33 verir', () => {
    const slots: ChemSlot[] = Array.from({ length: 11 }, (_, i) => ({ position: 'ST', card: card(i, 'A', 'L', 'N') }))
    const result = squadChemistry(slots)
    expect(result.total).toBe(33)
    expect(result.perSlot.every((c) => c === 3)).toBe(true)
  })

  it('mevki dışı ve boş slot 0 kimya alır', () => {
    const slots: ChemSlot[] = [
      { position: 'CB', card: card(1, 'A', 'L', 'N') },
      { position: 'ST', card: card(2, 'A', 'L', 'N') },
      { position: 'ST' },
    ]
    const result = squadChemistry(slots)
    expect(result.perSlot[0]).toBe(0)
    expect(result.perSlot[2]).toBe(0)
  })

  it('mevki dışı oyuncu kimseye katkı vermez', () => {
    const slots: ChemSlot[] = [
      { position: 'ST', card: card(1, 'A', 'L', 'N') },
      { position: 'CB', card: card(2, 'A', 'L', 'N') },
    ]
    expect(squadChemistry(slots).perSlot).toEqual([0, 0])
  })

  it('Icon doğru mevkide 3 alır ve ülkeye +2, her lige +1 katkı verir', () => {
    const slots: ChemSlot[] = [
      { position: 'ST', card: { ...card(1, 'X', 'L1', 'N'), cardType: 'ICON' } },
      { position: 'ST', card: card(2, 'Y', 'L1', 'N') },
      { position: 'ST', card: card(3, 'Z', 'L2', 'M') },
    ]
    const result = squadChemistry(slots)
    expect(result.perSlot[0]).toBe(3)
    expect(result.perSlot[1]).toBe(1) // ülke 2+1=3 → +1; lig L1 1+1=2 → 0; kulüp 1 → 0
  })

  it('Hero ve Hall of FUT doğru mevkide 3 alır, ülkesine ve ligine +1 katkı verir', () => {
    const slots: ChemSlot[] = [
      { position: 'ST', card: { ...card(1, 'X', 'L', 'N'), cardType: 'HERO' } },
      { position: 'ST', card: { ...card(2, 'W', 'L', 'M'), cardType: 'HOF' } },
      { position: 'ST', card: card(3, 'Y', 'L', 'K') },
    ]
    const result = squadChemistry(slots)
    expect(result.perSlot.slice(0, 2)).toEqual([3, 3])
    expect(result.perSlot[2]).toBe(1) // lig L: 3 oyuncu → +1
  })

  it('kadın ve erkek ligleri birbirine bağlanmaz', () => {
    const slots: ChemSlot[] = [
      { position: 'ST', card: { ...card(1, 'A', 'L', 'N1'), gender: 0 } },
      { position: 'ST', card: { ...card(2, 'B', 'L', 'N2'), gender: 0 } },
      { position: 'ST', card: { ...card(3, 'C', 'L', 'N3'), gender: 1 } },
    ]
    expect(squadChemistry(slots).perSlot).toEqual([0, 0, 0])
  })

  it('menajer aynı ülke veya lig için +1 verir, en fazla 1', () => {
    const slots: ChemSlot[] = [{ position: 'ST', card: card(1, 'A', 'L', 'N') }]
    expect(squadChemistry(slots, { nationality: 'N', league: 'L' }).perSlot[0]).toBe(1)
    expect(squadChemistry(slots, { nationality: 'X' }).perSlot[0]).toBe(0)
  })

  it('oyuncu kimyası 3 ile sınırlıdır', () => {
    const slots: ChemSlot[] = Array.from({ length: 8 }, (_, i) => ({ position: 'ST', card: card(i, 'A', 'L', 'N') }))
    expect(Math.max(...squadChemistry(slots).perSlot)).toBe(3)
  })
})
