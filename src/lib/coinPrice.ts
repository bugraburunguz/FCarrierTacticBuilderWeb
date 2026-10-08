/**
 * Piyasa fiyatı verisi olmadığında SBC maliyeti için rating başına kaba coin tahmini (yakın dönem SBC dolgu kartı seviyeleri).
 * Gerçek fiyat DEĞİLDİR; yalnızca "en ucuz yol" sıralaması için bir yaklaşıktır. Kendi piyasa ilanların yakalandıysa o fiyatlar kullanılmalı.
 */
const ANCHORS: [number, number][] = [
  [70, 200], [75, 250], [78, 350], [80, 500], [81, 700], [82, 1100], [83, 2000], [84, 4500], [85, 9000], [86, 18000], [87, 30000], [88, 55000], [89, 100000], [90, 200000],
]

export function estimateCoinPrice(rating: number): number {
  if (rating <= ANCHORS[0][0]) {
    return ANCHORS[0][1]
  }
  for (let i = 1; i < ANCHORS.length; i++) {
    const [r1, p1] = ANCHORS[i]
    if (rating <= r1) {
      const [r0, p0] = ANCHORS[i - 1]
      const share = (rating - r0) / (r1 - r0)
      return Math.round(Math.exp(Math.log(p0) + share * (Math.log(p1) - Math.log(p0))))
    }
  }
  return ANCHORS[ANCHORS.length - 1][1]
}

/** Kulüp kartı "parasız" sayılır; yalnızca değerli kartları gereksiz yakmamak için küçük bir fırsat maliyeti eklenir. */
export const CLUB_OPPORTUNITY_WEIGHT = 0.02

export function clubCardCost(price?: number): number {
  return (price ?? 0) * CLUB_OPPORTUNITY_WEIGHT
}

/** Bugünkü (ya da son geçmiş) 20:00 (Türkiye saati) sınırı: SBC'ler günlük bu saatte yenilenir. */
export function lastDailyRefresh(now: Date = new Date()): Date {
  const istanbul = new Date(now.getTime() + 3 * 3600_000)
  const boundary = Date.UTC(istanbul.getUTCFullYear(), istanbul.getUTCMonth(), istanbul.getUTCDate(), 20, 0, 0)
  const todayBoundary = boundary - 3 * 3600_000
  return new Date(todayBoundary <= now.getTime() ? todayBoundary : todayBoundary - 24 * 3600_000)
}

export function isBeforeDailyRefresh(importedAt: string | Date, now: Date = new Date()): boolean {
  return new Date(importedAt).getTime() < lastDailyRefresh(now).getTime()
}
