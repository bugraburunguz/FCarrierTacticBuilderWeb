import { describe, expect, it } from 'vitest'
import { FORMATION_442, SBC_CHALLENGES, sbcClubFixture, sbcMarketFixture, sbcPricesFixture } from '../../../../tests/fixtures/sbcClubFixture'
import type { UtCard } from '../../../lib/utCard'
import { rulesStore } from '../../../state/rulesStore'
import { buildPool, clubCandidates, DEFAULT_CUSTOMIZE, marketCandidates, valueProxy, type PlanCandidate } from './candidates'
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

describe('değer vekili (V3-05d-c, tek yerde)', () => {
  it('bilinen fiyat varsa o; yoksa reytinge göre artan; takas edilemez aynı reytingde daha ucuz (mutlak değil)', () => {
    expect(valueProxy({ rating: 80, knownPrice: 1234 })).toBe(1234)
    const ratings = [70, 75, 80, 84, 86, 90, 92, 95]
    const values = ratings.map((rating) => valueProxy({ rating }))
    values.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(values[i]))
    expect(valueProxy({ rating: 76, untradeable: true })).toBeLessThan(valueProxy({ rating: 76 }))
    // mutlak öncelik değil: takas edilemez 86, takas edilebilir 75'ten pahalı
    expect(valueProxy({ rating: 86, untradeable: true })).toBeGreaterThan(valueProxy({ rating: 75 }))
  })
})

/** Sentetik kulüp: 4-4-2'nin her slotu için 75'lik; son ST için 76 takas edilemez, 76 takas edilebilir, 86 ve özel 80 seçenekleri. */
function goldClub(): UtCard[] {
  const slots = FORMATION_442.slots.map((s) => s.position)
  const card = (i: number, position: string, rating: number, extra: Partial<UtCard> = {}): UtCard => ({
    key: `g:${i}`, source: 'club', name: `Altın Oyuncu ${String.fromCharCode(65 + i)}`, rating, positions: [position], club: `Kulüp ${i % 4}`, league: 'Lig A', nationality: `Ülke ${i % 3}`,
    assetId: 90_000 + i, instanceId: 90_000 + i, untradeable: false, ...extra,
  })
  const cards = slots.slice(0, 10).map((p, i) => card(i, p, 75))
  cards.push(card(20, 'ST', 76, { untradeable: true }), card(21, 'ST', 76), card(22, 'ST', 86), card(23, 'ST', 80, { rarityId: 3 }), card(24, 'CM', 82, { rarityId: 12 }))
  return cards
}

describe('kulüp mü pazar mı (V3-05d-c)', () => {
  it('aynı reytingde kulüp kartı, satışındaki transfer vergisi (kurallardan) kadar ucuz sayılır: gereksiz satın alma yok', () => {
    const own = clubCandidates([{ key: 'c:1', source: 'club', name: 'A', rating: 75, positions: ['ST'], untradeable: false }])[0]
    const buy = marketCandidates([{ id: 1, name: 'B', overall: 75, positions: ['ST'], valuationEstimated: false }], new Map())[0]
    expect(own.price!).toBeLessThan(buy.price!)
    expect(own.price!).toBeCloseTo(buy.price! * (1 - rulesStore.get().transferTax), 5)
  })
})

describe('değerli kartları koru (V3-05d-c)', () => {
  const exactGold = { ...SBC_CHALLENGES[0], challengeId: 1, name: 'Tam Altın', requirements: [{ kind: 'QUALITY', op: 'EXACT', value: 3 }] }
  const goldPicks = (customize = DEFAULT_CUSTOMIZE) => solvePlan({ challenge: exactGold, formation: FORMATION_442, customize,
    pool: buildPool(clubCandidates(goldClub()), marketCandidates(sbcMarketFixture(), prices), customize) }).picks.filter((p): p is PlanCandidate => Boolean(p))

  it('tam Altın 11: gereksiz yüksek reyting yok, 86 seçilmez, takas edilemez 76 önce, özel kart yok', () => {
    const picks = goldPicks()
    expect(picks).toHaveLength(11)
    expect(picks.every((p) => p.overall >= 75 && p.overall <= 76)).toBe(true)
    expect(picks.map((p) => p.cardKey)).toContain('g:20')
    expect(picks.map((p) => p.cardKey)).not.toContain('g:21')
    expect(picks.map((p) => p.cardKey)).not.toContain('g:22')
    expect(picks.some((p) => p.special)).toBe(false)
  })

  it('özel kart yalnız şart gerektiriyorsa: tek seçenek özelse kullanılır; koruma kapalıysa sıradan kart gibi', () => {
    // Çözücünün zorladığı şart: "Özel FC'den en az 1" — kulüpte bu kulüpten yalnız özel kart var.
    const forced = { ...SBC_CHALLENGES[0], challengeId: 2, name: 'Özel gerekli', requirements: [{ kind: 'FROM', op: 'MIN', value: 1, refs: [{ kind: 'CLUB', id: 1, name: 'Özel FC' }] }, { kind: 'QUALITY', op: 'EXACT', value: 3 }] }
    const only = goldClub().filter((c) => c.key !== 'g:22').map((c) => (c.key === 'g:23' ? { ...c, club: 'Özel FC' } : c))
    const picks = (customize = { ...DEFAULT_CUSTOMIZE, onlyClub: true }) => solvePlan({ challenge: forced, formation: FORMATION_442, customize, pool: buildPool(clubCandidates(only), [], customize) })
    const protectedPlan = picks()
    expect(protectedPlan.feasible).toBe(true)
    expect(protectedPlan.picks.filter((p) => (p as PlanCandidate | undefined)?.special)).toHaveLength(1)
    expect(clubCandidates(only).find((c) => c.cardKey === 'g:23')!.price!).toBeGreaterThan(clubCandidates(only, { protectSpecial: false }).find((c) => c.cardKey === 'g:23')!.price!)
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
