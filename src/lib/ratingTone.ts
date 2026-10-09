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

const GRADE_STEPS: [number, string][] = [[90, 'S'], [85, 'A+'], [80, 'A'], [75, 'B+'], [70, 'B'], [60, 'C']]

/** Rol uyumu / meta skorunu harf notuna çevirir (DS-12): S, A+, A, B+, B, C, D. */
export function letterGrade(score: number): string {
  return GRADE_STEPS.find(([min]) => score >= min)?.[1] ?? 'D'
}
