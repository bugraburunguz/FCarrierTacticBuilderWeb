import type { CareerRecommendationItem } from '../../api/types'

/** FCA-4 Transfer ayrıntılı filtresi (Stitch): gelen öneri sonucunu tarayıcıda süzer; istek ve kredi değişmez. Adres: `minovr`, `minpot`, `maxdeger`. */
export interface TransferFilters {
  minOvr?: number
  minPot?: number
  maxValue?: number
}

export const FILTER_PARAMS = { minOvr: 'minovr', minPot: 'minpot', maxValue: 'maxdeger' } as const

const positive = (raw: string | null): number | undefined => {
  const n = Number(raw)
  return raw !== null && Number.isFinite(n) && n > 0 ? n : undefined
}

export function parseFilters(params: URLSearchParams): TransferFilters {
  const out: TransferFilters = {}
  for (const [key, param] of Object.entries(FILTER_PARAMS) as [keyof TransferFilters, string][]) {
    const value = positive(params.get(param))
    if (value !== undefined) {
      out[key] = value
    }
  }
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
