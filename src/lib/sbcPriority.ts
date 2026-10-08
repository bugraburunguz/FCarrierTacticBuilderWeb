import { estimateCoinPrice } from './coinPrice'
import type { UtCard } from './utCard'

/** Kulüp kartı ile aynı fiyattaki market kartı arasında kulüp tercih edilsin (öncelik: Storage → Kadro → Market). */
export const CLUB_TIE_FACTOR = 0.95

export type OwnedSource = 'storage' | 'club'

export function ownedSource(card: UtCard): OwnedSource {
  return card.pile === 'storage' ? 'storage' : 'club'
}

/**
 * Sahip olunan kartın SBC'ye verilirken "feda edilen değeri".
 * Storage ve duplicate kartlar fiilen bedava (aynı karttan fazlası); kadrodaki kart satış değeri kadar maliyetlidir,
 * böylece 10K'lık bir kartı vermek yerine daha ucuz bir market kartı varsa o seçilir.
 */
export function ownedCost(card: UtCard): number {
  if (ownedSource(card) === 'storage' || card.duplicate) {
    return 0
  }
  return (card.price ?? estimateCoinPrice(card.rating)) * CLUB_TIE_FACTOR
}
