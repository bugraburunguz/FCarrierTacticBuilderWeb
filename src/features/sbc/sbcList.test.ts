import { describe, expect, it } from 'vitest'
import type { KbSbcSet } from '../../api/types'
import { BADGE_WINDOW_HOURS, ENDING_SOON_HOURS, categoryLabel, countdownText, filterSets, parseReward, repeatText, sbcBadge, sbcFiltersFromParams, sbcFiltersToParams, votePct } from './sbcList'

const NOW = Date.parse('2026-10-15T12:00:00Z')
const H = 3_600_000
const set = (over: Partial<KbSbcSet>): KbSbcSet => ({ id: 1, name: 'Set', category: 'Upgrades', reward: [], status: 'CONFIRMED', challengeCount: 1, ...over })
const iso = (ms: number) => new Date(ms).toISOString()

describe('SBC rozet kuralları', () => {
  it(`Yeni: ilk görülme son ${BADGE_WINDOW_HOURS} saat içinde`, () => {
    expect(sbcBadge(set({ firstSeenAt: iso(NOW - 2 * H) }), NOW)).toBe('new')
    expect(sbcBadge(set({ firstSeenAt: iso(NOW - (BADGE_WINDOW_HOURS - 1) * H) }), NOW)).toBe('new')
    expect(sbcBadge(set({ firstSeenAt: iso(NOW - (BADGE_WINDOW_HOURS + 1) * H) }), NOW)).toBeNull()
  })

  it('Değişti: içerik son pencerede değişti ve Yeni değil', () => {
    expect(sbcBadge(set({ firstSeenAt: iso(NOW - 10 * 24 * H), contentChangedAt: iso(NOW - 3 * H) }), NOW)).toBe('changed')
    expect(sbcBadge(set({ firstSeenAt: iso(NOW - 3 * H), contentChangedAt: iso(NOW - 1 * H) }), NOW)).toBe('new')
    expect(sbcBadge(set({ firstSeenAt: iso(NOW - 10 * 24 * H), contentChangedAt: iso(NOW - 3 * 24 * H) }), NOW)).toBeNull()
  })

  it('alan yoksa rozet yok', () => {
    expect(sbcBadge(set({}), NOW)).toBeNull()
  })
})

describe('geri sayım', () => {
  it.each([
    [2 * H + 14 * 60_000, '2 sa 14 dk'],
    [45 * 60_000, '45 dk'],
    [3 * 24 * H + 4 * H, '3 gün 4 sa'],
    [30_000, '1 dk'],
  ])('%i ms → %s', (left, text) => {
    expect(countdownText(iso(NOW + left), NOW)).toBe(text)
  })

  it('bitiş yoksa ya da geçmişse metin yok', () => {
    expect(countdownText(undefined, NOW)).toBeNull()
    expect(countdownText(iso(NOW - H), NOW)).toBeNull()
  })
})

describe('süzgeç ↔ adres çubuğu', () => {
  it('varsayılanlar adrese yazılmaz', () => {
    expect(sbcFiltersToParams({ tab: 'tumu', q: '', sort: 'yeni' }).toString()).toBe('')
  })

  it.each([
    { tab: 'yeni', q: '', sort: 'yeni' },
    { tab: 'bitiyor', q: 'icon', sort: 'bitiyor' },
    { tab: 'kategori:Upgrades', q: 'Ödül & 50/50', sort: 'yeni' },
  ] as const)('gidiş-dönüş %o', (filters) => {
    expect(sbcFiltersFromParams(sbcFiltersToParams(filters))).toEqual(filters)
  })

  it('bilinmeyen değerler varsayılana düşer', () => {
    expect(sbcFiltersFromParams(new URLSearchParams('sekme=zzz&sirala=qq'))).toEqual({ tab: 'tumu', q: '', sort: 'yeni' })
  })
})

describe('süzme ve sıralama', () => {
  const sets = [
    set({ id: 1, name: 'Eski', category: 'Upgrades', firstSeenAt: iso(NOW - 10 * 24 * H), endsAt: iso(NOW + 3 * 24 * H) }),
    set({ id: 2, name: 'Yeni Icon', category: 'Icons', firstSeenAt: iso(NOW - H), endsAt: iso(NOW + 2 * H) }),
    set({ id: 3, name: 'Süresiz', category: 'Icons', firstSeenAt: iso(NOW - 5 * 24 * H) }),
  ]
  it('sekme: Yeni / Bitiyor / kategori', () => {
    expect(filterSets(sets, { tab: 'yeni', q: '', sort: 'yeni' }, NOW).map((s) => s.id)).toEqual([2])
    expect(filterSets(sets, { tab: 'bitiyor', q: '', sort: 'yeni' }, NOW).map((s) => s.id)).toEqual([2])
    expect(filterSets(sets, { tab: 'kategori:Icons', q: '', sort: 'yeni' }, NOW).map((s) => s.id)).toEqual([2, 3])
  })
  it(`Bitiyor = ${ENDING_SOON_HOURS} saat içinde biten`, () => {
    expect(ENDING_SOON_HOURS).toBe(24)
  })
  it('arama set adında, büyük/küçük harf ve Türkçe İ duyarsız', () => {
    expect(filterSets(sets, { tab: 'tumu', q: 'İCON', sort: 'yeni' }, NOW).map((s) => s.id)).toEqual([2])
  })
  it('sıralama: yeni (ilk görülme azalan), bitiyor (bitiş artan, süresiz en sonda)', () => {
    expect(filterSets(sets, { tab: 'tumu', q: '', sort: 'yeni' }, NOW).map((s) => s.id)).toEqual([2, 3, 1])
    expect(filterSets(sets, { tab: 'tumu', q: '', sort: 'bitiyor' }, NOW).map((s) => s.id)).toEqual([2, 1, 3])
  })
})

describe('kategori sözlüğü', () => {
  it('bilinen kategoriler Türkçe, bilinmeyen ham adla', () => {
    expect(categoryLabel('Upgrades')).toBe('Yükseltmeler')
    expect(categoryLabel('Icons')).toBe('Icon')
    expect(categoryLabel('Brand New Category')).toBe('Brand New Category')
  })
})

describe('tekrar', () => {
  it('-1 sınırsız (∞), N > 0 N kez, boş ya da 0 tekrarsız (gösterilmez)', () => {
    expect(repeatText(-1)).toBe('∞')
    expect(repeatText(5)).toBe('5')
    expect(repeatText(undefined)).toBeNull()
    expect(repeatText(0)).toBeNull()
  })
})

describe('ödül ve oy', () => {
  it('ödül: öğe kaynak kimlikleri ve paket sayısı; tanınmayan tür yok sayılır', () => {
    expect(parseReward([{ type: 'item', value: 50_331_000, count: 1 }, { type: 'pack', value: 519, count: 2 }, { type: 'coins', value: 500, count: 1 }, {}])).toEqual({ itemResourceIds: [50_331_000], eaItems: [], picks: 0, packs: 2 })
    expect(parseReward(null)).toEqual({ itemResourceIds: [], eaItems: [], picks: 0, packs: 0 })
  })
  it('V3-05c-c: EA kart verisi olan ödül ayrı listede; ut_item yalnız verisi olmayanlar için sorulur', () => {
    const ea = { resourceId: 7, assetId: 70, rating: 88, preferredPosition: 'ST' }
    expect(parseReward([{ type: 'item', value: 7, count: 1, item: ea }, { type: 'item', value: 8, count: 1 }])).toEqual({ itemResourceIds: [8], eaItems: [ea], picks: 0, packs: 0 })
  })
  it('V3-05c-c: oyuncu seçimi jetonu (assetId 0, mevki yok, gerçek yakalamada reyting 99) oyuncu kartı değil, "seçim" sayılır', () => {
    const pick = { resourceId: 5_004_495, assetId: 0, rating: 99, rareflag: 1, teamid: 0, leagueId: 0 }
    expect(parseReward([{ type: 'item', value: 5_004_495, count: 1, item: pick }])).toEqual({ itemResourceIds: [], eaItems: [], picks: 1, packs: 0 })
  })
  it('oy yüzdesi: oy yoksa null, varsa yuvarlanmış beğeni oranı', () => {
    expect(votePct(undefined)).toBeNull()
    expect(votePct({ setId: 1, up: 0, down: 0, mine: 0 })).toBeNull()
    expect(votePct({ setId: 1, up: 41, down: 9, mine: 0 })).toBe(82)
  })
})
