import { describe, expect, it } from 'vitest'
import type { UtCard } from '../../../lib/utCard'
import { DEFAULT_CUSTOMIZE, sbcFodder, valueProxy } from './candidates'

const card = (rating: number, patch: Partial<UtCard> = {}): UtCard => ({ key: `c:${rating}`, source: 'club', name: 'Kart', rating, positions: ['ST'], ...patch })

/**
 * V3-07c: "SBC yemi" rozeti — kural tek yerde (candidates.ts), değer vekili çözücüyle aynı. Kopya her zaman yem; ayrıca çözücünün koruma eşiğinin
 * (Özelleştir varsayılanı protectRatingFrom, özel kart koruması) altındaki değerdeki sıradan kart "düşük değer".
 */
describe('sbcFodder', () => {
  it('kopya kart her zaman yem (özel ya da yüksek reytingli olsa da)', () => {
    expect(sbcFodder(card(91, { duplicate: true, rarityId: 3 }))).toBe('kopya')
  })

  it('düşük değer: değer vekili, koruma eşiğindeki kartın değerinin altında', () => {
    expect(sbcFodder(card(DEFAULT_CUSTOMIZE.protectRatingFrom - 1))).toBe('düşük değer')
    expect(sbcFodder(card(DEFAULT_CUSTOMIZE.protectRatingFrom))).toBeUndefined()
  })

  it('bilinen fiyat değer vekiline girer: yüksek fiyatlı düşük reyting yem değildir', () => {
    const threshold = valueProxy({ rating: DEFAULT_CUSTOMIZE.protectRatingFrom })
    expect(sbcFodder(card(80, { price: threshold * 2 }))).toBeUndefined()
    expect(sbcFodder(card(80, { price: 400 }))).toBe('düşük değer')
  })

  it('özel kart (TOTW/promo/ICON) kopya değilse yem sayılmaz', () => {
    expect(sbcFodder(card(80, { rarityId: 3 }))).toBeUndefined()
    expect(sbcFodder(card(80, { cardType: 'ICON' }))).toBeUndefined()
  })
})
