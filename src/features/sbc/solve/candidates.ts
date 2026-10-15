import type { PlayerSummary } from '../../../api/types'
import type { SbcCandidate } from '../../../lib/sbcTraditional'
import { personKey, type UtCard } from '../../../lib/utCard'

/**
 * V3-05d çözücü önceliği (katman): 0 kulüp takas edilemez → 1 kulüp (düşük değerli önce) → 2 bilgi tabanında gözlenmiş fiyatı olan en ucuz pazar kartı
 * → 3 fiyatı bilinmeyen en düşük reytingli uygun katalog kartı. Çözücü maliyeti (SbcCandidate.price) katman taban değeri + katman içi sıradır;
 * tabanlar, bir üst katmandaki tek kartın alttaki 11 kartın toplamından pahalı olacağı kadar ayrık.
 */
export type Tier = 0 | 1 | 2 | 3

const TIER_BASE = [0, 1_000, 100_000, 10_000_000_000] as const
/** Kulüp kartının değer sırası için üst sınır (coin): katman 1'in maliyeti 1000-1980 aralığında kalır. */
const CLUB_VALUE_CAP = 98_000
/** Kilitli kart her kadroya girsin diye maliyeti çok düşük. */
const LOCKED_COST = -1_000_000_000_000

export interface PlanCandidate extends SbcCandidate {
  tier: Tier
  /** Kartın kararlı anahtarı (kulüp: kart anahtarı; pazar: `m:<katalog id>`). Kilit/hariç tut bununla. */
  cardKey: string
  untradeable?: boolean
  /** Yalnız bilgi tabanındaki gözlemden; yoksa tanımsız ("fiyat yok"). */
  knownPrice?: number
  /** EA kaynak kimliği (fiyat sorgusu). */
  resourceId?: number
  locked?: boolean
}

export interface Customize {
  locked: string[]
  excluded: string[]
  onlyClub: boolean
  /** Bütçe üst sınırı (coin): fiyatı bilinmeyen kart alınmaz, bilinenlerin toplamı aşılmaz. */
  budget?: number
}

export const DEFAULT_CUSTOMIZE: Customize = { locked: [], excluded: [], onlyClub: false }

export function clubCandidates(cards: UtCard[]): PlanCandidate[] {
  return cards.filter((c) => c.source === 'club').map((c) => {
    const tier: Tier = c.untradeable ? 0 : 1
    const order = tier === 0 ? c.rating : Math.min(c.price ?? c.rating * 100, CLUB_VALUE_CAP) / 100
    return {
      id: c.instanceId ?? hash(c.key), cardKey: c.key, name: c.name, overall: c.rating, positions: c.positions, club: c.club, league: c.league, nationality: c.nationality,
      clubId: c.clubId, leagueId: c.leagueId, nationId: c.nationId, gender: c.gender, cardType: c.cardType, rarity: c.rarity, faceUrl: c.faceUrl,
      source: c.pile === 'storage' ? 'storage' : 'club', untradeable: c.untradeable, playerKey: `p:${personKey(c)}`, tier, price: TIER_BASE[tier] + order,
    }
  })
}

export function marketCandidates(players: PlayerSummary[], prices: Map<number, number>): PlanCandidate[] {
  return players.map((p) => {
    const knownPrice = p.faceAssetId !== undefined ? prices.get(p.faceAssetId) : undefined
    const tier: Tier = knownPrice !== undefined ? 2 : 3
    return {
      id: p.id, cardKey: `m:${p.id}`, name: p.name, overall: p.overall, positions: p.positions, club: p.club, league: p.league, nationality: p.nationality, gender: p.gender,
      faceUrl: p.faceUrl, source: 'market', playerKey: `p:${p.faceAssetId ?? p.id}`, resourceId: p.faceAssetId, knownPrice, tier,
      price: TIER_BASE[tier] + (knownPrice ?? p.overall * 1000),
    }
  })
}

/** Özelleştir uygulanmış havuz: hariç tutulanlar düşer, kilitliler en düşük maliyetle, yalnız kulüpte pazar yok, bütçede fiyatı bilinmeyen ve tek başına aşan yok. */
export function buildPool(club: PlanCandidate[], market: PlanCandidate[], customize: Customize): PlanCandidate[] {
  const excluded = new Set(customize.excluded)
  const locked = new Set(customize.locked)
  const marketAllowed = customize.onlyClub ? [] : market.filter((m) => customize.budget === undefined || (m.knownPrice !== undefined && m.knownPrice <= customize.budget))
  return [...club, ...marketAllowed]
    .filter((c) => !excluded.has(c.cardKey))
    .map((c) => (locked.has(c.cardKey) ? { ...c, locked: true, price: LOCKED_COST } : c))
}

function hash(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0
  }
  return Math.abs(h) + 1_000_000_000
}
