export type ChemCardType = 'ICON' | 'HERO'

export interface ChemCard {
  id: number
  club?: string
  league?: string
  nationality?: string
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

const CLUB_THRESHOLDS = [2, 4, 7]
const LEAGUE_THRESHOLDS = [3, 5, 8]
const NATION_THRESHOLDS = [2, 5, 8]
const ICON_NATION_WEIGHT = 2
const ICON_LEAGUE_WEIGHT = 1
const HERO_NATION_WEIGHT = 1
const HERO_LEAGUE_WEIGHT = 2
const MANAGER_BONUS = 1

export function thresholdPoints(count: number, thresholds: number[]): number {
  return thresholds.filter((t) => count >= t).length
}

function add(map: Map<string, number>, key: string | undefined, weight: number) {
  if (key) {
    map.set(key, (map.get(key) ?? 0) + weight)
  }
}

export interface ChemResult {
  perSlot: number[]
  total: number
}

/**
 * Kimya: kulüp 2/4/7, lig 3/5/8, ülke 2/5/8 eşikleri; mevki dışı oyuncu 0 alır ve kimseye katkı vermez.
 * Icon: doğru mevkide her zaman 3; ülkeye +2, her lige +1 katkı. Hero: ülkeye +1, kendi ligine +2 katkı.
 * Menajer: aynı ülke veya lig olan oyuncuya +1 (en fazla 1). Yalnızca doğru mevkideki oyuncular sayılır.
 */
export function squadChemistry(slots: ChemSlot[], manager?: ChemManager): ChemResult {
  const placed = slots.map((s) => (s.card && s.card.positions.includes(s.position) ? s.card : undefined))
  const cards = placed.flatMap((c) => (c ? [c] : []))
  const clubs = new Map<string, number>()
  const leagues = new Map<string, number>()
  const nations = new Map<string, number>()
  const allLeagues = new Set(cards.flatMap((c) => (c.league ? [c.league] : [])))
  cards.forEach((c) => {
    add(clubs, c.club, 1)
    if (c.cardType === 'ICON') {
      add(nations, c.nationality, ICON_NATION_WEIGHT)
      allLeagues.forEach((league) => add(leagues, league, ICON_LEAGUE_WEIGHT))
    } else if (c.cardType === 'HERO') {
      add(nations, c.nationality, HERO_NATION_WEIGHT)
      add(leagues, c.league, HERO_LEAGUE_WEIGHT)
    } else {
      add(nations, c.nationality, 1)
      add(leagues, c.league, 1)
    }
  })
  const perSlot = placed.map((card) => {
    if (!card) {
      return 0
    }
    if (card.cardType === 'ICON') {
      return MAX_PLAYER_CHEM
    }
    const points =
      thresholdPoints(clubs.get(card.club ?? '') ?? 0, CLUB_THRESHOLDS) +
      thresholdPoints(leagues.get(card.league ?? '') ?? 0, LEAGUE_THRESHOLDS) +
      thresholdPoints(nations.get(card.nationality ?? '') ?? 0, NATION_THRESHOLDS)
    const managerMatch = Boolean(manager) && (card.nationality === manager?.nationality || card.league === manager?.league)
    return Math.min(MAX_PLAYER_CHEM, points + (managerMatch ? MANAGER_BONUS : 0))
  })
  return { perSlot, total: Math.min(MAX_SQUAD_CHEM, perSlot.reduce((a, b) => a + b, 0)) }
}
