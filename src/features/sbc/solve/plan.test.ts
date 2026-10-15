import { describe, expect, it } from 'vitest'
import { FORMATION_442, SBC_CHALLENGES, sbcClubFixture, sbcMarketFixture, sbcPricesFixture } from '../../../../tests/fixtures/sbcClubFixture'
import { buildPool, clubCandidates, DEFAULT_CUSTOMIZE, marketCandidates, type PlanCandidate } from './candidates'
import { solvePlan } from './plan'
import { requirementStatuses } from './requirementStatus'
import { shoppingList, shoppingText } from './shoppingList'
import { streamlinedPool } from './streamlinedPool'

const challenge = (name: string) => SBC_CHALLENGES.find((c) => c.name === name)!
const prices = new Map(sbcPricesFixture(sbcMarketFixture().map((p) => p.faceAssetId!)).map((p) => [p.resourceId, p.price]))
const club = clubCandidates(sbcClubFixture())
const market = marketCandidates(sbcMarketFixture(), prices)
const pool = (customize = DEFAULT_CUSTOMIZE) => buildPool(club, market, customize)
const solve = (name: string, customize = DEFAULT_CUSTOMIZE) => solvePlan({ challenge: challenge(name), formation: FORMATION_442, pool: pool(customize), customize })
const picked = (r: ReturnType<typeof solve>) => r.picks.filter((p): p is PlanCandidate => Boolean(p))

describe('SBC çözücü önceliği (V3-05d)', () => {
  it('katman: kulüp takas edilemez < kulüp düşük değerli < bilinen en ucuz pazar < fiyatı bilinmeyen en düşük reytingli katalog', () => {
    const untradeable = club.find((c) => c.untradeable)!
    const tradeable = club.find((c) => !c.untradeable)!
    const known = market.find((c) => c.knownPrice !== undefined)!
    const unknown = market.find((c) => c.knownPrice === undefined)!
    expect([untradeable.tier, tradeable.tier, known.tier, unknown.tier]).toEqual([0, 1, 2, 3])
    expect(untradeable.price!).toBeLessThan(tradeable.price!)
    expect(tradeable.price!).toBeLessThan(known.price!)
    // 11 bilinen pazar kartı bile tek fiyatı bilinmeyen karttan ucuz sayılır
    expect(known.price! * 11).toBeLessThan(unknown.price!)
    const cheapUnknown = marketCandidates([{ ...sbcMarketFixture()[1], id: 1, overall: 70, faceAssetId: 1 }], new Map())[0]
    expect(cheapUnknown.price!).toBeLessThan(unknown.price!)
  })
})

describe('SBC çözümü — sentetik kulüp, 4 tipik görev + çözümsüz', () => {
  it('takım reytingi: şart sağlanır, kulüp kartları önce (takas edilemeyenler önde)', () => {
    const r = solve('Takım reytingi')
    expect(r.feasible).toBe(true)
    expect(r.teamRating).toBeGreaterThanOrEqual(78)
    expect(picked(r)).toHaveLength(11)
    expect(new Set(picked(r).map((p) => p.playerKey)).size).toBe(11)
    expect(picked(r).filter((p) => p.tier <= 1).length).toBeGreaterThanOrEqual(6)
  })

  it('kimya + lig: kimya ve "Premier League\'den en az 3" sağlanır', () => {
    const r = solve('Kimya + lig')
    expect(r.feasible).toBe(true)
    expect(r.chemistry).toBeGreaterThanOrEqual(18)
    expect(picked(r).filter((p) => p.league === 'Premier League').length).toBeGreaterThanOrEqual(3)
  })

  it('ülke ve kulüp sayısı: en çok 4 ülke, en az 5 kulüp', () => {
    const r = solve('Ülke ve kulüp sayısı')
    expect(r.feasible).toBe(true)
    expect(new Set(picked(r).map((p) => p.nationality)).size).toBeLessThanOrEqual(4)
    expect(new Set(picked(r).map((p) => p.club)).size).toBeGreaterThanOrEqual(5)
  })

  it('skor tabanlı: kulüp kartlarından havuz (reyting × takas durumu gruplanır, fiyat yalnız biliniyorsa)', () => {
    const entries = streamlinedPool(sbcClubFixture())
    expect(entries.reduce((n, e) => n + e.count, 0)).toBe(60)
    expect(entries.filter((e) => e.untradeable).every((e) => e.priceEach === undefined)).toBe(true)
    expect(entries.every((e) => e.rarity === 'REGULAR')).toBe(true)
  })

  it('çözümsüz: hangi şartın tıkadığını söyler', () => {
    const r = solve('Çözümsüz')
    expect(r.feasible).toBe(false)
    expect(r.blocking.join(' ')).toMatch(/Takım rating/)
  })

  it('aynı girdi aynı çözüm (deterministik)', () => {
    expect(picked(solve('Kimya + lig')).map((p) => p.cardKey)).toEqual(picked(solve('Kimya + lig')).map((p) => p.cardKey))
  })

  it('yalnız kulüp: pazar kartı kullanılmaz; bütçe: fiyatı bilinmeyen alınmaz, bilinenlerin toplamı sınırı aşmaz', () => {
    expect(picked(solve('Takım reytingi', { ...DEFAULT_CUSTOMIZE, onlyClub: true })).every((p) => p.tier <= 1)).toBe(true)
    const budget = solve('Takım reytingi', { ...DEFAULT_CUSTOMIZE, budget: 5000 })
    const bought = picked(budget).filter((p) => p.tier >= 2)
    expect(bought.every((p) => p.knownPrice !== undefined)).toBe(true)
    expect(bought.reduce((n, p) => n + (p.knownPrice ?? 0), 0)).toBeLessThanOrEqual(5000)
  })

  it('kilitli kart çözümde kalır, hariç tutulan kullanılmaz', () => {
    const first = picked(solve('Takım reytingi'))
    const lock = first.find((p) => p.tier === 1) ?? first[0]
    const exclude = first.find((p) => p.cardKey !== lock.cardKey)!
    const again = picked(solve('Takım reytingi', { ...DEFAULT_CUSTOMIZE, locked: [lock.cardKey], excluded: [exclude.cardKey] })).map((p) => p.cardKey)
    expect(again).toContain(lock.cardKey)
    expect(again).not.toContain(exclude.cardKey)
  })
})

describe('gereksinim çipleri', () => {
  it('✓ / ✗ sebepli / ? doğrulanamayan', () => {
    const r = solve('Doğrulanamayan')
    const statuses = requirementStatuses(challenge('Doğrulanamayan').requirements, r.picks, r.slots)
    expect(statuses.map((s) => s.state)).toEqual(['ok', 'unknown', 'unknown'])
    const failing = requirementStatuses([{ kind: 'CHEMISTRY', op: 'MIN', value: 34 }], r.picks, r.slots)[0]
    expect(failing.state).toBe('fail')
    expect(failing.reason).toMatch(/^Kimya \d+\/34$/)
  })
})

describe('alışveriş listesi', () => {
  it('yalnız alınacak kartlar; toplam yalnız bilinen fiyatlar + bilinmeyen sayısı; kopyalama metni', () => {
    const r = solve('Takım reytingi', { ...DEFAULT_CUSTOMIZE, excluded: club.filter((c) => c.overall >= 80).map((c) => c.cardKey) })
    const list = shoppingList(r.picks)
    expect(list.buy.every((p) => p.tier >= 2)).toBe(true)
    expect(list.knownTotal).toBe(list.buy.reduce((n, p) => n + (p.knownPrice ?? 0), 0))
    expect(list.unknownCount).toBe(list.buy.filter((p) => p.knownPrice === undefined).length)
    expect(list.club.length + list.buy.length).toBe(11)
    const text = shoppingText('Kapı Çözüm Seti · Takım reytingi', list)
    expect(text.split('\n')[0]).toBe('Kapı Çözüm Seti · Takım reytingi')
    if (list.unknownCount > 0) expect(text).toContain(`${list.unknownCount} kartın fiyatı bilinmiyor`)
    if (list.buy.some((p) => p.knownPrice === undefined)) expect(text).toContain('fiyat yok')
  })
})
