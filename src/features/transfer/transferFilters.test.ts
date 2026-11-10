import { describe, expect, it } from 'vitest'
import type { CareerRecommendationItem } from '../../api/types'
import { candidateFilter, parseFilters } from './transferFilters'

const item = (overall: number, potential: number | undefined, valueEur: number | undefined) =>
  ({ player: { id: 1, name: 'A', overall, potential, valueEur, positions: ['CM'] } }) as unknown as CareerRecommendationItem

describe('FCA-4 Transfer ayrıntılı filtre', () => {
  it('adresten okunur: minovr, minpot, maxdeger; geçersiz değer yok sayılır', () => {
    expect(parseFilters(new URLSearchParams('minovr=70&minpot=78&maxdeger=2500000'))).toEqual({ minOvr: 70, minPot: 78, maxValue: 2_500_000 })
    expect(parseFilters(new URLSearchParams('minovr=abc&minpot=0'))).toEqual({})
  })

  it('OVR/POT 1–99 aralığına sıkışır ve tam sayı olur (150 → 99, 60.5 → 60); değer tam euro', () => {
    expect(parseFilters(new URLSearchParams('minovr=150&minpot=60.5&maxdeger=2500000.7'))).toEqual({ minOvr: 99, minPot: 60, maxValue: 2_500_000 })
  })

  it('filtre yoksa süzgeç yok (undefined); varsa en düşük OVR/POT ve en yüksek değer uygulanır', () => {
    expect(candidateFilter({})).toBeUndefined()
    const f = candidateFilter({ minOvr: 70, minPot: 78, maxValue: 2_000_000 })!
    expect(f(item(72, 80, 1_500_000))).toBe(true)
    expect(f(item(69, 80, 1_500_000))).toBe(false)
    expect(f(item(72, 77, 1_500_000))).toBe(false)
    expect(f(item(72, 80, 2_500_000))).toBe(false)
  })

  it('bilinmeyen POT ya da değer elemez (veri yoksa kullanıcıdan saklanmaz)', () => {
    const f = candidateFilter({ minPot: 78, maxValue: 2_000_000 })!
    expect(f(item(72, undefined, undefined))).toBe(true)
  })
})
