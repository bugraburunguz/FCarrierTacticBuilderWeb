import rules from './utRules.fc27.json'

export type ChemCardType = 'ICON' | 'HERO' | 'HOF'

export interface ChemCard {
  id: number
  club?: string
  league?: string
  nationality?: string
  gender?: number
  positions: string[]
  cardType?: ChemCardType
}

export interface ChemSlot {
  position: string
  card?: ChemCard
}

export interface ChemManager {
  nationality?: string
  league?: string
}

export const MAX_PLAYER_CHEM = 3
export const MAX_SQUAD_CHEM = 33

// Eşikler utRules.fc27.json'dan gelir (kaynak: fifauteam.com/fc-27-chemistry, 08 D-21); koda gömülmez.
const CLUB_THRESHOLDS = rules.chemistry.club
const LEAGUE_THRESHOLDS = rules.chemistry.league
const NATION_THRESHOLDS = rules.chemistry.nation
const MANAGER_BONUS = 1

export function thresholdPoints(count: number, thresholds: number[]): number {
  return thresholds.filter((t) => count >= t).length
}

function add(map: Map<string, number>, key: string | undefined, weight: number) {
  if (key) {
    map.set(key, (map.get(key) ?? 0) + weight)
  }
}

/** Kadın ve erkek ligleri birbirine bağlanmaz; ülke ve kulüp anahtarı ortaktır. */
function leagueKey(card: { league?: string; gender?: number }): string | undefined {
  return card.league ? `${card.gender ?? 0}:${card.league}` : undefined
}

export interface ChemResult {
  perSlot: number[]
  total: number
}

/**
 * FC27 kimya kuralları: kulüp 2/4/7, lig 3/5/8, ülke 2/5/8 eşikleri (oyuncunun kendisi dahil).
 * Mevki dışı oyuncu (ana veya alternatif mevki dışında) 0 alır ve kimseye katkı vermez.
 * Icon: doğru mevkide her zaman 3, ülkesine +1 ve XI'deki her lige +1 katkı.
 * Hero ve Hall of FUT: doğru mevkide her zaman 3, ülkesine +1 ve kendi ligine +1 katkı.
 * Menajer: aynı ülke veya lig olan oyuncuya +1 (en fazla 1). Yalnızca ilk 11 sayılır.
 */
export function squadChemistry(slots: ChemSlot[], manager?: ChemManager): ChemResult {
  const placed = slots.map((s) => (s.card && s.card.positions.includes(s.position) ? s.card : undefined))
  const cards = placed.flatMap((c) => (c ? [c] : []))
  const clubs = new Map<string, number>()
  const leagues = new Map<string, number>()
  const nations = new Map<string, number>()
  const allLeagues = new Set(cards.flatMap((c) => leagueKey(c) ?? []))
  cards.forEach((c) => {
    add(clubs, c.club, 1)
    add(nations, c.nationality, 1)
    if (c.cardType === 'ICON') {
      allLeagues.forEach((league) => add(leagues, league, 1))
    } else {
      add(leagues, leagueKey(c), 1)
    }
  })
  const perSlot = placed.map((card) => {
    if (!card) {
      return 0
    }
    if (card.cardType) {
      return MAX_PLAYER_CHEM
    }
    const points =
      thresholdPoints(clubs.get(card.club ?? '') ?? 0, CLUB_THRESHOLDS) +
      thresholdPoints(leagues.get(leagueKey(card) ?? '') ?? 0, LEAGUE_THRESHOLDS) +
      thresholdPoints(nations.get(card.nationality ?? '') ?? 0, NATION_THRESHOLDS)
    const managerMatch = Boolean(manager) && (card.nationality === manager?.nationality || card.league === manager?.league)
    return Math.min(MAX_PLAYER_CHEM, points + (managerMatch ? MANAGER_BONUS : 0))
  })
  return { perSlot, total: Math.min(MAX_SQUAD_CHEM, perSlot.reduce((a, b) => a + b, 0)) }
}
