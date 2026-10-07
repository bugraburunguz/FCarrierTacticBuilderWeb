import { squadChemistry, type ChemCard } from './chemistry'

export interface SbcCandidate extends ChemCard {
  name: string
  overall: number
  price?: number
}

export interface SbcSlot {
  slotId: string
  position: string
}

export interface SbcConstraints {
  teamRatingMin: number
  chemMin: number
  minSameLeague?: number
  minSameNation?: number
  minSameClub?: number
  minOverallEach?: number
  required?: { league?: Record<string, number>; nationality?: Record<string, number>; club?: Record<string, number> }
}

export interface SbcSolution {
  feasible: boolean
  picks: (SbcCandidate | undefined)[]
  teamRating: number
  chemistry: number
  cost: number
  violations: string[]
}

const DEFAULT_BEAM = 300
const CHEM_WEIGHT = 3
const RATING_WEIGHT = 40
const MIN_PLAYERS = 11
const REQUIRED_WEIGHT = 60

/** Takım rating'i: (toplam + ortalamanın üstündeki fazlaların toplamı) / 11, yuvarlanmış. */
export function teamRating(ratings: number[]): number {
  if (ratings.length === 0) {
    return 0
  }
  const average = ratings.reduce((a, b) => a + b, 0) / ratings.length
  const excess = ratings.reduce((sum, r) => sum + Math.max(0, r - average), 0)
  return Math.round((ratings.reduce((a, b) => a + b, 0) + excess) / ratings.length)
}

function cardCost(card: SbcCandidate): number {
  return card.price ?? card.overall
}

function largestGroup(cards: SbcCandidate[], key: 'league' | 'nationality' | 'club'): number {
  const counts = new Map<string, number>()
  cards.forEach((c) => {
    const value = c[key]
    if (value) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  })
  return Math.max(0, ...counts.values())
}

export function checkConstraints(slots: SbcSlot[], picks: (SbcCandidate | undefined)[], constraints: SbcConstraints): Omit<SbcSolution, 'cost' | 'feasible' | 'picks'> {
  const cards = picks.flatMap((p) => (p ? [p] : []))
  const rating = cards.length === slots.length ? teamRating(cards.map((c) => c.overall)) : 0
  const chemistry = squadChemistry(slots.map((s, i) => ({ position: s.position, card: picks[i] }))).total
  const violations: string[] = []
  if (cards.length < slots.length) {
    violations.push('Kadro tamamlanamadı')
  }
  if (rating < constraints.teamRatingMin) {
    violations.push(`Takım rating'i ${rating} < ${constraints.teamRatingMin}`)
  }
  if (chemistry < constraints.chemMin) {
    violations.push(`Kimya ${chemistry} < ${constraints.chemMin}`)
  }
  const groups: [string, number | undefined, 'league' | 'nationality' | 'club'][] = [
    ['lig', constraints.minSameLeague, 'league'],
    ['ülke', constraints.minSameNation, 'nationality'],
    ['kulüp', constraints.minSameClub, 'club'],
  ]
  groups.forEach(([label, min, key]) => {
    if (min && largestGroup(cards, key) < min) {
      violations.push(`Aynı ${label}den en az ${min} oyuncu gerekli`)
    }
  })
  requiredViolations(cards, constraints).forEach((v) => violations.push(v))
  if (constraints.minOverallEach && cards.some((c) => c.overall < constraints.minOverallEach!)) {
    violations.push(`Her oyuncu en az ${constraints.minOverallEach} olmalı`)
  }
  return { teamRating: rating, chemistry, violations }
}

const REQUIRED_LABELS = { league: 'lig', nationality: 'ülke', club: 'kulüp' } as const

function requiredEntries(constraints: SbcConstraints): { key: 'league' | 'nationality' | 'club'; name: string; count: number }[] {
  const required = constraints.required ?? {}
  return (['league', 'nationality', 'club'] as const).flatMap((key) => Object.entries(required[key] ?? {}).map(([name, count]) => ({ key, name, count })))
}

function countOf(cards: SbcCandidate[], key: 'league' | 'nationality' | 'club', name: string): number {
  return cards.filter((c) => c[key] === name).length
}

function requiredViolations(cards: SbcCandidate[], constraints: SbcConstraints): string[] {
  return requiredEntries(constraints)
    .filter((r) => countOf(cards, r.key, r.name) < r.count)
    .map((r) => `XI'de en az ${r.count} ${REQUIRED_LABELS[r.key]} ${r.name} oyuncusu gerekli`)
}

interface State {
  picks: SbcCandidate[]
  used: Set<number>
  cost: number
  score: number
}

/** Beam search: slotları sırayla doldurur; maliyet (fiyat ya da yoksa rating toplamı) en düşük, kısıtları sağlayan seti arar. Yaklaşıktır. */
export function solveTraditional(slots: SbcSlot[], pool: SbcCandidate[], constraints: SbcConstraints, beam = DEFAULT_BEAM): SbcSolution {
  const eligible = pool.filter((c) => !constraints.minOverallEach || c.overall >= constraints.minOverallEach)
  const order = slots.map((s, index) => ({ slot: s, index })).sort((a, b) => eligibleCount(a.slot, eligible) - eligibleCount(b.slot, eligible))
  let states: State[] = [{ picks: [], used: new Set(), cost: 0, score: 0 }]
  order.forEach(({ slot }, step) => {
    const next: State[] = []
    for (const state of states) {
      for (const card of eligible) {
        if (state.used.has(card.id) || !card.positions.includes(slot.position)) {
          continue
        }
        const picks = [...state.picks, card]
        const cost = state.cost + cardCost(card)
        next.push({ picks, used: new Set(state.used).add(card.id), cost, score: cost + penalty(picks, order.slice(0, step + 1).map((o) => o.slot), constraints) })
      }
    }
    states = next.sort((a, b) => a.score - b.score).slice(0, beam)
  })
  const placed = (state: State) => {
    const byIndex: (SbcCandidate | undefined)[] = new Array(slots.length).fill(undefined)
    order.forEach(({ index }, i) => {
      byIndex[index] = state.picks[i]
    })
    return byIndex
  }
  const evaluated = states.map((state) => {
    const picks = placed(state)
    return { state, picks, ...checkConstraints(slots, picks, constraints) }
  })
  const feasible = evaluated.filter((e) => e.violations.length === 0).sort((a, b) => a.state.cost - b.state.cost)[0]
  const best = feasible ?? evaluated.sort((a, b) => a.violations.length - b.violations.length || a.state.cost - b.state.cost)[0]
  if (!best) {
    return { feasible: false, picks: slots.map(() => undefined), teamRating: 0, chemistry: 0, cost: 0, violations: ['Uygun aday bulunamadı'] }
  }
  return { feasible: Boolean(feasible), picks: best.picks, teamRating: best.teamRating, chemistry: best.chemistry, cost: best.state.cost, violations: best.violations }
}

function eligibleCount(slot: SbcSlot, pool: SbcCandidate[]): number {
  return pool.filter((c) => c.positions.includes(slot.position)).length
}

function penalty(picks: SbcCandidate[], slots: SbcSlot[], constraints: SbcConstraints): number {
  const chem = squadChemistry(slots.map((s, i) => ({ position: s.position, card: picks[i] }))).total
  const projectedChem = (chem * MIN_PLAYERS) / picks.length
  const average = picks.reduce((sum, c) => sum + c.overall, 0) / picks.length
  const missing = requiredEntries(constraints).reduce((sum, r) => sum + Math.max(0, r.count - countOf(picks, r.key, r.name)), 0)
  return Math.max(0, constraints.chemMin - projectedChem) * CHEM_WEIGHT + Math.max(0, constraints.teamRatingMin - average) * RATING_WEIGHT + missing * REQUIRED_WEIGHT
}
