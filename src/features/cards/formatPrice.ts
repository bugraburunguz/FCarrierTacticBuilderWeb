/** Coin fiyatı: bilinmeyen "–", ≥1M "1,2M", ≥1K "12,5K" (08 G3). */
export function formatPrice(value?: number | null): string {
  if (value === undefined || value === null) {
    return '–'
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}K`
  }
  return String(value)
}
