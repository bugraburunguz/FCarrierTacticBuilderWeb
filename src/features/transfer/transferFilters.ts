import type { CareerRecommendationItem } from '../../api/types'

/** FCA-4 Transfer ayrıntılı filtresi (Stitch): gelen öneri sonucunu tarayıcıda süzer; istek ve kredi değişmez. Adres: `minovr`, `minpot`, `maxdeger`. */
export interface TransferFilters {
  minOvr?: number
  minPot?: number
  maxValue?: number
}

export const FILTER_PARAMS = { minOvr: 'minovr', minPot: 'minpot', maxValue: 'maxdeger' } as const

const MAX_RATING = 99

const positive = (raw: string | null): number | undefined => {
  const n = Number(raw)
  return raw !== null && Number.isFinite(n) && n >= 1 ? Math.floor(n) : undefined
}

/** OVR/POT 1–99'a sıkışır (150 → 99), tam sayı; değer tam euro. 0, negatif ya da sayı olmayan yok sayılır. */
export function parseFilters(params: URLSearchParams): TransferFilters {
  const out: TransferFilters = {}
  const ovr = positive(params.get(FILTER_PARAMS.minOvr))
  const pot = positive(params.get(FILTER_PARAMS.minPot))
  const value = positive(params.get(FILTER_PARAMS.maxValue))
  if (ovr !== undefined) out.minOvr = Math.min(MAX_RATING, ovr)
  if (pot !== undefined) out.minPot = Math.min(MAX_RATING, pot)
  if (value !== undefined) out.maxValue = value
  return out
}

/** Filtre yoksa `undefined` (panel süzmez). Bilinmeyen POT ya da değer elemez: veri eksikliği adayı saklamamalı. */
export function candidateFilter(f: TransferFilters): ((item: CareerRecommendationItem) => boolean) | undefined {
  if (f.minOvr === undefined && f.minPot === undefined && f.maxValue === undefined) {
    return undefined
  }
  return ({ player }) =>
    (f.minOvr === undefined || player.overall >= f.minOvr)
    && (f.minPot === undefined || player.potential === undefined || player.potential === null || player.potential >= f.minPot)
    && (f.maxValue === undefined || player.valueEur === undefined || player.valueEur === null || player.valueEur <= f.maxValue)
}
