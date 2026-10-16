import { describe, expect, it } from 'vitest'
import type { CaptureCard, PlayerSummary } from '../api/types'
import { cardPrice, carryOver, fromCapture, fromSummary, personKey, priceSummary, type UtCard } from './utCard'

function capture(patch: Partial<CaptureCard>): CaptureCard {
  return { instanceId: 1, assetId: 9, rating: 88, positions: ['ST', 'CF'], teamId: 1, leagueId: 1, nation: 1, untradeable: false, faceLabels: [], faceStats: [], duplicate: false, pile: 'club', ...patch }
}

function card(key: string, price?: number): UtCard {
  return { key, source: 'club', name: key, rating: 80, positions: ['ST'], price }
}

describe('utCard', () => {
  it('fiyat sinyalini pazar ortalaması, son satış, alt sınır sırasıyla seçer', () => {
    expect(cardPrice(capture({ marketAverage: 100, lastSalePrice: 90, marketMin: 50 }))).toBe(100)
    expect(cardPrice(capture({ marketAverage: 0, lastSalePrice: 90, marketMin: 50 }))).toBe(90)
    expect(cardPrice(capture({ lastSalePrice: 0, marketMin: 50 }))).toBe(50)
    expect(cardPrice(capture({}))).toBeUndefined()
  })

  it('yakalanan kartı çevirir: ad yoksa kimlik, mevki yoksa ana mevki', () => {
    const converted = fromCapture(capture({ name: undefined, positions: [], position: 'LW', club: 'Arsenal' }), 'club', 120)
    expect(converted.name).toBe('#9')
    expect(converted.positions).toEqual(['LW'])
    expect(converted.price).toBe(120)
    expect(converted.key).toBe('c:1')
  })

  it('aynı oyuncunun iki versiyonu (TOTW + altın) aynı kimliği paylaşır, farklı oyuncular paylaşmaz (WEB-BUG-08)', () => {
    const totw = fromCapture(capture({ instanceId: 1, assetId: 231747 }), 'club')
    const gold = fromCapture(capture({ instanceId: 2, assetId: 231747 }), 'club')
    const other = fromCapture(capture({ instanceId: 3, assetId: 158023 }), 'club')
    expect(totw.key).not.toBe(gold.key)
    expect(personKey(totw)).toBe(personKey(gold))
    expect(personKey(totw)).not.toBe(personKey(other))
    expect(personKey({ ...card('p:7'), playerId: 7 })).toBe('7')
    expect(personKey(card('x'))).toBe('x')
  })

  it('ortalama ücreti yalnızca fiyatı bilinen kartlardan hesaplar', () => {
    const summary = priceSummary([card('a', 100), card('b', 300), card('c'), undefined])
    expect(summary).toEqual({ total: 400, known: 2, count: 3, average: 200 })
    expect(priceSummary([]).average).toBeUndefined()
  })

  it('formasyon değişince kartları aynı mevkideki yeni slotlara taşır', () => {
    const oldSlots = [{ slotId: 'ST', position: 'ST' }, { slotId: 'GK', position: 'GK' }, { slotId: 'CAM', position: 'CAM' }]
    const next = [{ slotId: 'LST', position: 'ST' }, { slotId: 'RST', position: 'ST' }, { slotId: 'GK', position: 'GK' }]
    const result = carryOver(oldSlots, { ST: card('striker'), GK: card('keeper'), CAM: card('ten') }, next)
    expect(Object.keys(result).sort()).toEqual(['GK', 'LST'])
    expect(result.LST.name).toBe('striker')
  })
})

describe('fromSummary (F10)', () => {
  it('katalog kartı yüz değerlerini, etiketlerini ve "≈" bayrağını taşır', () => {
    const card = fromSummary({ id: 7, name: 'Test', overall: 90, positions: ['ST'], valuationEstimated: false, faceStats: [96, 91, 80, 92, 29, 76], faceLabels: ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'], faceStatsSource: 'COMPUTED', faceStatsApproximate: true } as PlayerSummary)

    expect(card.faceStats).toEqual([96, 91, 80, 92, 29, 76])
    expect(card.faceLabels?.[0]).toBe('PAC')
    expect(card.faceStatsApproximate).toBe(true)
  })
})
