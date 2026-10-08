import { describe, expect, it } from 'vitest'
import { estimateCoinPrice } from './coinPrice'
import { ownedCost, ownedSource } from './sbcPriority'
import type { UtCard } from './utCard'

const card = (patch: Partial<UtCard>): UtCard => ({ key: 'c:1', source: 'club', name: 'X', rating: 84, positions: ['ST'], ...patch })

describe('SBC öncelik maliyeti (Storage → Kadro → Market)', () => {
  it('storage ve duplicate kartlar bedavadır', () => {
    expect(ownedCost(card({ pile: 'storage', price: 50000 }))).toBe(0)
    expect(ownedCost(card({ pile: 'club', duplicate: true, price: 50000 }))).toBe(0)
    expect(ownedSource(card({ pile: 'storage' }))).toBe('storage')
    expect(ownedSource(card({ pile: 'club' }))).toBe('club')
  })

  it('kadrodaki kart satış değeri kadar (biraz altında) maliyetlidir; fiyat yoksa tahmini fiyat kullanılır', () => {
    expect(ownedCost(card({ pile: 'club', price: 10000 }))).toBeCloseTo(9500)
    expect(ownedCost(card({ pile: 'club' }))).toBeCloseTo(estimateCoinPrice(84) * 0.95)
  })

  it('10K değerli kulüp kartı, daha ucuz market kartından pahalı sayılır; eşit fiyatta kulüp tercih edilir', () => {
    const marketAlternative = estimateCoinPrice(84)
    expect(ownedCost(card({ price: 10000 }))).toBeGreaterThan(marketAlternative)
    expect(ownedCost(card({ price: marketAlternative }))).toBeLessThan(marketAlternative)
  })
})
