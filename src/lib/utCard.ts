import type { CaptureCard, PlayerSummary } from '../api/types'

export type CardSource = 'club' | 'market' | 'catalog'

export interface UtCard {
  key: string
  source: CardSource
  name: string
  rating: number
  positions: string[]
  club?: string
  league?: string
  nationality?: string
  gender?: number
  price?: number
  untradeable?: boolean
  rarity?: string
  cardType?: 'ICON' | 'HERO' | 'HOF'
  playerId?: number
  attrs?: Record<string, number>
  /** Kulüp kartında yığın: 'club' | 'storage' (SBC storage) | 'purchased'. Eski kayıtlarda yok. */
  pile?: string
  duplicate?: boolean
  instanceId?: number
  faceUrl?: string
  faceStats?: number[]
  faceLabels?: string[]
  weakFoot?: number
  skillMoves?: number
}

/** Kulüp kartı için fiyat sinyali: pazar ortalaması, yoksa son satış, yoksa pazar alt sınırı. */
export function cardPrice(card: CaptureCard): number | undefined {
  return card.marketAverage || card.lastSalePrice || card.marketMin || undefined
}

export function fromCapture(card: CaptureCard, source: Exclude<CardSource, 'catalog'>, price?: number, keySuffix = ''): UtCard {
  return {
    key: `${source === 'club' ? 'c' : 'm'}:${card.instanceId}${keySuffix}`,
    source,
    name: card.name ?? `#${card.assetId}`,
    rating: card.rating,
    positions: card.positions.length > 0 ? card.positions : card.position ? [card.position] : [],
    club: card.club,
    league: card.league,
    nationality: card.nationality,
    gender: card.gender,
    price,
    untradeable: card.untradeable,
    rarity: card.rarity,
    cardType: card.cardType,
    playerId: card.playerId,
    attrs: card.attrs,
    pile: card.pile,
    duplicate: card.duplicate,
    instanceId: card.instanceId,
    faceUrl: card.faceUrl,
    faceStats: card.faceStats,
    faceLabels: card.faceLabels,
    weakFoot: card.weakFoot,
    skillMoves: card.skillMoves,
  }
}

export function fromSummary(player: PlayerSummary): UtCard {
  return {
    key: `p:${player.id}`,
    source: 'catalog',
    name: player.name,
    rating: player.overall,
    positions: player.positions,
    club: player.club,
    league: player.league,
    nationality: player.nationality,
    gender: player.gender,
    playerId: player.id,
    faceUrl: player.faceUrl,
  }
}

export interface PriceSummary {
  total: number
  known: number
  count: number
  average?: number
}

/** Seçili kartların fiyat özeti: ortalama yalnızca fiyatı bilinen kartlar üzerinden hesaplanır. */
export function priceSummary(cards: (UtCard | undefined)[]): PriceSummary {
  const placed = cards.flatMap((c) => (c ? [c] : []))
  const priced = placed.filter((c) => c.price !== undefined)
  const total = priced.reduce((sum, c) => sum + (c.price ?? 0), 0)
  return { total, known: priced.length, count: placed.length, average: priced.length > 0 ? Math.round(total / priced.length) : undefined }
}

/** Formasyon değişince kartları aynı mevkideki yeni slotlara taşır; yer bulamayanlar düşer. */
export function carryOver(
  oldSlots: { slotId: string; position: string }[],
  picked: Record<string, UtCard>,
  newSlots: { slotId: string; position: string }[],
): Record<string, UtCard> {
  const free = [...newSlots]
  const result: Record<string, UtCard> = {}
  oldSlots.forEach((slot) => {
    const card = picked[slot.slotId]
    if (!card) {
      return
    }
    const index = free.findIndex((s) => s.position === slot.position)
    if (index >= 0) {
      result[free[index].slotId] = card
      free.splice(index, 1)
    }
  })
  return result
}
