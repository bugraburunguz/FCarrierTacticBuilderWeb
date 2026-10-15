import type { SbcPoolEntry, SbcRarity } from '../../../api/types'
import type { UtCard } from '../../../lib/utCard'

const rarityOf = (card: UtCard): SbcRarity => (card.cardType === 'ICON' ? 'ICON' : card.cardType === 'HERO' ? 'HERO' : card.rarity && /totw|inform|in-form/i.test(card.rarity) ? 'TOTW' : 'REGULAR')

/**
 * Skor tabanlı (ITEM_SCORE) görev: kulüp kartlarından mevcut StreamlinedSolver havuzu (reyting × tür × takas durumu gruplanır).
 * Fiyat yalnız takas edilebilir ve bilinen kartta (kartın yakalanan pazar sinyali); tahmin yok.
 */
export function streamlinedPool(cards: UtCard[]): SbcPoolEntry[] {
  const groups = new Map<string, SbcPoolEntry>()
  cards.filter((c) => c.source === 'club').forEach((c) => {
    const untradeable = Boolean(c.untradeable)
    const rarity = rarityOf(c)
    const priceEach = untradeable ? undefined : c.price
    const key = `${c.rating}|${rarity}|${untradeable}|${priceEach ?? ''}`
    const current = groups.get(key)
    groups.set(key, current ? { ...current, count: current.count + 1 } : { rating: c.rating, rarity, count: 1, untradeable, priceEach })
  })
  return [...groups.values()].sort((a, b) => a.rating - b.rating)
}
