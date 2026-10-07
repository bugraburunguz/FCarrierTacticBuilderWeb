import { describe, expect, it } from 'vitest'
import type { CaptureCard } from '../api/types'
import { cardPrice, carryOver, fromCapture, priceSummary, type UtCard } from './utCard'

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
