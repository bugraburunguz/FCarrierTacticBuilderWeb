/** Sözleşme ve oyun tarihi hesapları (ENG-04: bugünün değil oyunun tarihi); kariyer listesi süzgeci, Masa uyarısı ve Transfer satış planı ortak. */

/** "Sözleşmesi bitmek üzere": oyun tarihinden itibaren bu kadar ay içinde biten (E3-10b süzgeci ve V3-06d Masa uyarısı aynı eşik). */
export const CONTRACT_MONTHS = 6
const DAYS_PER_MONTH = 30
const DAY_MS = 86_400_000

/** İki ISO tarih arası gün (UTC, saat dilimi kaymasız); biri yoksa yok. */
export function daysBetween(from: string | undefined, to: string | undefined): number | undefined {
  if (!from || !to) {
    return undefined
  }
  return Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / DAY_MS)
}

/** Sözleşmede kalan tam ay, oyun tarihine göre (30 günlük ay, sunucu FeasibilityInputs.monthsLeft ile aynı); tarih yoksa yok. */
export function contractMonthsLeft(gameDate: string | undefined, contractUntil: string | undefined): number | undefined {
  const days = daysBetween(gameDate, contractUntil)
  return days === undefined ? undefined : Math.max(0, Math.floor(days / DAYS_PER_MONTH))
}
