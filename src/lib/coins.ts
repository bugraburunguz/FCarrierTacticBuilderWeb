/** Coin gösterimi: tam sayı (tr-TR) ve kısa (1.2M / 340K). Bilinmeyen değer "—". */
export function coins(value?: number): string {
  return value === undefined ? '—' : value.toLocaleString('tr-TR')
}

export function shortCoins(value?: number): string {
  if (value === undefined) {
    return '—'
  }
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `${Math.round(value / 1000)}K` : String(value)
}
