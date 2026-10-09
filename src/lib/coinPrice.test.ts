import { describe, expect, it } from 'vitest'
import { clubCardCost, estimateCoinPrice, isBeforeDailyRefresh, lastDailyRefresh } from './coinPrice'

describe('coin fiyat tahmini', () => {
  it('rating arttıkça artar ve sınırlarda sabitlenir', () => {
    expect(estimateCoinPrice(60)).toBe(200)
    expect(estimateCoinPrice(82)).toBe(1100)
    expect(estimateCoinPrice(83)).toBeGreaterThan(estimateCoinPrice(82))
    expect(estimateCoinPrice(99)).toBe(200000)
  })

  it('kulüp kartı parasızdır, yalnızca küçük fırsat maliyeti taşır', () => {
    expect(clubCardCost(undefined)).toBe(0)
    expect(clubCardCost(10000)).toBe(200)
  })
})

describe('günlük yenileme sınırı (Londra 18:00)', () => {
  it('kışın (GMT) sınır 18:00Z yani TRT 21:00, yazın (BST) 17:00Z yani TRT 20:00 (BUG-12)', () => {
    expect(lastDailyRefresh(new Date('2027-01-15T19:00:00Z')).toISOString()).toBe('2027-01-15T18:00:00.000Z')
    expect(lastDailyRefresh(new Date('2027-01-15T17:00:00Z')).toISOString()).toBe('2027-01-14T18:00:00.000Z')
    expect(lastDailyRefresh(new Date('2026-07-15T17:30:00Z')).toISOString()).toBe('2026-07-15T17:00:00.000Z')
  })


  it('20:00 öncesinde sınır dünün 20:00\'ıdır, sonrasında bugünün 20:00\'ı', () => {
    const before = new Date('2026-10-09T10:00:00Z') // TRT 13:00
    const after = new Date('2026-10-09T18:30:00Z') // TRT 21:30
    expect(lastDailyRefresh(before).toISOString()).toBe('2026-10-08T17:00:00.000Z')
    expect(lastDailyRefresh(after).toISOString()).toBe('2026-10-09T17:00:00.000Z')
  })

  it('sınırdan önce alınan yakalama bayat sayılır', () => {
    const now = new Date('2026-10-09T18:30:00Z')
    expect(isBeforeDailyRefresh('2026-10-09T10:00:00Z', now)).toBe(true)
    expect(isBeforeDailyRefresh('2026-10-09T17:30:00Z', now)).toBe(false)
  })
})
