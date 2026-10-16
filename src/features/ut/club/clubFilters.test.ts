import { describe, expect, it } from 'vitest'
import type { UtCard } from '../../../lib/utCard'
import { applyClubFilters, clubFacets, clubFiltersFromParams, clubFiltersToParams, CLUB_DEFAULTS } from './clubFilters'

const card = (key: string, rating: number, patch: Partial<UtCard> = {}): UtCard => ({ key, source: 'club', name: `Oyuncu ${key}`, rating, positions: ['ST'], ...patch })
const CARDS = [
  card('a', 84, { positions: ['ST', 'CF'], league: 'Premier League', nationality: 'England', club: 'Arsenal', rarity: 'Gold Rare', untradeable: true }),
  card('b', 78, { positions: ['CB'], league: 'LALIGA', nationality: 'Spain', club: 'Betis', rarity: 'Gold', duplicate: true, pile: 'storage' }),
  card('c', 91, { positions: ['CM'], league: 'Premier League', nationality: 'Belgium', club: 'Arsenal', rarity: 'TOTW', rarityId: 3, price: 90000 }),
  card('d', 65, { positions: ['ST'], league: 'Ligue 1', nationality: 'France', club: 'Lyon', rarity: 'Silver', price: 200 }),
]

/** V3-07c: /ut/club süzgeçleri adreste; uygulama ve sıralama tek yerde. */
describe('clubFilters', () => {
  it('adres ↔ süzgeç: varsayılanlar yazılmaz, gidiş-dönüş aynı', () => {
    const params = new URLSearchParams('mevki=ST,CB&min=80&max=90&nadirlik=Gold%20Rare&lig=Premier%20League&ulke=England&kulup=Arsenal&takas=hayir&kopya=evet&yigin=storage&sirala=name&gorunum=table&q=oyu')
    const f = clubFiltersFromParams(params)
    expect(f).toMatchObject({ pos: ['ST', 'CB'], ratingMin: 80, ratingMax: 90, rarity: 'Gold Rare', league: 'Premier League', nation: 'England', club: 'Arsenal', untradeable: 'no', duplicate: 'yes', pile: 'storage', sort: 'name', view: 'table', q: 'oyu' })
    expect(clubFiltersFromParams(clubFiltersToParams(f))).toEqual(f)
    expect(clubFiltersToParams(CLUB_DEFAULTS).toString()).toBe('')
  })

  it('uygulama: mevki (alternatif dahil), rating aralığı, lig/ülke/kulüp, takas edilemez, kopya, yığın, ad', () => {
    const keys = (patch: Partial<typeof CLUB_DEFAULTS>) => applyClubFilters(CARDS, { ...CLUB_DEFAULTS, ...patch }).map((c) => c.key)
    expect(keys({ pos: ['CF'] })).toEqual(['a'])
    expect(keys({ ratingMin: 80, ratingMax: 88 })).toEqual(['a'])
    expect(keys({ league: 'Premier League' })).toEqual(['c', 'a'])
    expect(keys({ nation: 'Spain' })).toEqual(['b'])
    expect(keys({ club: 'Arsenal', untradeable: 'yes' })).toEqual(['a'])
    expect(keys({ duplicate: 'yes' })).toEqual(['b'])
    expect(keys({ pile: 'storage' })).toEqual(['b'])
    expect(keys({ pile: 'club' })).toEqual(['c', 'a', 'd'])
    expect(keys({ q: 'oyuncu d' })).toEqual(['d'])
  })

  it('sıralama: reyting (varsayılan, azalan), ad, değer (değer vekili), SBC yemi önce', () => {
    const sorted = (sort: string) => applyClubFilters(CARDS, { ...CLUB_DEFAULTS, sort: sort as never }).map((c) => c.key)
    expect(sorted('rating')).toEqual(['c', 'a', 'b', 'd'])
    expect(sorted('name')).toEqual(['a', 'b', 'c', 'd'])
    expect(sorted('value')[0]).toBe('c')
    // Yem önce (kendi içinde reyting artan: en ucuz önce); a (84, takas edilemez) de değer vekiliyle eşik altında. Özel c en sonda.
    expect(sorted('fodder')).toEqual(['d', 'b', 'a', 'c'])
  })

  it('yüzler: kartlardaki lig, ülke, kulüp ve nadirlik değerleri (alfabetik, tekil)', () => {
    expect(clubFacets(CARDS)).toEqual({
      leagues: ['LALIGA', 'Ligue 1', 'Premier League'],
      nations: ['Belgium', 'England', 'France', 'Spain'],
      clubs: ['Arsenal', 'Betis', 'Lyon'],
      rarities: ['Gold', 'Gold Rare', 'Silver', 'TOTW'],
    })
  })
})
