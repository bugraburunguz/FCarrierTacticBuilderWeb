import { describe, expect, it } from 'vitest'
import { bestSquadRating, squadRating, starRating } from './squadRating'

describe('squad rating', () => {
  it('rehberdeki örnek: 13 x 80 + 5 x 85 → 82', () => {
    const ratings = [...Array(13).fill(80), ...Array(5).fill(85)]
    expect(squadRating(ratings)).toBe(82)
  })

  it('tek tip kadroda düzeltme yoktur', () => {
    expect(squadRating(Array(18).fill(75))).toBe(75)
  })

  it('boş kadro 0 verir', () => {
    expect(squadRating([])).toBe(0)
  })

  it('en iyi 18 oyuncu sayılır, fazlası dikkate alınmaz', () => {
    const overalls = [...Array(18).fill(80), 50, 50]
    expect(bestSquadRating(overalls)).toEqual({ rating: 80, counted: 18 })
  })

  it('yıldız eşikleri tabloya uyar', () => {
    expect(starRating(83)).toBe(5)
    expect(starRating(82)).toBe(4.5)
    expect(starRating(70)).toBe(3)
    expect(starRating(62)).toBe(1)
    expect(starRating(59)).toBe(0.5)
    expect(starRating(1)).toBe(0)
  })
})
