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

  it('oyuncu kimyası 3 ile sınırlıdır', () => {
    const slots: ChemSlot[] = Array.from({ length: 8 }, (_, i) => ({ position: 'ST', card: card(i, 'A', 'L', 'N') }))
    expect(Math.max(...squadChemistry(slots).perSlot)).toBe(3)
  })
})
