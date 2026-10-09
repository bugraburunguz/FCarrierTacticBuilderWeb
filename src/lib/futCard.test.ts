import { describe, expect, it } from 'vitest'
import { cardTier } from './futCard'

describe('cardTier', () => {
  it('normal kartlar rating bandına göre renk alır', () => {
    expect(cardTier(64)).toBe('bronze')
    expect(cardTier(70, { rarity: 'Rare' })).toBe('silver')
    expect(cardTier(82, { rarity: 'Common' })).toBe('gold')
  })

  it('özel kartlar kendi rengini alır', () => {
    expect(cardTier(90, { cardType: 'ICON' })).toBe('icon')
    expect(cardTier(88, { cardType: 'HERO' })).toBe('hero')
    expect(cardTier(85, { rarity: 'Team of the Week' })).toBe('totw')
    expect(cardTier(86, { rarity: 'Ultimate Dynasties' })).toBe('special')
  })
})
