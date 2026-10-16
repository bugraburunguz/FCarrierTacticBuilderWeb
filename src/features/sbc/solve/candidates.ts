import type { PlayerSummary } from '../../../api/types'
import { estimateCoinPrice } from '../../../lib/coinPrice'
import type { SbcCandidate } from '../../../lib/sbcTraditional'
import { personKey, type UtCard } from '../../../lib/utCard'
import { rulesStore } from '../../../state/rulesStore'

/**
 * Görünüm sınıfı (maliyet değil): 0 kulüp takas edilemez, 1 kulüp, 2 gözlenmiş fiyatı olan pazar kartı, 3 fiyatı bilinmeyen katalog kartı.
 * Arayüz: ≤1 "✓" (kulüp), ≥2 alışveriş listesi.
 */
export type Tier = 0 | 1 | 2 | 3

/** Takas edilemez kart aynı reytingde bu oranda ucuz sayılır (mutlak öncelik değil). */
export const UNTRADEABLE_DISCOUNT = 0.5
/** "Toplam değeri en aza indir" modunda korunan kartın maliyet çarpanı: yalnız şart gerektirirse seçilir (şart cezası her zaman daha büyük). */
const SPECIAL_PROTECTION = 1_000
/**
 * V3-06b/0 "Önce kulüp": satın alınan her kartın taban maliyeti; kulüpteki (korunmayan) kartların herhangi bir toplamı tek satın almadan ucuz
 * (kulüp kartı değeri < 1e7 × 11). Korunan kartın tabanı 11 satın almadan da büyük: yalnız şart gerektirirse kullanılır.
 */
const PURCHASE_BASE = 1e9
const PROTECTED_BASE = 1e11
/** Kilitli kart her kadroya girsin diye maliyeti çok düşük. */
const LOCKED_COST = -1_000_000_000_000
/** Bilinen eğrinin üst ucundan sonra her reyting puanı için artış (yüksek reyting = yüksek maliyet, düzleşmez). */
const ABOVE_CURVE_GROWTH = 1.5
const CURVE_TOP = 90

/**
 * V3-05d-c — kartın değer vekili, TEK yerde: bilgi tabanında gözlenmiş fiyat varsa o; yoksa reytinge göre kesin artan değer
 * (coinPrice eğrisi, üst uçtan sonra katlanarak). Takas edilemez kart UNTRADEABLE_DISCOUNT ile ucuzlar. Arayüzde gösterilmez; yalnız çözücü maliyeti.
 */
export function valueProxy({ rating, knownPrice, untradeable }: { rating: number; knownPrice?: number; untradeable?: boolean }): number {
  const base = knownPrice ?? (rating <= CURVE_TOP ? estimateCoinPrice(rating) + rating : estimateCoinPrice(CURVE_TOP) * ABOVE_CURVE_GROWTH ** (rating - CURVE_TOP))
  return untradeable ? base * UNTRADEABLE_DISCOUNT : base
}

/** Özel kart: EA rareflag > 1 (TOTW, promo…) ya da ICON/HERO/HOF. */
export function isSpecial(card: Pick<UtCard, 'rarityId' | 'cardType'>): boolean {
  return (card.rarityId ?? 0) > 1 || card.cardType !== undefined
}

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
  special?: boolean
}

export interface Customize {
  locked: string[]
  excluded: string[]
  onlyClub: boolean
  /** Bütçe üst sınırı (coin): fiyatı bilinmeyen kart alınmaz, bilinenlerin toplamı aşılmaz. */
  budget?: number
  /** "Özel kartları koru" (varsayılan açık): özel kulüp kartı yalnız şart gerektirirse kullanılır. */
  protectSpecial: boolean
  /** Bu reytingden itibaren kulüp kartı korunur (yalnız şart gerektirirse); varsayılan 85. */
  protectRatingFrom: number
  /** V3-06b/0: "Önce kulüp" (varsayılan; harcanacak coin en aza, kulüp yetiyorsa satın alma yok) / "Toplam değeri en aza indir". */
  mode: 'club-first' | 'min-value'
}

export const DEFAULT_CUSTOMIZE: Customize = { locked: [], excluded: [], onlyClub: false, protectSpecial: true, protectRatingFrom: 85, mode: 'club-first' }

type CostOptions = Pick<Customize, 'protectSpecial' | 'protectRatingFrom' | 'mode'>

/**
 * Kulüp kartı maliyeti = feda edilen değer: değer vekili × (1 − transfer vergisi) — kart satılsa elde edilecek olan (vergi kurallardan, GET /ut/rules).
 * Böylece aynı değerde pazardan almak yerine kulüp kartı kullanılır; korunan özel kart çok pahalı.
 */
export function clubCandidates(cards: UtCard[], options: Partial<CostOptions> = {}): PlanCandidate[] {
  const { protectSpecial, protectRatingFrom, mode } = { ...DEFAULT_CUSTOMIZE, ...options }
  const afterTax = 1 - rulesStore.get().transferTax
  return cards.filter((c) => c.source === 'club').map((c) => {
    const special = isSpecial(c)
    const value = valueProxy({ rating: c.rating, untradeable: c.untradeable }) * afterTax
    // Korunan: özel kart (koruma açıkken) ya da eşik üstü reyting — yalnız şart gerektirirse seçilir.
    const protectedCard = (special && protectSpecial) || c.rating >= protectRatingFrom
    const price = !protectedCard ? value : mode === 'club-first' ? PROTECTED_BASE + value : value * SPECIAL_PROTECTION
    return {
      id: c.instanceId ?? hash(c.key), cardKey: c.key, name: c.name, assetId: c.assetId, overall: c.rating, positions: c.positions, club: c.club, league: c.league, nationality: c.nationality,
      clubId: c.clubId, leagueId: c.leagueId, nationId: c.nationId, gender: c.gender, cardType: c.cardType, rarity: c.rarity, faceUrl: c.faceUrl,
      source: c.pile === 'storage' ? 'storage' : 'club', untradeable: c.untradeable, playerKey: `p:${personKey(c)}`, tier: c.untradeable ? 0 : 1, special,
      price,
    }
  })
}

/**
 * Pazar/katalog kartı maliyeti = gözlenmiş fiyat, yoksa değer vekili (fiyatı bilinmeyen kart maliyetsiz sayılmaz).
 * "Önce kulüp" modunda satın alma tabanı eklenir: kulüp şartı karşılıyorsa satın alma yok, yetmiyorsa eksik kadar.
 */
export function marketCandidates(players: PlayerSummary[], prices: Map<number, number>, { mode }: Partial<CostOptions> = DEFAULT_CUSTOMIZE): PlanCandidate[] {
  const base = (mode ?? DEFAULT_CUSTOMIZE.mode) === 'club-first' ? PURCHASE_BASE : 0
  return players.map((p) => {
    const knownPrice = p.faceAssetId !== undefined ? prices.get(p.faceAssetId) : undefined
    return {
      id: p.id, cardKey: `m:${p.id}`, name: p.name, assetId: p.faceAssetId, overall: p.overall, positions: p.positions, club: p.club, league: p.league, nationality: p.nationality, gender: p.gender,
      faceUrl: p.faceUrl, source: 'market', playerKey: `p:${p.faceAssetId ?? p.id}`, resourceId: p.faceAssetId, knownPrice, tier: knownPrice !== undefined ? 2 : 3,
      price: base + valueProxy({ rating: p.overall, knownPrice }),
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
