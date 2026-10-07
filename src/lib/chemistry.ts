export interface ChemCard {
  id: number
  club?: string
  league?: string
  nationality?: string
  positions: string[]
}

export interface ChemSlot {
  position: string
  card?: ChemCard
}

export const MAX_PLAYER_CHEM = 3
export const MAX_SQUAD_CHEM = 33

const CLUB_THRESHOLDS = [2, 4, 7]
const LEAGUE_THRESHOLDS = [3, 5, 8]
const NATION_THRESHOLDS = [2, 5, 8]

export function thresholdPoints(count: number, thresholds: number[]): number {
  return thresholds.filter((t) => count >= t).length
}

function countBy(cards: ChemCard[], key: 'club' | 'league' | 'nationality'): Map<string, number> {
  const counts = new Map<string, number>()
  cards.forEach((c) => {
    const value = c[key]
    if (value) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  })
  return counts
}

export interface ChemResult {
  perSlot: number[]
  total: number
}

/** Temel kart kimyası: kulüp 2/4/7, lig 3/5/8, ülke 2/5/8 eşikleri; mevki dışı oyuncu 0. Icon/Hero/Evolution özel kuralları dahil değildir. */
export function squadChemistry(slots: ChemSlot[]): ChemResult {
  const cards = slots.flatMap((s) => (s.card ? [s.card] : []))
  const clubs = countBy(cards, 'club')
  const leagues = countBy(cards, 'league')
  const nations = countBy(cards, 'nationality')
  const perSlot = slots.map((slot) => {
    const card = slot.card
    if (!card || !card.positions.includes(slot.position)) {
      return 0
    }
    const points =
      thresholdPoints(clubs.get(card.club ?? '') ?? 0, CLUB_THRESHOLDS) +
      thresholdPoints(leagues.get(card.league ?? '') ?? 0, LEAGUE_THRESHOLDS) +
      thresholdPoints(nations.get(card.nationality ?? '') ?? 0, NATION_THRESHOLDS)
    return Math.min(MAX_PLAYER_CHEM, points)
  })
  return { perSlot, total: Math.min(MAX_SQUAD_CHEM, perSlot.reduce((a, b) => a + b, 0)) }
}
