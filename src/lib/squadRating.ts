/**
 * Resmî olmayan ama rehberde adım adım verilen Squad Rating hesabı (FC 27 Squad Rating Guide):
 * ortalamanın üstündeki oyuncuların farkları düzeltme katsayısı olur, toplam + katsayı yuvarlanır, 18'e bölünüp aşağı yuvarlanır.
 * Oyun içi değer her zaman esastır; üçüncü taraf hesaplayıcılar küçük sapma gösterebilir.
 */
export const SQUAD_SIZE = 18

export function squadRating(ratings: number[]): number {
  if (ratings.length === 0) {
    return 0
  }
  const sum = ratings.reduce((a, b) => a + b, 0)
  const average = sum / ratings.length
  const correction = ratings.reduce((acc, r) => acc + Math.max(0, r - average), 0)
  return Math.floor(Math.round(sum + correction) / ratings.length)
}

/** Kadronun en iyi 18 oyuncusu (11 ilk + 7 yedek) üzerinden rating. */
export function bestSquadRating(overalls: number[]): { rating: number; counted: number } {
  const top = [...overalls].sort((a, b) => b - a).slice(0, SQUAD_SIZE)
  return { rating: squadRating(top), counted: top.length }
}

const STAR_STEPS: { min: number; stars: number }[] = [
  { min: 83, stars: 5 },
  { min: 79, stars: 4.5 },
  { min: 75, stars: 4 },
  { min: 71, stars: 3.5 },
  { min: 69, stars: 3 },
  { min: 67, stars: 2.5 },
  { min: 65, stars: 2 },
  { min: 63, stars: 1.5 },
  { min: 60, stars: 1 },
  { min: 2, stars: 0.5 },
]

export function starRating(rating: number): number {
  return STAR_STEPS.find((s) => rating >= s.min)?.stars ?? 0
}
