/**
 * V3-05d SBC çözüm sayfası için SENTETİK kulüp + görevler (gerçek yakalamadan türetilmedi; yerel DB'ye yazılmaz).
 * Bileşen/çözücü testleri ve ekran kapıları (Playwright route + IndexedDB tohumu) aynı veriyi kullanır.
 */
import type { Formation, PlayerSummary, SbcChallenge } from '../../src/api/types'
import type { UtCard } from '../../src/lib/utCard'

const LEAGUES = ['Premier League', 'LALIGA EA SPORTS', 'Bundesliga', 'Serie A Enilive', 'Ligue 1 McDonald\'s'] as const
const NATIONS = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Brazil'] as const
const CLUBS: Record<(typeof LEAGUES)[number], string[]> = {
  'Premier League': ['Kapı United', 'Kapı City'],
  'LALIGA EA SPORTS': ['Kapı CF', 'Kapı Atlético'],
  Bundesliga: ['Kapı 04', 'Kapı München'],
  'Serie A Enilive': ['Kapı FC', 'Kapı Calcio'],
  'Ligue 1 McDonald\'s': ['Kapı SG', 'Kapı OM'],
}
const POSITIONS = ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'ST'] as const

/** 60 kulüp kartı: 64-86 reyting, 5 lig, 6 ülke; her 3 karttan biri takas edilemez. */
export function sbcClubFixture(): UtCard[] {
  const cards: UtCard[] = []
  for (let i = 0; i < 60; i++) {
    const league = LEAGUES[i % LEAGUES.length]
    const position = POSITIONS[i % POSITIONS.length]
    cards.push({
      key: `c:${9000 + i}`, source: 'club', name: `Kapı Oyuncu ${i + 1}`, rating: 64 + ((i * 7) % 23), positions: [position],
      club: CLUBS[league][i % 2], league, nationality: NATIONS[i % NATIONS.length], untradeable: i % 3 === 0, price: i % 3 === 0 ? undefined : 500 + i * 40,
      playerId: 70_000 + i, assetId: 80_000 + i, instanceId: 9000 + i, pile: 'club',
    })
  }
  return cards
}

/** Katalog (market) adayları: her mevki için 84-90 reyting; bazılarının bilgi tabanında fiyatı var. */
export function sbcMarketFixture(): PlayerSummary[] {
  const out: PlayerSummary[] = []
  let id = 500_000
  // Kulüpte olmayan kanat bek / CF dahil: q17 matrisinde 29 dizilişin hepsi 11 kartla dolar.
  for (const position of new Set([...POSITIONS, 'LWB', 'RWB', 'CF'])) {
    for (const overall of [84, 86, 88, 90]) {
      const league = LEAGUES[id % LEAGUES.length]
      out.push({ id, name: `Pazar ${position} ${overall}`, overall, positions: [position], club: CLUBS[league][0], league, nationality: NATIONS[id % NATIONS.length],
        faceAssetId: 600_000 + (id - 500_000), valuationEstimated: false, gender: 0 })
      id++
    }
  }
  return out
}

/** /ut/kb/prices yanıtı: market adaylarının yarısının gözlenen fiyatı var. */
export function sbcPricesFixture(resourceIds: number[]) {
  return resourceIds.filter((r) => r >= 600_000 && r % 2 === 0).map((r) => ({ resourceId: r, price: 1000 + (r % 97) * 150, observedAt: '2026-10-15T10:00:00Z', lowConfidence: false }))
}

const SLOTS_442 = [['GK', 50, 92], ['LB', 15, 72], ['CB', 38, 76], ['CB', 62, 76], ['RB', 85, 72], ['LM', 15, 45], ['CM', 38, 50], ['CM', 62, 50], ['RM', 85, 45], ['ST', 38, 18], ['ST', 62, 18]] as const

export const FORMATION_442: Formation = {
  id: '4-4-2', label: '4-4-2', eaLabel: '4-4-2',
  slots: SLOTS_442.map(([position, x, y], i) => ({ slotId: `s${i}`, position, group: position, defaultRole: '', x, y })),
}

const base = { setId: 7700, setName: 'Kapı Çözüm Seti', repeatable: false, timesCompleted: 0, awards: [], formation: '4-4-2', formationLabel: '4-4-2' }
const req = (kind: string, op: string, value: number, extra: Record<string, unknown> = {}) => ({ kind, op, value, ...extra })

/** GET /ut/kb/sbc/7700 yanıtı (KbSbcSet): aynı görevler bilgi tabanı biçiminde; `formation` verilirse kare görevler o dizilişte (q17 matrisi). */
export function sbcSetFixture(now: number, formation = '4-4-2') {
  return {
    id: 7700, name: 'Kapı Çözüm Seti', category: 'Upgrades', status: 'CONFIRMED' as const, challengeCount: SBC_CHALLENGES.length, reward: [],
    endsAt: new Date(now + 50 * 3_600_000).toISOString(),
    challenges: SBC_CHALLENGES.map((c) => ({
      id: c.challengeId, setId: 7700, name: c.name, kind: c.kind ?? 'SQUAD', eaType: c.type ?? 'OPEN_CHALLENGE', requirements: c.requirements, itemScoreTarget: c.pointsRequired, reward: [],
      // KB biçimi: formation = bizim kimlik (eşlenmişse), eaFormation = EA ham kodu
      formation: c.kind === 'ITEM_SCORE' || c.kind === 'SINGLE_ITEM' || c.formation === 'f999' ? undefined : formation,
      eaFormation: c.formation === 'f999' ? 'f999' : undefined,
    })),
  }
}

/** Dört tipik görev + skor tabanlı + çözümsüz + doğrulanamayan şartlı. */
export const SBC_CHALLENGES: SbcChallenge[] = [
  { ...base, challengeId: 77001, name: 'Takım reytingi', status: 'COMPLETED', requirements: [req('TEAM_RATING', 'MIN', 78)] },
  { ...base, challengeId: 77002, name: 'Kimya + lig', status: 'NOT_STARTED', requirements: [req('CHEMISTRY', 'MIN', 18), req('FROM', 'MIN', 3, { refs: [{ kind: 'LEAGUE', id: 13, name: 'Premier League' }] })] },
  { ...base, challengeId: 77003, name: 'Ülke ve kulüp sayısı', status: 'NOT_STARTED', requirements: [req('NATION_COUNT', 'MAX', 4), req('CLUB_COUNT', 'MIN', 5)] },
  { ...base, challengeId: 77004, name: 'Skor', status: 'NOT_STARTED', kind: 'ITEM_SCORE', type: 'ONE_CLICK', pointsRequired: 4100, formation: undefined, formationLabel: undefined, requirements: [] },
  { ...base, challengeId: 77005, name: 'Çözümsüz', status: 'NOT_STARTED', requirements: [req('TEAM_RATING', 'MIN', 95)] },
  { ...base, challengeId: 77006, name: 'Doğrulanamayan', status: 'NOT_STARTED', requirements: [req('TEAM_RATING', 'MIN', 70), req('PLAYER_ATTRIBUTE', 'MIN', 80), req('UNKNOWN', 'MIN', 2, { eaType: 'SOMETHING_NEW' })] },
  // V3-05d-b: tek kart teslimi (EA ONE_CLICK_CHALLENGE). Gerçek yakalamadaki biçim: PLAYER_ATTRIBUTE + ACADEMY_PLAYER_SLOTTING, formasyon yok → elle kontrol.
  { ...base, challengeId: 77007, name: 'Tek kart (elle)', status: 'NOT_STARTED', kind: 'SINGLE_ITEM', type: 'ONE_CLICK_CHALLENGE', pointsRequired: 4000, formation: undefined, formationLabel: undefined,
    requirements: [req('PLAYER_ATTRIBUTE', 'MIN', 1), req('ACADEMY_SLOTTING', 'MIN', 45)] },
  // Değerlendirilebilir tek kart şartı: altın ve en az 84 OVR → uygun kulüp kartları listelenir.
  { ...base, challengeId: 77008, name: 'Tek kart (uygun)', status: 'NOT_STARTED', kind: 'SINGLE_ITEM', type: 'ONE_CLICK_CHALLENGE', formation: undefined, formationLabel: undefined,
    requirements: [req('QUALITY', 'MIN', 3), req('MIN_OVR', 'MIN', 84, { count: 1 })] },
  // Eşlemesi olmayan EA formasyon kodu: ham kod saklı, arayüz "Formasyon tanınmadı (f999)".
  { ...base, challengeId: 77009, name: 'Tanınmayan formasyon', status: 'NOT_STARTED', formation: 'f999', formationLabel: undefined, requirements: [req('TEAM_RATING', 'MIN', 70)] },
]
