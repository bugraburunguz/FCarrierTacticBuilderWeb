import { rulesStore } from '../state/rulesStore'

export type ChemCardType = 'ICON' | 'HERO' | 'HOF'

export interface ChemCard {
  id: number
  club?: string
  league?: string
  nationality?: string
  /** EA kimlikleri varsa adın yerine bunlar kullanılır (aynı ada sahip farklı kulüpler birleşmez). */
  clubId?: number
  leagueId?: number
  nationId?: number
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
  nationId?: number
  leagueId?: number
}

/** Kulüp, lig ve ülke anahtarı: id varsa id, yoksa ad. */
const keyOf = (id: number | undefined, name: string | undefined): string | undefined => (id !== undefined ? `#${id}` : name)

export const MAX_PLAYER_CHEM = 3
export const MAX_SQUAD_CHEM = 33

export function thresholdPoints(count: number, thresholds: number[]): number {
  return thresholds.filter((t) => count >= t).length
}

function add(map: Map<string, number>, key: string | undefined, weight: number) {
  if (key) {
    map.set(key, (map.get(key) ?? 0) + weight)
  }
}

/** Kadın ve erkek ligleri birbirine bağlanmaz; ülke ve kulüp anahtarı ortaktır. */
function leagueKey(card: { league?: string; leagueId?: number; gender?: number }): string | undefined {
  const key = keyOf(card.leagueId, card.league)
  return key ? `${card.gender ?? 0}:${key}` : undefined
}

export interface ChemResult {
  perSlot: number[]
  total: number
}

/**
 * FC27 kimya kuralları (backend ChemistryCalculator ile aynı; ortak vektörler utRules.fc27.vectors.json). Eşikler ve artışlar rulesStore'dan gelir.
 * Mevki dışı oyuncu 0 alır ve kimseye katkı vermez. Icon: doğru mevkide 3, ülkesine +1 ve XI'deki her lige +1.
 * Hero ve Hall of FUT: doğru mevkide 3, ülkesine +1 ve kendi ligine +1. Menajer: aynı ülke veya lig olan oyuncuya +1 (en fazla 1). Yalnızca ilk 11 sayılır.
 */
export function squadChemistry(slots: ChemSlot[], manager?: ChemManager): ChemResult {
  const rules = rulesStore.get().chemistry
  const placed = slots.map((s) => (s.card && s.card.positions.includes(s.position) ? s.card : undefined))
  const cards = placed.flatMap((c) => (c ? [c] : []))
  const clubs = new Map<string, number>()
  const leagues = new Map<string, number>()
  const nations = new Map<string, number>()
  const allLeagues = new Set(cards.flatMap((c) => leagueKey(c) ?? []))
  cards.forEach((c) => {
    add(clubs, keyOf(c.clubId, c.club), 1)
    add(nations, keyOf(c.nationId, c.nationality), 1)
    if (c.cardType === 'ICON') {
      add(nations, keyOf(c.nationId, c.nationality), rules.icon.nationIncrement)
      allLeagues.forEach((league) => add(leagues, league, rules.icon.everyLeagueInXiIncrement))
    } else {
      add(leagues, leagueKey(c), 1)
      if (c.cardType === 'HERO' || c.cardType === 'HOF') {
        add(nations, keyOf(c.nationId, c.nationality), rules.hero.nationIncrement)
        add(leagues, leagueKey(c), rules.hero.leagueIncrement)
      }
    }
  })
  const managerNation = manager && keyOf(manager.nationId, manager.nationality)
  const managerLeague = manager && keyOf(manager.leagueId, manager.league)
  const perSlot = placed.map((card) => {
    if (!card) {
      return rules.outOfPositionChem
    }
    if (card.cardType) {
      return rules.maxPerPlayer
    }
    const points =
      thresholdPoints(clubs.get(keyOf(card.clubId, card.club) ?? '') ?? 0, rules.thresholds.club) +
      thresholdPoints(leagues.get(leagueKey(card) ?? '') ?? 0, rules.thresholds.league) +
      thresholdPoints(nations.get(keyOf(card.nationId, card.nationality) ?? '') ?? 0, rules.thresholds.nation)
    const managerMatch =
      (managerNation !== undefined && keyOf(card.nationId, card.nationality) === managerNation) ||
      (managerLeague !== undefined && keyOf(card.leagueId, card.league) === managerLeague)
    return Math.min(rules.maxPerPlayer, points + (managerMatch ? rules.manager.bonus : 0))
  })
  return { perSlot, total: Math.min(rules.maxSquad, perSlot.reduce((a, b) => a + b, 0)) }
}
