export type RatingTone = 'elite' | 'high' | 'mid' | 'low' | 'poor'

/** Stat/rating renk eşikleri (02 §2.1): ≥90 elite, 80-89 high, 70-79 mid, 60-69 low, <60 poor. */
export function ratingTone(value: number): RatingTone {
  return value >= 90 ? 'elite' : value >= 80 ? 'high' : value >= 70 ? 'mid' : value >= 60 ? 'low' : 'poor'
}

export const TONE_VAR: Record<RatingTone, string> = {
  elite: 'var(--color-r-elite)',
  high: 'var(--color-r-high)',
  mid: 'var(--color-r-mid)',
  low: 'var(--color-r-low)',
  poor: 'var(--color-r-poor)',
}

/**
 * FCA-3 (Stitch) 1–99 kesintisiz renk: 1 → kırmızı (--rate-low), 50 → amber (--rate-60), 80+ → yeşil (--rate-90); arası oklab karışımı.
 * Renk tek başına anlam taşımaz: değer her zaman sayıyla yazılır.
 */
export function ratingBlend(value: number): string {
  const mix = (to: string, from: string, t: number) => `color-mix(in oklab, ${to} ${Math.round(t * 100)}%, ${from})`
  if (value <= 1) return 'var(--rate-low)'
  if (value < 50) return mix('var(--rate-60)', 'var(--rate-low)', (value - 1) / 49)
  if (value === 50) return 'var(--rate-60)'
  if (value < 80) return mix('var(--rate-90)', 'var(--rate-60)', (value - 50) / 30)
  return 'var(--rate-90)'
}

const GRADE_STEPS: [number, string][] = [[90, 'S'], [85, 'A+'], [80, 'A'], [75, 'B+'], [70, 'B'], [60, 'C']]

/** Rol uyumu / meta skorunu harf notuna çevirir (DS-12): S, A+, A, B+, B, C, D. */
export function letterGrade(score: number): string {
  return GRADE_STEPS.find(([min]) => score >= min)?.[1] ?? 'D'
}
