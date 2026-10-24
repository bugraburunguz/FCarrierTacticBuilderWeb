import { describe, expect, it } from 'vitest'
import type { ReplicaSummary } from '../../api/types'
import {
  DEFAULT_FILTERS,
  filterReplicas,
  filtersFromParams,
  filtersToParams,
  formationFamily,
  groupByLeague,
  leagueCounts,
  leagueTabOf,
  rankByFit,
  sortByClubSeason,
  startYear,
} from './replicaFilter'

const make = (over: Partial<ReplicaSummary>): ReplicaSummary => ({
  id: 'x', category: 'UCL_WINNER', club: 'FC Barcelona', coach: 'Pep Guardiola', season: '2010-11', league: 'ES_LALIGA', formationId: '4-3-3 (2)', eaFormation: '4-3-3 (2)', buildUp: 'SHORT_PASSING', defensiveApproach: 'HIGH', lineHeight: 70, fidelity: 4,
  tacticCode: 'AAAAAAAAAAAA', slots: [], eaOrderedSlots: [], attentionCount: 0, verified: false, ...over,
})

const LIST = [
  make({ id: 'a', club: 'Beşiktaş', coach: 'Şenol Güneş', season: '2016-17', league: 'TR_SUPER_LIG', category: 'TURKISH_BIG4', eaFormation: '4-2-3-1 (2)', buildUp: 'BALANCED', defensiveApproach: 'BALANCED', verified: true }),
  make({ id: 'b', club: 'Milan', coach: 'Carlo Ancelotti', season: '2002-03', league: 'IT_SERIE_A', category: 'UCL_WINNER', eaFormation: '4-1-2-1-2 (2)', buildUp: 'BALANCED' }),
  make({ id: 'c', club: 'Ajax', coach: 'Erik ten Hag', season: '2018-19', league: 'NL_EREDIVISIE', category: 'LEGENDARY_SQUAD', eaFormation: '4-2-3-1 (2)', buildUp: 'SHORT_PASSING', verified: true }),
  make({ id: 'd', club: 'Leicester City', coach: 'Claudio Ranieri', season: '2015-16', league: 'EN_PREMIER_LEAGUE', category: 'LEGENDARY_SQUAD', eaFormation: '4-4-2', buildUp: 'COUNTER', defensiveApproach: 'DEEP' }),
  make({ id: 'e', club: 'Inter', coach: 'Simone Inzaghi', season: '2022-23', league: 'IT_SERIE_A', category: 'LEGENDARY_SQUAD', eaFormation: '5-3-2', buildUp: 'BALANCED', verified: true }),
  make({ id: 'f', club: 'Chelsea', coach: 'Antonio Conte', season: '2016-17', league: 'EN_PREMIER_LEAGUE', category: 'LEGENDARY_COACH', eaFormation: '3-4-3', buildUp: 'COUNTER', defensiveApproach: 'DEEP' }),
  make({ id: 'g', club: 'Inter', coach: 'Simone Inzaghi', season: '2024-25', league: 'IT_SERIE_A', category: 'LEGENDARY_SQUAD', eaFormation: '5-3-2', buildUp: 'BALANCED' }),
]
const ids = (list: ReplicaSummary[]) => list.map((r) => r.id)

describe('replika filtreleri', () => {
  it('sezonun başlangıç yılını okur', () => {
    expect(startYear('1999-00')).toBe(1999)
    expect(startYear('2010-11')).toBe(2010)
    expect(startYear('belirsiz')).toBeUndefined()
  })

  it('varsayılan filtre hepsini döner', () => {
    expect(filterReplicas(LIST, DEFAULT_FILTERS)).toHaveLength(LIST.length)
  })

  it('aynı grupta çoklu seçim "ya da", gruplar arası "ve" ile birleşir', () => {
    expect(ids(filterReplicas(LIST, { ...DEFAULT_FILTERS, categories: ['UCL_WINNER', 'LEGENDARY_COACH'] }))).toEqual(['b', 'f'])
    expect(ids(filterReplicas(LIST, { ...DEFAULT_FILTERS, buildUps: ['COUNTER'], approaches: ['DEEP'] }))).toEqual(['d', 'f'])
    expect(ids(filterReplicas(LIST, { ...DEFAULT_FILTERS, categories: ['LEGENDARY_SQUAD'], buildUps: ['BALANCED'] }))).toEqual(['e', 'g'])
  })

  it('formasyon ailesi savunmadaki oyuncu sayısıdır (4 / 3 / 5 defans)', () => {
    expect(formationFamily('4-2-3-1 (2)')).toBe('4')
    expect(formationFamily('3-4-2-1')).toBe('3')
    expect(formationFamily('5-2-1-2')).toBe('5')
    expect(ids(filterReplicas(LIST, { ...DEFAULT_FILTERS, families: ['3', '5'] }))).toEqual(['e', 'f', 'g'])
  })

  it('"Doğrulandı" yalnız verified kayıtları bırakır', () => {
    expect(ids(filterReplicas(LIST, { ...DEFAULT_FILTERS, verified: true }))).toEqual(['a', 'c', 'e'])
  })

  it('lig sekmesi: altı büyük lig kendi sekmesinde, gerisi "Diğer"', () => {
    expect(leagueTabOf(LIST[0])).toBe('TR_SUPER_LIG')
    expect(leagueTabOf(LIST[2])).toBe('OTHER')
    expect(leagueTabOf(make({ league: 'AT_BUNDESLIGA' }))).toBe('OTHER')
    expect(ids(filterReplicas(LIST, { ...DEFAULT_FILTERS, league: 'IT_SERIE_A' }))).toEqual(['b', 'e', 'g'])
    expect(ids(filterReplicas(LIST, { ...DEFAULT_FILTERS, league: 'OTHER' }))).toEqual(['c'])
  })

  it('sekme sayıları diğer süzgeçlere uyar, seçili sekmeden bağımsızdır', () => {
    const counts = leagueCounts(LIST, { ...DEFAULT_FILTERS, league: 'TR_SUPER_LIG', families: ['4'] })
    expect(counts).toMatchObject({ ALL: 4, TR_SUPER_LIG: 1, EN_PREMIER_LEAGUE: 1, IT_SERIE_A: 1, ES_LALIGA: 0, OTHER: 1 })
  })

  it('arama kulüp, hoca ve sezonda büyük/küçük harf ve aksan duyarsız çalışır', () => {
    expect(ids(filterReplicas(LIST, { ...DEFAULT_FILTERS, query: 'besiktas' }))).toEqual(['a'])
    expect(ids(filterReplicas(LIST, { ...DEFAULT_FILTERS, query: 'SENOL' }))).toEqual(['a'])
    expect(ids(filterReplicas(LIST, { ...DEFAULT_FILTERS, query: '2015' }))).toEqual(['d'])
  })

  it('dönem yıl aralığıdır (uçlar dahil)', () => {
    expect(ids(filterReplicas(LIST, { ...DEFAULT_FILTERS, from: 2016, to: 2018 }))).toEqual(['a', 'c', 'f'])
  })

  it('sıralama kulüp adına, sonra sezona göre (yeniden eskiye)', () => {
    expect(ids(sortByClubSeason(LIST))).toEqual(['c', 'a', 'f', 'g', 'e', 'd', 'b'])
  })

  it('"Tümü" lige göre gruplanır: sekme sırasıyla, boş grup yok, grup içi kulüp + sezon', () => {
    const groups = groupByLeague(LIST)
    expect(groups.map((g) => [g.tab, ids(g.items)])).toEqual([
      ['TR_SUPER_LIG', ['a']],
      ['EN_PREMIER_LEAGUE', ['f', 'd']],
      ['IT_SERIE_A', ['g', 'e', 'b']],
      ['OTHER', ['c']],
    ])
  })

  it('uyum sıralaması: hesaplananlar yüzdeye göre önde, kalanlar sırasını korur', () => {
    const fits = new Map([['b', 61], ['d', 88], ['a', 74]])
    expect(ids(rankByFit(LIST, fits))).toEqual(['d', 'a', 'b', 'c', 'e', 'f', 'g'])
  })

  it('filtreler adres çubuğuna gidip geri okunur; eski tekli kategori okunur; geçersiz değer yok sayılır', () => {
    const f = { ...DEFAULT_FILTERS, league: 'OTHER' as const, categories: ['TURKISH_BIG4' as const, 'CURRENT' as const], families: ['3' as const], buildUps: ['COUNTER' as const], approaches: ['HIGH' as const], verified: true, formation: '4-4-2', from: 1990, to: 2020, query: 'milan' }
    expect(filtersFromParams(filtersToParams(f))).toEqual(f)
    expect(filtersToParams({ ...DEFAULT_FILTERS, league: 'TR_SUPER_LIG' }).toString()).toBe('lig=super-lig')
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('')
    expect(filtersFromParams(new URLSearchParams('kategori=LEGENDARY_COACH')).categories).toEqual(['LEGENDARY_COACH'])
    expect(filtersFromParams(new URLSearchParams('kategori=YOK&dan=abc&build=x&lig=mars&aile=7&dogrulandi=0'))).toEqual(DEFAULT_FILTERS)
  })
})
