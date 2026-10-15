import { describe, expect, it } from 'vitest'
import { activeCareerFilterCount, ATTR_MIN_KEYS, careerFiltersFromParams, careerFiltersToParams, DEFAULT_CAREER_FILTERS, toCareerQuery, type CareerListFilters } from './careerFilters'

const FULL: CareerListFilters = {
  ...DEFAULT_CAREER_FILTERS,
  q: 'ada',
  pos: ['ST', 'CB'],
  league: 13,
  nat: 18,
  foot: 'Right',
  freeAgent: true,
  ovrMin: 70,
  ovrMax: 85,
  potMin: 80,
  ageMax: 23,
  valueMin: 1_000_000,
  valueMax: 9_000_000,
  budget: true,
  contract: true,
  loan: true,
  buckets: ['ALINABILIR', 'HAYAL'],
  role: 'st_poacher',
  sort: 'role',
  view: 'table',
}

describe('kariyer listesi süzgeçleri', () => {
  it('adres çubuğu gidiş-dönüşü kayıpsız', () => {
    expect(careerFiltersFromParams(careerFiltersToParams(FULL))).toEqual(FULL)
    expect(careerFiltersToParams(DEFAULT_CAREER_FILTERS).toString()).toBe('')
  })

  it('geçersiz değerler varsayılana düşer; rol yoksa rol sıralaması OVR olur', () => {
    const f = careerFiltersFromParams(new URLSearchParams('kova=YOK&kova=ZOR&sirala=role&degermin=abc'))
    expect(f.buckets).toEqual(['ZOR'])
    expect(f.sort).toBe('overall')
    expect(f.valueMin).toBeUndefined()
  })

  it('bütçe biliniyorsa "Bütçeme sığar" value_max olur; bilinmiyorsa süzgeç pasif (0 yazılmaz)', () => {
    const known = toCareerQuery({ ...DEFAULT_CAREER_FILTERS, budget: true }, 4, { budgetEur: 5_000_000, contractData: false, loanData: false }, 0)
    expect(known.value_max).toBe(5_000_000)
    const tighter = toCareerQuery({ ...DEFAULT_CAREER_FILTERS, budget: true, valueMax: 2_000_000 }, 4, { budgetEur: 5_000_000, contractData: false, loanData: false }, 0)
    expect(tighter.value_max).toBe(2_000_000)
    const unknown = toCareerQuery({ ...DEFAULT_CAREER_FILTERS, budget: true }, 4, { contractData: false, loanData: false }, 0)
    expect(unknown.value_max).toBeUndefined()
  })

  it('sözleşme süzgeci yalnız sözleşme verisi ve oyun tarihi varken 6 ay olarak gider', () => {
    const f = { ...DEFAULT_CAREER_FILTERS, contract: true }
    expect(toCareerQuery(f, 4, { gameDate: '2027-01-15', contractData: true, loanData: false }, 0).contract_months).toBe(6)
    expect(toCareerQuery(f, 4, { contractData: true, loanData: false }, 0).contract_months).toBeUndefined()
    expect(toCareerQuery(f, 4, { gameDate: '2027-01-15', contractData: false, loanData: false }, 0).contract_months).toBeUndefined()
  })

  it('rol seçilince sunucu FitEngineV3 ile sıralar: sort=role&role=…', () => {
    const q = toCareerQuery({ ...DEFAULT_CAREER_FILTERS, role: 'cb_stopper', sort: 'role' }, 4, undefined, 1)
    expect(q).toMatchObject({ career: 4, sort: 'role', role: 'cb_stopper', page: 1 })
    expect(q.order).toBeUndefined()
  })

  it('futbol varsayılan erkek (eski sayfa gibi); kadın seçimi adres çubuğunda', () => {
    expect(toCareerQuery(DEFAULT_CAREER_FILTERS, 4, undefined, 0).gender).toBe(0)
    const women = careerFiltersFromParams(new URLSearchParams('cins=1'))
    expect(toCareerQuery(women, 4, undefined, 0).gender).toBe(1)
    expect(careerFiltersToParams(women).toString()).toBe('cins=1')
  })

  it('eski kariyer aramasının süzgeçleri korunur: lig, uyruk, ayak, takım, serbest oyuncu', () => {
    const f = { ...DEFAULT_CAREER_FILTERS, league: 13, nat: 18, foot: 'Left', team: 101, freeAgent: false }
    expect(careerFiltersFromParams(careerFiltersToParams(f))).toEqual(f)
    expect(toCareerQuery(f, 4, undefined, 0)).toMatchObject({ league: 13, nat: 18, foot: 'Left', team: 101 })
    const free = toCareerQuery({ ...DEFAULT_CAREER_FILTERS, freeAgent: true, team: 101 }, 4, undefined, 0)
    expect(free.free_agent).toBe(true)
    expect(free.team).toBeUndefined()
  })

  it('V3-05d/0: öznitelik minimumları (eski sayfanın 10 alanı) adres çubuğunda, varsayılan yazılmaz, sorguya attrMin olarak gider', () => {
    expect(ATTR_MIN_KEYS).toEqual(['Finishing', 'Vision', 'Crossing', 'Acceleration', 'SprintSpeed', 'Dribbling', 'Stamina', 'Strength', 'DefAwareness', 'Heading'])
    const f = { ...DEFAULT_CAREER_FILTERS, attrMin: { Finishing: 75, SprintSpeed: 80 } }
    const params = careerFiltersToParams(f)
    expect(params.toString()).toBe('oz_Finishing=75&oz_SprintSpeed=80')
    expect(careerFiltersFromParams(params)).toEqual(f)
    expect(toCareerQuery(f, 4, undefined, 0).attrMin).toEqual({ Finishing: 75, SprintSpeed: 80 })
    expect(toCareerQuery(DEFAULT_CAREER_FILTERS, 4, undefined, 0).attrMin).toBeUndefined()
    expect(careerFiltersFromParams(new URLSearchParams('oz_Finishing=120&oz_Bilinmeyen=50&oz_Vision=abc')).attrMin).toEqual({})
    expect(activeCareerFilterCount(f)).toBe(1)
  })

  it('kova ve kiralık süzgeci sorguya geçer', () => {
    const q = toCareerQuery({ ...DEFAULT_CAREER_FILTERS, buckets: ['ZOR'], loan: true }, 4, { contractData: false, loanData: true }, 0)
    expect(q.bucket).toEqual(['ZOR'])
    expect(q.on_loan).toBe(true)
  })
})
