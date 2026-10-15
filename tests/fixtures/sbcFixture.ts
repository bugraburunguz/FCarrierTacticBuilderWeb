/**
 * V3-05c SBC listesi test verisi (yerel DB'ye yazılmaz): bileşen testleri ve ekran kapıları (Playwright route) aynı veriyi kullanır.
 * Zamanlar "şimdi"ye göre saat cinsinden; `sbcFixture(now)` gerçek tarihlere çevirir. Node 22.18+ tipleri kendisi siler (betikler doğrudan içe aktarır).
 * Kapsam: 14 set, 4 kategori (biri sözlükte yok), oyuncu ve paket ödülü, tekrarlı (∞ / N) ve tekrarsız, 2 saat ve 3 gün sonra biten,
 * Yeni ve Değişti, oylu ve oysuz, çok uzun set adı.
 */

interface RawSet {
  id: number
  name: string
  category: string
  challengeCount: number
  repeatable?: number
  endsInHours?: number
  firstSeenHoursAgo: number
  changedHoursAgo?: number
  reward: { type: string; value?: number; count: number }[]
  votes?: { up: number; down: number }
}

/** Ödül oyuncusu: ut_item'da var (kart çizilir). */
export const REWARD_ITEM = { id: 990_001, eaAssetId: 239_085, eaResourceId: 50_570_000, name: 'Erling Haaland', rating: 93, position: 'ST', altPositions: [], cardType: 'TOTW', rare: true, untradeableOnly: true, status: 'ACTIVE', promo: 'TOTW', quality: 'GOLD' } as const
/** Ödül oyuncusu: ut_item'da yok (genel "Oyuncu" rozeti). */
export const UNKNOWN_ITEM_RESOURCE = 50_999_999

const RAW: RawSet[] = [
  { id: 9301, name: 'Marquee Matchups', category: 'Challenges', challengeCount: 4, endsInHours: 2, firstSeenHoursAgo: 3, reward: [{ type: 'pack', value: 519, count: 1 }], votes: { up: 41, down: 9 } },
  { id: 9302, name: 'TOTW Haaland', category: 'Players', challengeCount: 3, endsInHours: 72, firstSeenHoursAgo: 5, reward: [{ type: 'item', value: REWARD_ITEM.eaResourceId, count: 1 }], votes: { up: 120, down: 30 } },
  { id: 9303, name: '84+ Player Pick', category: 'Upgrades', challengeCount: 1, repeatable: -1, endsInHours: 72, firstSeenHoursAgo: 240, changedHoursAgo: 6, reward: [{ type: 'pack', value: 700, count: 1 }], votes: { up: 15, down: 15 } },
  { id: 9304, name: 'Daily Bronze Upgrade', category: 'Upgrades', challengeCount: 1, repeatable: 5, endsInHours: 20, firstSeenHoursAgo: 30, reward: [{ type: 'pack', value: 701, count: 2 }] },
  { id: 9305, name: 'Icon Moments Zidane — Ultimate Edition Hybrid Leagues and Nations Mega Challenge Set', category: 'Icons', challengeCount: 12, endsInHours: 168, firstSeenHoursAgo: 400, reward: [{ type: 'item', value: UNKNOWN_ITEM_RESOURCE, count: 1 }], votes: { up: 3, down: 7 } },
  { id: 9306, name: 'Foundations: First XI', category: 'Foundations', challengeCount: 5, firstSeenHoursAgo: 900, reward: [{ type: 'pack', value: 702, count: 1 }] },
  { id: 9307, name: 'Hybrid Leagues', category: 'Challenges', challengeCount: 6, endsInHours: 96, firstSeenHoursAgo: 60, changedHoursAgo: 12, reward: [{ type: 'pack', value: 703, count: 1 }] },
  { id: 9308, name: 'League Upgrade: Premier League', category: 'Upgrades', challengeCount: 1, repeatable: 10, endsInHours: 48, firstSeenHoursAgo: 100, reward: [{ type: 'pack', value: 704, count: 1 }], votes: { up: 9, down: 1 } },
  { id: 9309, name: 'POTM Saka', category: 'Players', challengeCount: 2, endsInHours: 120, firstSeenHoursAgo: 20, reward: [{ type: 'item', value: UNKNOWN_ITEM_RESOURCE + 1, count: 1 }] },
  { id: 9310, name: 'Weekend Exchange', category: 'Seasonal Exchange', challengeCount: 1, repeatable: -1, endsInHours: 30, firstSeenHoursAgo: 70, reward: [{ type: 'pack', value: 705, count: 3 }] },
  { id: 9311, name: 'Puzzle Master', category: 'Challenges', challengeCount: 3, endsInHours: 12, firstSeenHoursAgo: 200, reward: [{ type: 'coins', value: 500, count: 1 }] },
  { id: 9312, name: 'Icon Pick', category: 'Icons', challengeCount: 2, endsInHours: 200, firstSeenHoursAgo: 1, reward: [{ type: 'pack', value: 706, count: 1 }], votes: { up: 50, down: 0 } },
  { id: 9313, name: 'Silver Squad', category: 'Foundations', challengeCount: 1, repeatable: 3, firstSeenHoursAgo: 1000, reward: [] },
  { id: 9314, name: 'Rare Player Pick', category: 'Upgrades', challengeCount: 1, endsInHours: 6, firstSeenHoursAgo: 46, reward: [{ type: 'pack', value: 707, count: 1 }] },
]

const iso = (now: number, hours: number) => new Date(now + hours * 3_600_000).toISOString()

/** GET /ut/kb/sbc yanıtı (KbSbcSet[] biçiminde). */
export function sbcFixture(now: number) {
  return RAW.map((s) => ({
    id: s.id, name: s.name, category: s.category, challengeCount: s.challengeCount, status: 'CONFIRMED' as const, reward: s.reward,
    ...(s.repeatable !== undefined ? { repeatable: s.repeatable } : {}),
    ...(s.endsInHours !== undefined ? { endsAt: iso(now, s.endsInHours) } : {}),
    firstSeenAt: iso(now, -s.firstSeenHoursAgo),
    ...(s.changedHoursAgo !== undefined ? { contentChangedAt: iso(now, -s.changedHoursAgo) } : {}),
  }))
}

/** GET /ut/sbc/votes yanıtı (oturumlu): oy olmayan setler listede yok. */
export function sbcVotesFixture() {
  return { sets: RAW.filter((s) => s.votes).map((s) => ({ setId: s.id, up: s.votes!.up, down: s.votes!.down, mine: 0 })) }
}

/** GET /ut/kb/items?resource=… yanıtı: yalnız ut_item'da olan ödül oyuncusu. */
export function sbcRewardItemsFixture(resources: number[]) {
  return resources.includes(REWARD_ITEM.eaResourceId) ? [{ ...REWARD_ITEM, altPositions: [] as string[] }] : []
}
