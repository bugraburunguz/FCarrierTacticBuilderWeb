import type { KbSbcSet, RewardItem, SbcSetVotes } from '../../api/types'

/** "Yeni" / "Değişti" rozetlerinin penceresi (saat). Tek yer: bileşenler buradan okur. */
export const BADGE_WINDOW_HOURS = 48
/** "Bitiyor" sekmesi: bitişine bu kadar saat kalan setler. */
export const ENDING_SOON_HOURS = 24
const HOUR = 3_600_000
const MINUTE = 60_000

export type SbcBadge = 'new' | 'changed'

const within = (at: string | undefined, now: number, hours: number) => {
  const t = at ? Date.parse(at) : NaN
  return Number.isFinite(t) && now - t <= hours * HOUR && t <= now + MINUTE
}

/** Yeni = ilk görülme son pencerede; Değişti = içerik son pencerede değişti ve Yeni değil. Veri yoksa rozet yok. */
export function sbcBadge(set: Pick<KbSbcSet, 'firstSeenAt' | 'contentChangedAt'>, now: number): SbcBadge | null {
  if (within(set.firstSeenAt, now, BADGE_WINDOW_HOURS)) {
    return 'new'
  }
  return within(set.contentChangedAt, now, BADGE_WINDOW_HOURS) ? 'changed' : null
}

export const BADGE_TEXT: Record<SbcBadge, string> = { new: 'Yeni', changed: 'Değişti' }

/** Kalan süre: "3 gün 4 sa", "2 sa 14 dk", "45 dk" (en az 1 dk). Bitiş yok ya da geçmişse null (gösterilmez). */
export function countdownText(endsAt: string | undefined, now: number): string | null {
  const end = endsAt ? Date.parse(endsAt) : NaN
  if (!Number.isFinite(end) || end <= now) {
    return null
  }
  const minutes = Math.max(1, Math.floor((end - now) / MINUTE))
  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  const mins = minutes % 60
  if (days > 0) {
    return `${days} gün${hours > 0 ? ` ${hours} sa` : ''}`
  }
  return hours > 0 ? `${hours} sa${mins > 0 ? ` ${mins} dk` : ''}` : `${mins} dk`
}

export const endingSoon = (set: Pick<KbSbcSet, 'endsAt'>, now: number) => {
  const end = set.endsAt ? Date.parse(set.endsAt) : NaN
  return Number.isFinite(end) && end > now && end - now <= ENDING_SOON_HOURS * HOUR
}

/** EA SBC kategori adı → Türkçe etiket (tek sözlük). Bilinmeyen kategori ham adıyla gösterilir. */
export const SBC_CATEGORY_LABELS: Record<string, string> = {
  Favourites: 'Favoriler',
  Players: 'Oyuncular',
  Icons: 'Icon',
  Upgrades: 'Yükseltmeler',
  Challenges: 'Mücadeleler',
  Foundations: 'Temeller',
  Exchanges: 'Takaslar',
  Special: 'Özel',
}
export const categoryLabel = (raw: string) => SBC_CATEGORY_LABELS[raw] ?? raw

// ---- süzgeç ↔ adres çubuğu ----

/** Sekme: tumu | yeni | bitiyor | kategori:<ham ad>. Sıralama: yeni (ilk görülme azalan) | bitiyor (bitiş artan). */
export type SbcTab = 'tumu' | 'yeni' | 'bitiyor' | `kategori:${string}`
export type SbcSort = 'yeni' | 'bitiyor'
export interface SbcFilters {
  tab: SbcTab
  q: string
  sort: SbcSort
}
export const DEFAULT_SBC_FILTERS: SbcFilters = { tab: 'tumu', q: '', sort: 'yeni' }

export function sbcFiltersFromParams(params: URLSearchParams): SbcFilters {
  const kategori = params.get('kategori')
  const sekme = params.get('sekme')
  const tab: SbcTab = kategori ? `kategori:${kategori}` : sekme === 'yeni' || sekme === 'bitiyor' ? sekme : 'tumu'
  return { tab, q: params.get('ara') ?? '', sort: params.get('sirala') === 'bitiyor' ? 'bitiyor' : 'yeni' }
}

/** Varsayılanlar (Tümü, boş arama, "yeni" sıralaması) adrese yazılmaz. */
export function sbcFiltersToParams(f: SbcFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.tab.startsWith('kategori:')) {
    p.set('kategori', f.tab.slice('kategori:'.length))
  } else if (f.tab !== 'tumu') {
    p.set('sekme', f.tab)
  }
  if (f.q.trim()) {
    p.set('ara', f.q)
  }
  if (f.sort !== 'yeni') {
    p.set('sirala', f.sort)
  }
  return p
}

/** Arama karşılaştırması: Türkçe küçük harf, aksan yok, ı = i (İngilizce set adlarında "Icon" tr'de "ıcon" olur). */
const fold = (s: string) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i')

export function filterSets(sets: KbSbcSet[], f: SbcFilters, now: number): KbSbcSet[] {
  const q = fold(f.q.trim())
  const kept = sets.filter((s) => {
    if (f.tab === 'yeni' && sbcBadge(s, now) !== 'new') return false
    if (f.tab === 'bitiyor' && !endingSoon(s, now)) return false
    if (f.tab.startsWith('kategori:') && s.category !== f.tab.slice('kategori:'.length)) return false
    return !q || fold(s.name).includes(q)
  })
  const seen = (s: KbSbcSet) => (s.firstSeenAt ? Date.parse(s.firstSeenAt) : 0)
  const end = (s: KbSbcSet) => (s.endsAt ? Date.parse(s.endsAt) : Infinity)
  return [...kept].sort((a, b) => (f.sort === 'bitiyor' ? end(a) - end(b) || b.id - a.id : seen(b) - seen(a) || b.id - a.id))
}

/** Veride gelen kategoriler, ilk görülme sırasıyla (sabit liste yok). */
export const categoriesOf = (sets: KbSbcSet[]) => [...new Set(sets.map((s) => s.category).filter(Boolean))]

/** Backend `repeatable`: -1 sınırsız, N > 0 N kez, boş tekrarsız (gösterilmez). */
export function repeatText(repeatable: number | undefined | null): string | null {
  if (repeatable === -1) {
    return '∞'
  }
  return repeatable && repeatable > 0 ? String(repeatable) : null
}

// ---- ödül ve oy ----

export interface SbcRewardSummary {
  /** EA kart verisi gelen oyuncu ödülleri (V3-05c-c): kart önce bundan çizilir. */
  eaItems: RewardItem[]
  /** EA verisi olmayan oyuncu ödülleri (EA kaynak kimliği); yedek: `ut_item`'da varsa kart çizilir. */
  itemResourceIds: number[]
  /** Oyuncu seçimi jetonu adedi (EA verisi var, oyuncu kartı değil): "Oyuncu seçimi" rozeti. */
  picks: number
  /** Paket ödülü adedi: paket adı veride yok, yalnız "Paket" rozeti. */
  packs: number
}

/** Yakalanan ödül listesi: `type` "item" (değer = kaynak kimliği) ve "pack"; diğer türler (ör. coin) bu turda gösterilmez. */
export function parseReward(reward: unknown): SbcRewardSummary {
  const list = Array.isArray(reward) ? (reward as { type?: string; value?: number; count?: number; item?: RewardItem }[]) : []
  const itemResourceIds: number[] = []
  const eaItems: RewardItem[] = []
  let packs = 0
  let picks = 0
  for (const r of list) {
    const type = r?.type?.toLowerCase()
    if (type === 'item' && r.item && isPlayerCard(r.item)) {
      eaItems.push(r.item)
    } else if (type === 'item' && r.item) {
      // EA verisi var ama oyuncu kartı değil: "oyuncu seçimi" jetonu (gerçek yakalamada assetId 0, mevki yok, reyting 99).
      picks += Math.max(1, r.count ?? 1)
    } else if (type === 'item' && typeof r.value === 'number') {
      itemResourceIds.push(r.value)
    } else if (type === 'pack') {
      packs += Math.max(1, r.count ?? 1)
    }
  }
  return { itemResourceIds, eaItems, picks, packs }
}

/** Oyuncu kartı: gerçek assetId ve mevki var (allowlist alanlarıyla; itemType alınmadığı için bu iki alana bakılır). */
function isPlayerCard(item: RewardItem): boolean {
  return typeof item.rating === 'number' && (item.assetId ?? 0) > 0 && Boolean(item.preferredPosition)
}

/** Beğeni oranı (yüzde, yuvarlanmış); oy yoksa null (gösterilmez). */
export function votePct(votes: SbcSetVotes | undefined): number | null {
  const total = (votes?.up ?? 0) + (votes?.down ?? 0)
  return votes && total > 0 ? Math.round((votes.up / total) * 100) : null
}
