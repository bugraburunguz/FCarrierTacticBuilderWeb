import rules from './utRules.fc27.json'
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

const REFRESH = rules.dailyRefresh

/** Verilen anda belirtilen saat diliminin UTC'ye göre farkı (ms); yaz/kış saatini Intl ile hesaplar. */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - Math.floor(instant / 1000) * 1000
}

/** Belirtilen saat diliminde yerel tarih+saatin UTC karşılığı. */
function zonedInstant(year: number, month: number, day: number, hour: number, timeZone: string): number {
  const guess = Date.UTC(year, month, day, hour)
  const first = guess - zoneOffsetMs(guess, timeZone)
  return guess - zoneOffsetMs(first, timeZone)
}

/**
 * Son günlük SBC/içerik yenilemesi: ayarlardaki saat dilimi ve saat (varsayılan Europe/London 18:00 → yazın TRT 20:00, kışın TRT 21:00).
 * Saat EA içerik takviminden alınmıştır, oyun içinde doğrulanmadı (utRules.fc27.json: dailyRefresh.verified=false).
 */
export function lastDailyRefresh(now: Date = new Date()): Date {
  const local = new Date(now.getTime() + zoneOffsetMs(now.getTime(), REFRESH.timezone))
  const today = zonedInstant(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), REFRESH.hour, REFRESH.timezone)
  if (today <= now.getTime()) {
    return new Date(today)
  }
  const previous = new Date(local.getTime() - 24 * 3600_000)
  return new Date(zonedInstant(previous.getUTCFullYear(), previous.getUTCMonth(), previous.getUTCDate(), REFRESH.hour, REFRESH.timezone))
}

export function isBeforeDailyRefresh(importedAt: string | Date, now: Date = new Date()): boolean {
  return new Date(importedAt).getTime() < lastDailyRefresh(now).getTime()
}
