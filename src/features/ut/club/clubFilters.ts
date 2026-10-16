import { POSITIONS } from '../../../lib/format'
import type { UtCard } from '../../../lib/utCard'
import { sbcFodder, valueProxy } from '../../sbc/solve/candidates'

export type ClubSort = 'rating' | 'name' | 'value' | 'fodder'
export type TriState = 'any' | 'yes' | 'no'
export type ClubPile = 'all' | 'club' | 'storage'

export interface ClubFilters {
  q: string
  pos: string[]
  ratingMin?: number
  ratingMax?: number
  rarity?: string
  league?: string
  nation?: string
  club?: string
  untradeable: TriState
  duplicate: TriState
  pile: ClubPile
  sort: ClubSort
  view: 'grid' | 'table'
}

export const CLUB_DEFAULTS: ClubFilters = { q: '', pos: [], untradeable: 'any', duplicate: 'any', pile: 'all', sort: 'rating', view: 'grid' }

const SORTS: ClubSort[] = ['rating', 'name', 'value', 'fodder']
const TRI: Record<string, TriState> = { evet: 'yes', hayir: 'no' }
const TRI_PARAM: Record<TriState, string | undefined> = { any: undefined, yes: 'evet', no: 'hayir' }
const num = (v: string | null) => (v !== null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : undefined)

/** Adres → süzgeç (V3-07c). Bilinmeyen değerler varsayılana düşer. */
export function clubFiltersFromParams(params: URLSearchParams): ClubFilters {
  const pile = params.get('yigin')
  return {
    q: params.get('q') ?? '',
    pos: (params.get('mevki') ?? '').split(',').filter((p) => POSITIONS.includes(p)),
    ratingMin: num(params.get('min')),
    ratingMax: num(params.get('max')),
    rarity: params.get('nadirlik') ?? undefined,
    league: params.get('lig') ?? undefined,
    nation: params.get('ulke') ?? undefined,
    club: params.get('kulup') ?? undefined,
    untradeable: TRI[params.get('takas') ?? ''] ?? 'any',
    duplicate: TRI[params.get('kopya') ?? ''] ?? 'any',
    pile: pile === 'club' || pile === 'storage' ? pile : 'all',
    sort: SORTS.includes(params.get('sirala') as ClubSort) ? (params.get('sirala') as ClubSort) : 'rating',
    view: params.get('gorunum') === 'table' ? 'table' : 'grid',
  }
}

/** Süzgeç → adres; varsayılanlar yazılmaz. ("takas" = takas edilemez: evet / hayır.) */
export function clubFiltersToParams(f: ClubFilters): URLSearchParams {
  const entries: [string, string | undefined][] = [
    ['q', f.q || undefined],
    ['mevki', f.pos.length ? f.pos.join(',') : undefined],
    ['min', f.ratingMin?.toString()],
    ['max', f.ratingMax?.toString()],
    ['nadirlik', f.rarity],
    ['lig', f.league],
    ['ulke', f.nation],
    ['kulup', f.club],
    ['takas', TRI_PARAM[f.untradeable]],
    ['kopya', TRI_PARAM[f.duplicate]],
    ['yigin', f.pile === 'all' ? undefined : f.pile],
    ['sirala', f.sort === 'rating' ? undefined : f.sort],
    ['gorunum', f.view === 'grid' ? undefined : f.view],
  ]
  return new URLSearchParams(entries.filter((e): e is [string, string] => e[1] !== undefined))
}

const tri = (state: TriState, value: boolean | undefined) => state === 'any' || (state === 'yes') === Boolean(value)
const cardValue = (c: UtCard) => valueProxy({ rating: c.rating, knownPrice: c.price, untradeable: c.untradeable })

/** Süzgeçleri uygular ve sıralar (eşitlikte ad). Mevki kartın oynayabildiği tüm mevkilerle eşleşir. */
export function applyClubFilters(cards: UtCard[], f: ClubFilters): UtCard[] {
  const needle = f.q.trim().toLocaleLowerCase('tr')
  const rows = cards.filter((c) =>
    (!needle || c.name.toLocaleLowerCase('tr').includes(needle))
    && (f.pos.length === 0 || c.positions.some((p) => f.pos.includes(p)))
    && (f.ratingMin === undefined || c.rating >= f.ratingMin)
    && (f.ratingMax === undefined || c.rating <= f.ratingMax)
    && (!f.rarity || c.rarity === f.rarity)
    && (!f.league || c.league === f.league)
    && (!f.nation || c.nationality === f.nation)
    && (!f.club || c.club === f.club)
    && tri(f.untradeable, c.untradeable)
    && tri(f.duplicate, c.duplicate)
    && (f.pile === 'all' || (f.pile === 'storage' ? c.pile === 'storage' : c.pile !== 'storage')))
  const byName = (a: UtCard, b: UtCard) => a.name.localeCompare(b.name, 'tr')
  const compare: Record<ClubSort, (a: UtCard, b: UtCard) => number> = {
    rating: (a, b) => b.rating - a.rating || byName(a, b),
    name: byName,
    value: (a, b) => cardValue(b) - cardValue(a) || byName(a, b),
    fodder: (a, b) => Number(Boolean(sbcFodder(b))) - Number(Boolean(sbcFodder(a))) || a.rating - b.rating || byName(a, b),
  }
  return [...rows].sort(compare[f.sort])
}

const uniq = (values: (string | undefined)[]) => [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, 'tr'))

/** Süzgeç seçenekleri: kulüp kartlarında geçen lig, ülke, kulüp ve nadirlik değerleri. */
export function clubFacets(cards: UtCard[]) {
  return { leagues: uniq(cards.map((c) => c.league)), nations: uniq(cards.map((c) => c.nationality)), clubs: uniq(cards.map((c) => c.club)), rarities: uniq(cards.map((c) => c.rarity)) }
}
