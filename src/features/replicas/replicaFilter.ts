import type { ReplicaApproach, ReplicaBuildUp, ReplicaCategory, ReplicaSummary } from '../../api/types'
import { APPROACH_LABEL, BUILD_UP_LABEL, CATEGORY_ORDER, FAMILY_ORDER, LEAGUE_TABS, type FormationFamily, type LeagueTab } from './labels'

/**
 * Replika süzgeci (REP-d): lig sekmesi + çoklu seçimli çip grupları (aynı grupta "ya da", gruplar arası "ve") + formasyon/dönem/arama.
 * Hepsi adres çubuğunda durur.
 */
export interface ReplicaFilters {
  league: LeagueTab
  categories: ReplicaCategory[]
  families: FormationFamily[]
  buildUps: ReplicaBuildUp[]
  approaches: ReplicaApproach[]
  verified: boolean
  formation: string
  /** Dönem: sezonun başlangıç yılı aralığı (uçlar dahil). */
  from?: number
  to?: number
  query: string
}

export const DEFAULT_FILTERS: ReplicaFilters = { league: 'ALL', categories: [], families: [], buildUps: [], approaches: [], verified: false, formation: '', query: '' }

/** "Kadroma uyanlar": bir görünümde en çok bu kadar replikanın uyumu hesaplanır (tek /fit/lineup isteği / replika). */
export const FIT_LIMIT = 12

/** "1999-00" → 1999; sezon biçimi tanınmazsa undefined. */
export function startYear(season: string): number | undefined {
  const match = /^(\d{4})/.exec(season)
  return match ? Number(match[1]) : undefined
}

/** Türkçe/aksanlı harfler ve büyük-küçük harf farkı olmadan karşılaştırma. */
export function normalizeText(text: string): string {
  return text
    .replace(/İ/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/g, 'o')
    .replace(/ł/g, 'l')
}

export function formationFamily(eaFormation: string): FormationFamily | undefined {
  const first = eaFormation.charAt(0)
  return (FAMILY_ORDER as string[]).includes(first) ? (first as FormationFamily) : undefined
}

export function leagueTabOf(r: Pick<ReplicaSummary, 'league'>): Exclude<LeagueTab, 'ALL'> {
  return (LEAGUE_TABS as string[]).includes(r.league) ? (r.league as Exclude<LeagueTab, 'ALL'>) : 'OTHER'
}

/** Lig sekmesi dışındaki süzgeçler (sekme sayıları bunlara uyar). */
function matchesExceptLeague(r: ReplicaSummary, f: ReplicaFilters, query: string): boolean {
  if (f.categories.length > 0 && !f.categories.includes(r.category)) {
    return false
  }
  const family = formationFamily(r.eaFormation)
  if (f.families.length > 0 && (family === undefined || !f.families.includes(family))) {
    return false
  }
  if (f.buildUps.length > 0 && !f.buildUps.includes(r.buildUp)) {
    return false
  }
  if (f.approaches.length > 0 && !f.approaches.includes(r.defensiveApproach)) {
    return false
  }
  if (f.verified && !r.verified) {
    return false
  }
  if (f.formation !== '' && r.eaFormation !== f.formation) {
    return false
  }
  const year = startYear(r.season)
  if ((f.from !== undefined && (year === undefined || year < f.from)) || (f.to !== undefined && (year === undefined || year > f.to))) {
    return false
  }
  return query === '' || normalizeText(`${r.club} ${r.coach} ${r.season}`).includes(query)
}

export function filterReplicas(list: ReplicaSummary[], f: ReplicaFilters): ReplicaSummary[] {
  const query = normalizeText(f.query.trim())
  return list.filter((r) => (f.league === 'ALL' || leagueTabOf(r) === f.league) && matchesExceptLeague(r, f, query))
}

/** Sekme sayıları: seçili sekmeden bağımsız, diğer süzgeçlere uyan kayıtlar. */
export function leagueCounts(list: ReplicaSummary[], f: ReplicaFilters): Record<LeagueTab, number> {
  const query = normalizeText(f.query.trim())
  const counts = Object.fromEntries(LEAGUE_TABS.map((t) => [t, 0])) as Record<LeagueTab, number>
  list.forEach((r) => {
    if (matchesExceptLeague(r, f, query)) {
      counts.ALL++
      counts[leagueTabOf(r)]++
    }
  })
  return counts
}

/** Kulüp adına (A→Z), eşitte sezona göre (yeniden eskiye). */
export function sortByClubSeason(list: ReplicaSummary[]): ReplicaSummary[] {
  return [...list].sort((a, b) => a.club.localeCompare(b.club, 'tr') || (startYear(b.season) ?? 0) - (startYear(a.season) ?? 0))
}

export interface LeagueGroup {
  tab: Exclude<LeagueTab, 'ALL'>
  items: ReplicaSummary[]
}

/** "Tümü" görünümü: sekme sırasıyla lig grupları (boş grup yok), grup içi kulüp + sezon. */
export function groupByLeague(list: ReplicaSummary[]): LeagueGroup[] {
  const sorted = sortByClubSeason(list)
  return LEAGUE_TABS.filter((t): t is Exclude<LeagueTab, 'ALL'> => t !== 'ALL')
    .map((tab) => ({ tab, items: sorted.filter((r) => leagueTabOf(r) === tab) }))
    .filter((g) => g.items.length > 0)
}

/** "Kadroma uyanlar": uyumu hesaplananlar yüzdeye göre önde (yüksekten düşüğe), kalanlar mevcut sırasını korur. */
export function rankByFit(list: ReplicaSummary[], fits: Map<string, number>): ReplicaSummary[] {
  const scored = list.filter((r) => fits.has(r.id)).sort((a, b) => fits.get(b.id)! - fits.get(a.id)!)
  return [...scored, ...list.filter((r) => !fits.has(r.id))]
}

const KEYS = {
  league: 'lig', category: 'kategori', family: 'aile', buildUp: 'build', approach: 'savunma', verified: 'dogrulandi',
  formation: 'formasyon', from: 'dan', to: 'a', query: 'ara',
} as const
/** "Kadroma uyanlar" anahtarı (süzgeç değil, sıralama; ReplicasPage yönetir). */
export const FIT_KEY = 'uyum'
/** Süzgecin adres anahtarları (gömülü kullanımda diğer parametreler korunur, FAZ 4b). */
export const FILTER_KEYS: readonly string[] = [...Object.values(KEYS), FIT_KEY]

const LEAGUE_SLUG: Record<Exclude<LeagueTab, 'ALL'>, string> = {
  TR_SUPER_LIG: 'super-lig', EN_PREMIER_LEAGUE: 'premier-league', ES_LALIGA: 'laliga', IT_SERIE_A: 'serie-a', DE_BUNDESLIGA: 'bundesliga', FR_LIGUE_1: 'ligue-1', OTHER: 'diger',
}

/** Süzgeçler adres çubuğunda durur (paylaşılabilir "filtreli liste"). Çoklu değerler virgülle. */
export function filtersToParams(f: ReplicaFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (f.league !== 'ALL') {
    params.set(KEYS.league, LEAGUE_SLUG[f.league])
  }
  const lists: [string, string[]][] = [[KEYS.category, f.categories], [KEYS.family, f.families], [KEYS.buildUp, f.buildUps], [KEYS.approach, f.approaches]]
  lists.forEach(([key, values]) => {
    if (values.length > 0) {
      params.set(key, values.join(','))
    }
  })
  if (f.verified) {
    params.set(KEYS.verified, '1')
  }
  if (f.formation !== '') {
    params.set(KEYS.formation, f.formation)
  }
  if (f.from !== undefined) {
    params.set(KEYS.from, String(f.from))
  }
  if (f.to !== undefined) {
    params.set(KEYS.to, String(f.to))
  }
  if (f.query !== '') {
    params.set(KEYS.query, f.query)
  }
  return params
}

const year = (value: string | null): number | undefined => (value !== null && /^\d{4}$/.test(value) ? Number(value) : undefined)

/** Virgüllü listeden yalnız geçerli değerler (sıra korunur, tekrar yok). Eski tekli `kategori=X` de okunur. */
function listParam<T extends string>(value: string | null, valid: readonly string[]): T[] {
  return [...new Set((value ?? '').split(','))].filter((v) => valid.includes(v)) as T[]
}

export function filtersFromParams(params: URLSearchParams): ReplicaFilters {
  const slug = params.get(KEYS.league)
  const league = (Object.keys(LEAGUE_SLUG) as Exclude<LeagueTab, 'ALL'>[]).find((t) => LEAGUE_SLUG[t] === slug) ?? 'ALL'
  return {
    league,
    categories: listParam<ReplicaCategory>(params.get(KEYS.category), CATEGORY_ORDER),
    families: listParam<FormationFamily>(params.get(KEYS.family), FAMILY_ORDER),
    buildUps: listParam<ReplicaBuildUp>(params.get(KEYS.buildUp), Object.keys(BUILD_UP_LABEL)),
    approaches: listParam<ReplicaApproach>(params.get(KEYS.approach), Object.keys(APPROACH_LABEL)),
    verified: params.get(KEYS.verified) === '1',
    formation: params.get(KEYS.formation) ?? '',
    from: year(params.get(KEYS.from)),
    to: year(params.get(KEYS.to)),
    query: params.get(KEYS.query) ?? '',
  }
}

/** Çoklu seçimli çip: değer listedeyse çıkar, değilse ekle. */
export function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
}
