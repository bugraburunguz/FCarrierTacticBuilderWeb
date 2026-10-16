import { describe, expect, it } from 'vitest'
import type { ReplicaSummary } from '../../api/types'
import { DEFAULT_FILTERS, filterReplicas, filtersFromParams, filtersToParams, sortReplicas, startYear } from './replicaFilter'

const make = (over: Partial<ReplicaSummary>): ReplicaSummary => ({
  id: 'x', category: 'UCL_WINNER', club: 'FC Barcelona', coach: 'Pep Guardiola', season: '2010-11', formationId: '4-3-3 (2)', eaFormation: '4-3-3 (2)', buildUp: 'SHORT_PASSING', defensiveApproach: 'HIGH', lineHeight: 70, fidelity: 4,
  tacticCode: 'AAAAAAAAAAAA', slots: [], eaOrderedSlots: [], attentionCount: 0, ...over,
})

const LIST = [
  make({ id: 'a', club: 'Beşiktaş', coach: 'Şenol Güneş', season: '2016-17', category: 'TURKISH_BIG4', eaFormation: '4-2-3-1 (2)', buildUp: 'BALANCED' }),
  make({ id: 'b', club: 'AC Milan', coach: 'Arrigo Sacchi', season: '1988-89', category: 'LEGENDARY_COACH', eaFormation: '4-4-2', buildUp: 'BALANCED' }),
  make({ id: 'c', club: 'Ajax', coach: 'Louis van Gaal', season: '1994-95', category: 'LEGENDARY_COACH', eaFormation: '4-3-3 (2)', buildUp: 'SHORT_PASSING' }),
  make({ id: 'd', club: 'Leicester City', coach: 'Claudio Ranieri', season: '2015-16', category: 'UCL_WINNER', eaFormation: '4-4-2', buildUp: 'COUNTER' }),
]

describe('replika filtreleri', () => {
  it('sezonun başlangıç yılını okur', () => {
    expect(startYear('1999-00')).toBe(1999)
    expect(startYear('2010-11')).toBe(2010)
    expect(startYear('1971-73')).toBe(1971)
    expect(startYear('belirsiz')).toBeUndefined()
  })

  it('varsayılan filtre hepsini döner', () => {
    expect(filterReplicas(LIST, DEFAULT_FILTERS)).toHaveLength(4)
  })

  it('kategori, formasyon ve build-up birlikte uygulanır', () => {
    expect(filterReplicas(LIST, { ...DEFAULT_FILTERS, category: 'LEGENDARY_COACH' }).map((r) => r.id)).toEqual(['b', 'c'])
    expect(filterReplicas(LIST, { ...DEFAULT_FILTERS, formation: '4-4-2' }).map((r) => r.id)).toEqual(['b', 'd'])
    expect(filterReplicas(LIST, { ...DEFAULT_FILTERS, formation: '4-4-2', buildUp: 'COUNTER' }).map((r) => r.id)).toEqual(['d'])
  })

  it('dönem yıl aralığıdır (uçlar dahil)', () => {
    expect(filterReplicas(LIST, { ...DEFAULT_FILTERS, from: 1990, to: 2015 }).map((r) => r.id)).toEqual(['c', 'd'])
    expect(filterReplicas(LIST, { ...DEFAULT_FILTERS, from: 2016 }).map((r) => r.id)).toEqual(['a'])
    expect(filterReplicas(LIST, { ...DEFAULT_FILTERS, to: 1988 }).map((r) => r.id)).toEqual(['b'])
  })

  it('arama kulüp, hoca ve sezonda büyük/küçük harf ve aksan duyarsız çalışır', () => {
    expect(filterReplicas(LIST, { ...DEFAULT_FILTERS, query: 'besiktas' }).map((r) => r.id)).toEqual(['a'])
    expect(filterReplicas(LIST, { ...DEFAULT_FILTERS, query: 'SENOL' }).map((r) => r.id)).toEqual(['a'])
    expect(filterReplicas(LIST, { ...DEFAULT_FILTERS, query: '1994' }).map((r) => r.id)).toEqual(['c'])
    expect(filterReplicas(LIST, { ...DEFAULT_FILTERS, query: 'zzz' })).toHaveLength(0)
  })

  it('sıralama yeniden eskiye, eşitte kulüp adı', () => {
    expect(sortReplicas(LIST).map((r) => r.id)).toEqual(['a', 'd', 'c', 'b'])
  })

  it('filtreler adres çubuğuna gidip geri okunur; geçersiz değer yok sayılır', () => {
    const f = { ...DEFAULT_FILTERS, category: 'TURKISH_BIG4' as const, formation: '4-4-2', buildUp: 'COUNTER' as const, from: 1990, to: 2020, query: 'milan' }
    expect(filtersFromParams(filtersToParams(f))).toEqual(f)
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('')
    expect(filtersFromParams(new URLSearchParams('kategori=YOK&dan=abc&build=x'))).toEqual(DEFAULT_FILTERS)
  })
})
