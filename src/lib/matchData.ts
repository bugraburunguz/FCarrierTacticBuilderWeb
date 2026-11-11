/**
 * FCA-22 maç verisi yardımcıları. Turnuva adları için tek eşleme yeri `COMPETITION_NAMES`: LE betiği 2.1 adları getirince buraya
 * (ya da sunucudan gelen eşlemeye) bağlanır; adı bilinmeyen turnuva kodla gösterilir.
 */
export const COMPETITION_NAMES: Readonly<Record<number, string>> = {}

export function competitionName(id: number, names: Readonly<Record<number, string>> = COMPETITION_NAMES): string {
  return names[id] ?? `Turnuva ${id}`
}

/** Oyunun maç mevki kodu ham gösterilir; 28/29 anlamı bilinmiyor, gösterilmez. */
const UNKNOWN_POSITIONS = new Set([28, 29])

export function matchPositionLabel(code: number | undefined | null): string | undefined {
  return code === undefined || code === null || UNKNOWN_POSITIONS.has(code) ? undefined : String(code)
}

export type RatingTone = 'good' | 'info' | 'warn' | 'bad'

/** Maç notu (1–10) tonu; renk her zaman sayıyla birlikte gösterilir. */
export function ratingTone(rating: number): RatingTone {
  if (rating >= 8) return 'good'
  if (rating >= 7) return 'info'
  if (rating >= 6) return 'warn'
  return 'bad'
}

/** Sunucu en yeniyi önce verir; çizim en eskiden en yeniye (en yeni sağda). */
export function oldestFirst<T>(newestFirst: readonly T[]): T[] {
  return [...newestFirst].reverse()
}

const AVG = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatAverageRating(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : AVG.format(value)
}
