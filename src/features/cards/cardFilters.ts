import type { PlayerFilters } from '../../api/endpoints'
import { POSITIONS } from '../../lib/format'
import { CATALOG_PAGE_SIZE } from '../catalog/catalogChunks'

export const CARD_PAGE_SIZE = CATALOG_PAGE_SIZE
export const CARD_SORTS = ['overall', 'name', 'age', 'weakfoot', 'skillmoves', 'club', 'league', 'position'] as const
export type CardSort = (typeof CARD_SORTS)[number]

export interface CardFilters {
  q: string
  pos: string[]
  /** 0 erkek (varsayılan), 1 kadın. */
  gender: 0 | 1
  league?: number
  nat?: number
  ovrMin?: number
  ovrMax?: number
  /** Zayıf ayak en az (1-5) / hareket en az (1-5). */
  wfMin?: number
  smMin?: number
  foot?: string
  sort: CardSort
  order: 'asc' | 'desc'
  view: 'grid' | 'table'
}

export const DEFAULT_CARD_FILTERS: CardFilters = { q: '', pos: [], gender: 0, sort: 'overall', order: 'desc', view: 'grid' }

const int = (value: string | null, min: number, max: number): number | undefined => {
  if (value === null || !/^\d+$/.test(value)) {
    return undefined
  }
  const n = Number(value)
  return n >= min && n <= max ? n : undefined
}

/** Süzgeçler adres çubuğunda durur (paylaşılabilir). Varsayılan değerler yazılmaz. */
export function filtersToParams(f: CardFilters): URLSearchParams {
  const p = new URLSearchParams()
  const set = (key: string, value: string | number | undefined) => value !== undefined && value !== '' && p.set(key, String(value))
  set('ara', f.q)
  f.pos.forEach((pos) => p.append('mevki', pos))
  if (f.gender !== DEFAULT_CARD_FILTERS.gender) set('cins', f.gender)
  set('lig', f.league)
  set('uyruk', f.nat)
  set('ovrmin', f.ovrMin)
  set('ovrmax', f.ovrMax)
  set('zayif', f.wfMin)
  set('hareket', f.smMin)
  set('ayak', f.foot)
  if (f.sort !== DEFAULT_CARD_FILTERS.sort) set('sirala', f.sort)
  if (f.order !== DEFAULT_CARD_FILTERS.order) set('yon', f.order)
  if (f.view !== DEFAULT_CARD_FILTERS.view) set('gorunum', f.view)
  return p
}

export function filtersFromParams(p: URLSearchParams): CardFilters {
  const sort = p.get('sirala')
  const foot = p.get('ayak')
  return {
    q: p.get('ara') ?? '',
    pos: p.getAll('mevki').filter((x) => POSITIONS.includes(x)),
    gender: p.get('cins') === '1' ? 1 : 0,
    league: int(p.get('lig'), 1, 99999),
    nat: int(p.get('uyruk'), 1, 99999),
    ovrMin: int(p.get('ovrmin'), 1, 99),
    ovrMax: int(p.get('ovrmax'), 1, 99),
    wfMin: int(p.get('zayif'), 1, 5),
    smMin: int(p.get('hareket'), 1, 5),
    foot: foot === 'Left' || foot === 'Right' ? foot : undefined,
    sort: CARD_SORTS.includes(sort as CardSort) ? (sort as CardSort) : DEFAULT_CARD_FILTERS.sort,
    order: p.get('yon') === 'asc' ? 'asc' : 'desc',
    view: p.get('gorunum') === 'table' ? 'table' : 'grid',
  }
}

export function toPlayerQuery(f: CardFilters, page: number): PlayerFilters {
  return {
    q: f.q || undefined,
    pos: f.pos.length > 0 ? f.pos : undefined,
    gender: f.gender,
    league: f.league,
    nat: f.nat,
    ovr_min: f.ovrMin,
    ovr_max: f.ovrMax,
    wf_min: f.wfMin,
    sm_min: f.smMin,
    foot: f.foot,
    sort: f.sort,
    order: f.order,
    page,
    size: CARD_PAGE_SIZE,
  }
}

/** "Filtreler (n)" rozeti: arama, görünüm ve sıralama sayılmaz; varsayılan cinsiyet (erkek) sayılmaz. */
export function activeFilterCount(f: CardFilters): number {
  return [f.pos.length > 0, f.gender !== DEFAULT_CARD_FILTERS.gender, f.league !== undefined, f.nat !== undefined, f.ovrMin !== undefined, f.ovrMax !== undefined, f.wfMin !== undefined, f.smMin !== undefined, f.foot !== undefined].filter(Boolean).length
}
