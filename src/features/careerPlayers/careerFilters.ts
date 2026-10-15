import type { PlayerFilters } from '../../api/endpoints'
import type { CareerPlayerFacets, FeasibilityBucket } from '../../api/types'
import { POSITIONS } from '../../lib/format'
import { CATALOG_PAGE_SIZE } from '../catalog/catalogChunks'

export const BUCKETS: { id: FeasibilityBucket; label: string; tone: 'good' | 'warn' | 'bad' }[] = [
  { id: 'ALINABILIR', label: 'Alınabilir', tone: 'good' },
  { id: 'ZOR', label: 'Zor', tone: 'warn' },
  { id: 'HAYAL', label: 'Hayal', tone: 'bad' },
]
/** Sözleşme süzgeci: oyun tarihinden itibaren bu kadar ay içinde bitenler (E3-10b). */
export const CONTRACT_MONTHS = 6
export const CAREER_SORTS = ['overall', 'potential', 'age', 'value', 'name', 'club', 'position', 'role'] as const
export type CareerSort = (typeof CAREER_SORTS)[number]
export const TEXT_SORTS: CareerSort[] = ['name', 'club', 'position']

export interface CareerListFilters {
  q: string
  pos: string[]
  /** 0 erkek (varsayılan, eski oyuncu araması gibi), 1 kadın: havuzda iki futbol da var. */
  gender: 0 | 1
  /** Eski kariyer aramasından korunanlar: lig, uyruk, ayak, kayıttaki takım, serbest oyuncu (takımla birlikte olmaz). */
  league?: number
  nat?: number
  foot?: string
  team?: number
  freeAgent: boolean
  ovrMin?: number
  ovrMax?: number
  potMin?: number
  potMax?: number
  ageMin?: number
  ageMax?: number
  valueMin?: number
  valueMax?: number
  /** Değer ≤ kariyer bütçesi; bütçe kayıtta yoksa pasif. */
  budget: boolean
  contract: boolean
  loan: boolean
  buckets: FeasibilityBucket[]
  /** Rol uyumu: seçilen rol için sunucu FitEngineV3 ile sıralar (sort=role). */
  role?: string
  sort: CareerSort
  order: 'asc' | 'desc'
  view: 'grid' | 'table'
}

export const DEFAULT_CAREER_FILTERS: CareerListFilters = { q: '', pos: [], gender: 0, freeAgent: false, budget: false, contract: false, loan: false, buckets: [], sort: 'overall', order: 'desc', view: 'grid' }

const MAX_VALUE = 2_000_000_000
const int = (value: string | null, min: number, max: number): number | undefined => {
  if (value === null || !/^\d+$/.test(value)) {
    return undefined
  }
  const n = Number(value)
  return n >= min && n <= max ? n : undefined
}
const ROLE_ID = /^[a-z0-9_]{1,64}$/

/** Süzgeçler adres çubuğunda (paylaşılabilir; kart veritabanıyla aynı Türkçe anahtarlar). Varsayılanlar yazılmaz. */
export function careerFiltersToParams(f: CareerListFilters): URLSearchParams {
  const p = new URLSearchParams()
  const set = (key: string, value: string | number | undefined) => value !== undefined && value !== '' && p.set(key, String(value))
  set('ara', f.q)
  f.pos.forEach((pos) => p.append('mevki', pos))
  if (f.gender !== DEFAULT_CAREER_FILTERS.gender) set('cins', f.gender)
  set('lig', f.league)
  set('uyruk', f.nat)
  set('ayak', f.foot)
  set('takim', f.team)
  if (f.freeAgent) set('serbest', 1)
  set('ovrmin', f.ovrMin)
  set('ovrmax', f.ovrMax)
  set('potmin', f.potMin)
  set('potmax', f.potMax)
  set('yasmin', f.ageMin)
  set('yasmax', f.ageMax)
  set('degermin', f.valueMin)
  set('degermax', f.valueMax)
  if (f.budget) set('butce', 1)
  if (f.contract) set('sozlesme', 1)
  if (f.loan) set('kiralik', 1)
  f.buckets.forEach((b) => p.append('kova', b))
  set('rol', f.role)
  if (f.sort !== DEFAULT_CAREER_FILTERS.sort) set('sirala', f.sort)
  if (f.order !== DEFAULT_CAREER_FILTERS.order) set('yon', f.order)
  if (f.view !== DEFAULT_CAREER_FILTERS.view) set('gorunum', f.view)
  return p
}

export function careerFiltersFromParams(p: URLSearchParams): CareerListFilters {
  const rawRole = p.get('rol')
  const role = rawRole !== null && ROLE_ID.test(rawRole) ? rawRole : undefined
  const sort = p.get('sirala') as CareerSort | null
  const validSort = sort !== null && CAREER_SORTS.includes(sort) && (sort !== 'role' || role !== undefined) ? sort : DEFAULT_CAREER_FILTERS.sort
  const ids = BUCKETS.map((b) => b.id)
  return {
    q: p.get('ara') ?? '',
    pos: p.getAll('mevki').filter((x) => POSITIONS.includes(x)),
    gender: p.get('cins') === '1' ? 1 : 0,
    league: int(p.get('lig'), 1, 99999),
    nat: int(p.get('uyruk'), 1, 99999),
    foot: p.get('ayak') === 'Left' || p.get('ayak') === 'Right' ? (p.get('ayak') as string) : undefined,
    team: int(p.get('takim'), 1, 9_999_999),
    freeAgent: p.get('serbest') === '1',
    ovrMin: int(p.get('ovrmin'), 1, 99),
    ovrMax: int(p.get('ovrmax'), 1, 99),
    potMin: int(p.get('potmin'), 1, 99),
    potMax: int(p.get('potmax'), 1, 99),
    ageMin: int(p.get('yasmin'), 14, 50),
    ageMax: int(p.get('yasmax'), 14, 50),
    valueMin: int(p.get('degermin'), 0, MAX_VALUE),
    valueMax: int(p.get('degermax'), 0, MAX_VALUE),
    budget: p.get('butce') === '1',
    contract: p.get('sozlesme') === '1',
    loan: p.get('kiralik') === '1',
    buckets: p.getAll('kova').filter((b): b is FeasibilityBucket => ids.includes(b as FeasibilityBucket)),
    role,
    sort: validSort,
    order: p.get('yon') === 'asc' ? 'asc' : 'desc',
    view: p.get('gorunum') === 'table' ? 'table' : 'grid',
  }
}

/** Bütçe kayıtta var mı (yoksa alan gelmez; 0'a çevrilmez, ENG-02). */
export const budgetKnown = (facets?: CareerPlayerFacets): facets is CareerPlayerFacets & { budgetEur: number } => facets?.budgetEur !== undefined && facets.budgetEur !== null
/** Sözleşme süzgeci yalnız sözleşme verisi ve oyun tarihi varken anlamlı (ENG-04). */
export const contractFilterAvailable = (facets?: CareerPlayerFacets) => Boolean(facets?.contractData && facets.gameDate)

export function toCareerQuery(f: CareerListFilters, careerId: number, facets: CareerPlayerFacets | undefined, page: number): PlayerFilters {
  const budgetCap = f.budget && budgetKnown(facets) ? facets.budgetEur : undefined
  const valueMax = budgetCap === undefined ? f.valueMax : Math.min(budgetCap, f.valueMax ?? budgetCap)
  const roleSort = f.sort === 'role' && f.role !== undefined
  return {
    career: careerId,
    q: f.q || undefined,
    pos: f.pos.length > 0 ? f.pos : undefined,
    gender: f.gender,
    league: f.league,
    nat: f.nat,
    foot: f.foot,
    team: f.freeAgent ? undefined : f.team,
    free_agent: f.freeAgent ? true : undefined,
    ovr_min: f.ovrMin,
    ovr_max: f.ovrMax,
    pot_min: f.potMin,
    pot_max: f.potMax,
    age_min: f.ageMin,
    age_max: f.ageMax,
    value_min: f.valueMin,
    value_max: valueMax,
    contract_months: f.contract && contractFilterAvailable(facets) ? CONTRACT_MONTHS : undefined,
    on_loan: f.loan && facets?.loanData ? true : undefined,
    bucket: f.buckets.length > 0 ? f.buckets : undefined,
    role: roleSort ? f.role : undefined,
    sort: roleSort ? 'role' : f.sort === 'role' ? DEFAULT_CAREER_FILTERS.sort : f.sort,
    order: roleSort ? undefined : f.order,
    page,
    size: CATALOG_PAGE_SIZE,
  }
}

/** "Filtreler (n)" rozeti: arama, görünüm, sıralama ve rol sayılmaz. */
export function activeCareerFilterCount(f: CareerListFilters): number {
  return [f.pos.length > 0, f.gender !== DEFAULT_CAREER_FILTERS.gender, f.league, f.nat, f.foot, f.team, f.freeAgent || undefined, f.ovrMin, f.ovrMax, f.potMin, f.potMax, f.ageMin, f.ageMax, f.valueMin, f.valueMax].filter((x) => x !== undefined && x !== false).length
    + [f.budget, f.contract, f.loan, f.buckets.length > 0].filter(Boolean).length
}
