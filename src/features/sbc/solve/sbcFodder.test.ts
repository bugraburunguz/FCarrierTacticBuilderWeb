import { describe, expect, it } from 'vitest'
import type { UtCard } from '../../../lib/utCard'
import { DEFAULT_CUSTOMIZE, SBC_FODDER_RULES, sbcFodder } from './candidates'

const card = (rating: number, patch: Partial<UtCard> = {}): UtCard => ({ key: `c:${rating}`, source: 'club', name: 'Kart', rating, positions: ['ST'], ...patch })
const PROTECT = DEFAULT_CUSTOMIZE.protectRatingFrom

/**
 * PROD-PREP 0: "SBC yemi" kuralı (tek yerde, candidates.ts).
 * 1) Kopya kart her zaman yem. 2) Korunan kart (≥ koruma eşiği ya da özel) kopya değilse asla yem değil.
 * 3) Takas edilebilir kart kopya değilse yem değil (satılabilir). 4) Kalanlar (korunmayan + takas edilemez) yem.
 * V3-07c'deki "düşük değer" kuralı 89'luk Kvaratskhelia ve 85'lik Mbappé'yi yem gösteriyordu (takas edilemez → değer vekili düşük).
 */
describe('sbcFodder', () => {
  it('kopya kart her zaman yem (korunan ya da özel olsa da)', () => {
    expect(sbcFodder(card(91, { duplicate: true, rarityId: 3 }))).toBe('kopya')
    expect(sbcFodder(card(PROTECT + 4, { duplicate: true }))).toBe('kopya')
  })

  it('korunan kart (≥ eşik ya da özel) kopya değilse asla yem değil — takas edilemez olsa da', () => {
    expect(sbcFodder(card(89, { untradeable: true }))).toBeUndefined()
    expect(sbcFodder(card(PROTECT, { untradeable: true }))).toBeUndefined()
    expect(sbcFodder(card(78, { rarityId: 3, untradeable: true }))).toBeUndefined()
    expect(sbcFodder(card(78, { cardType: 'ICON', untradeable: true }))).toBeUndefined()
  })

  it('takas edilebilir kart kopya değilse yem değil (satılabilir), düşük reytingli olsa da', () => {
    expect(sbcFodder(card(70))).toBeUndefined()
    expect(sbcFodder(card(80, { price: 200 }))).toBeUndefined()
  })

  it('kalanlar (korunmayan + takas edilemez) yem', () => {
    expect(sbcFodder(card(PROTECT - 1, { untradeable: true }))).toBe('takas edilemez')
    expect(sbcFodder(card(64, { untradeable: true }))).toBe('takas edilemez')
  })

  it('kural metni dört satır (HelpPopover bunu gösterir)', () => {
    expect(SBC_FODDER_RULES).toHaveLength(4)
    expect(SBC_FODDER_RULES.join(' ')).toContain(`${PROTECT}`)
  })
})
