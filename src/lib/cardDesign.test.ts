import { describe, expect, it } from 'vitest'
import { cardTier, designFor, shortLabel } from './cardDesign'
import { letterGrade, ratingTone } from './ratingTone'

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

  it('EA arka plan adresi yapılandırılmadıkça kendi çerçevemiz kullanılır', () => {
    expect(designFor(80).mode).toBe('OWN')
    expect(designFor(80).backgroundUrl).toBeUndefined()
  })

  it('kısa etiket noktalama atar ve büyütür', () => {
    expect(shortLabel('Real Madrid')).toBe('REA')
    expect(shortLabel(undefined)).toBe('')
  })
})

describe('ratingTone / letterGrade', () => {
  it('eşikler 90/80/70/60', () => {
    expect([95, 85, 75, 65, 55].map(ratingTone)).toEqual(['elite', 'high', 'mid', 'low', 'poor'])
  })

  it('harf notu', () => {
    expect([92, 86, 81, 76, 71, 62, 40].map(letterGrade)).toEqual(['S', 'A+', 'A', 'B+', 'B', 'C', 'D'])
  })
})
