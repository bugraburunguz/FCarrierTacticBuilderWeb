/** Kalan süreyi "3g 4s" ya da "5s 12dk" biçiminde verir; geçmişse undefined. Son 24 saat "urgent". (V3-07c: KbSbcList'ten taşındı.) */
export function timeLeft(endsAt?: string, now: number = Date.now()): { text: string; urgent: boolean } | undefined {
  if (!endsAt) {
    return undefined
  }
  const ms = new Date(endsAt).getTime() - now
  if (ms <= 0) {
    return undefined
  }
  const minutes = Math.floor(ms / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const text = days > 0 ? `${days}g ${hours}s` : hours > 0 ? `${hours}s ${minutes % 60}dk` : `${minutes}dk`
  return { text, urgent: ms < 24 * 3_600_000 }
}
