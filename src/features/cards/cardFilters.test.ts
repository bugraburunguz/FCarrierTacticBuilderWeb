import { describe, expect, it } from 'vitest'
import { activeFilterCount, DEFAULT_CARD_FILTERS, filtersFromParams, filtersToParams, toPlayerQuery } from './cardFilters'

describe('kart veritabanı süzgeçleri', () => {
  it('varsayılan süzgeç adres çubuğunu boş bırakır ve boş adresten varsayılan döner', () => {
    expect(filtersToParams(DEFAULT_CARD_FILTERS).toString()).toBe('')
    expect(filtersFromParams(new URLSearchParams())).toEqual(DEFAULT_CARD_FILTERS)
  })

  it('tüm alanlar adres çubuğuna gidip aynen geri okunur', () => {
    const f = { ...DEFAULT_CARD_FILTERS, q: 'mbappe', pos: ['ST', 'LW'], gender: 1 as const, league: 13, nat: 18, ovrMin: 80, ovrMax: 94, wfMin: 4, smMin: 5, foot: 'Left', sort: 'age' as const, order: 'asc' as const, view: 'table' as const }
    expect(filtersFromParams(filtersToParams(f))).toEqual(f)
  })

  it('geçersiz değerler yok sayılır', () => {
    const f = filtersFromParams(new URLSearchParams('mevki=XX&cins=7&ovrmin=abc&zayif=9&gorunum=x&yon=up&lig=-1&sirala=bilinmeyen'))
    expect(f).toEqual(DEFAULT_CARD_FILTERS)
  })

  it('sunucu sorgusuna çevrilir: mevkiler, aralıklar, sıralama, sayfa', () => {
    const q = toPlayerQuery({ ...DEFAULT_CARD_FILTERS, q: 'x', pos: ['CB'], ovrMin: 85, wfMin: 4, smMin: 3, league: 13 }, 2)
    expect(q).toMatchObject({ q: 'x', pos: ['CB'], ovr_min: 85, wf_min: 4, sm_min: 3, league: 13, gender: 0, sort: 'overall', order: 'desc', page: 2, size: 48 })
  })

  it('etkin süzgeç sayısı (arama ve görünüm hariç; varsayılan cinsiyet sayılmaz)', () => {
    expect(activeFilterCount(DEFAULT_CARD_FILTERS)).toBe(0)
    expect(activeFilterCount({ ...DEFAULT_CARD_FILTERS, q: 'a', view: 'table', pos: ['ST'], ovrMin: 80, gender: 1 })).toBe(3)
  })
})
