import { describe, expect, it } from 'vitest'
import type { ShortlistItem } from '../../api/types'
import { budgetAfterPurchase, contractMonthsLeft, shortlistCost } from './transferPlan'

const item = (playerId: number, valueEur?: number, maxFeeEur?: number): ShortlistItem => ({
  playerId, maxFeeEur, player: valueEur === undefined ? undefined : { id: playerId, name: `P${playerId}`, overall: 70, positions: ['ST'], valueEur, valuationEstimated: false },
})

describe('Transfer Merkezi hesapları (V3-06c)', () => {
  it('alım sonrası bütçe = bütçe − bedel; bütçe ya da bedel bilinmiyorsa yok (0 değil, ENG-02)', () => {
    expect(budgetAfterPurchase(5_000_000, 1_500_000)).toBe(3_500_000)
    expect(budgetAfterPurchase(1_000_000, 1_500_000)).toBe(-500_000)
    expect(budgetAfterPurchase(undefined, 1_500_000)).toBeUndefined()
    expect(budgetAfterPurchase(5_000_000, undefined)).toBeUndefined()
  })

  it('kısa liste tahmini bedeli: pazarlık tavanı, yoksa değer; ikisi de yoksa sayılmaz ve bilinmeyen sayısı döner', () => {
    expect(shortlistCost([item(1, 2_000_000), item(2, 3_000_000, 2_500_000), item(3)])).toEqual({ total: 4_500_000, unknown: 1, count: 3 })
    expect(shortlistCost([])).toEqual({ total: undefined, unknown: 0, count: 0 })
  })

  it('sözleşmede kalan ay oyun tarihine göre (30 günlük ay, sunucuyla aynı); tarih yoksa yok', () => {
    expect(contractMonthsLeft('2027-01-15', '2027-08-15')).toBe(7)
    expect(contractMonthsLeft('2027-01-15', '2026-12-01')).toBe(0)
    expect(contractMonthsLeft(undefined, '2027-08-15')).toBeUndefined()
  })
})
