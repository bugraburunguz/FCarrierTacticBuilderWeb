import { squadChemistry, type ChemCard } from './chemistry'

export interface SbcCandidate extends ChemCard {
  name: string
  overall: number
  /** Maliyet: kulüp kartında fırsat maliyeti (≈0), market kartında coin (yakalanmış ya da tahmini). */
  price?: number
  source?: 'storage' | 'club' | 'market'
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
  /** "En çok" şartları: aynı kulüp/lig/ülkeden en fazla N oyuncu; farklı kulüp/lig/ülke sayısı üst sınırı. */
  max?: { sameClub?: number; sameLeague?: number; sameNation?: number; clubs?: number; leagues?: number; nations?: number }
  /** Farklı kulüp/lig/ülke sayısı alt sınırı. */
  minDistinct?: { clubs?: number; leagues?: number; nations?: number }
  /** Tüm oyuncular en az bu kalitede: 1 bronz, 2 gümüş, 3 altın (rating'den türetilir: <65, 65-74, 75+). */
  minQuality?: 1 | 2 | 3
  /** En az N oyuncu bu seviyede ya da üstünde. */
  levelCounts?: { level: 1 | 2 | 3; min: number }[]
  /** Verilen kulüp/lig/ülkelerden herhangi birinden en az N oyuncu (ör. "Liverpool veya Manchester City'den en az 2"). */
  fromAny?: { kind: 'club' | 'league' | 'nationality'; names: string[]; min: number }[]
}

export const QUALITY_LABELS = { 1: 'Bronz', 2: 'Gümüş', 3: 'Altın' } as const

export function qualityOf(rating: number): 1 | 2 | 3 {
  return rating >= 75 ? 3 : rating >= 65 ? 2 : 1
}

interface ExtraIssue {
  text: string
  missing: number
}

function distinct(cards: SbcCandidate[], key: 'club' | 'league' | 'nationality'): number {
  return new Set(cards.map((c) => c[key]).filter(Boolean)).size
}

/** Gelişmiş şartların ihlalleri (metin + eksik birim sayısı; ceza hesabında birim kullanılır). */
export function extraIssues(cards: SbcCandidate[], constraints: SbcConstraints): ExtraIssue[] {
  const issues: ExtraIssue[] = []
  const max = constraints.max ?? {}
  const sameLimits: ['club' | 'league' | 'nationality', number | undefined, string][] = [
    ['club', max.sameClub, 'kulüpten'],
    ['league', max.sameLeague, 'ligden'],
    ['nationality', max.sameNation, 'ülkeden'],
  ]
  sameLimits.forEach(([key, limit, label]) => {
    const largest = largestGroup(cards, key)
    if (limit !== undefined && largest > limit) {
      issues.push({ text: `Aynı ${label} en fazla ${limit} oyuncu olabilir (şu an ${largest})`, missing: largest - limit })
    }
  })
  const distinctLimits: ['club' | 'league' | 'nationality', number | undefined, number | undefined, string][] = [
    ['club', max.clubs, constraints.minDistinct?.clubs, 'kulüp'],
    ['league', max.leagues, constraints.minDistinct?.leagues, 'lig'],
    ['nationality', max.nations, constraints.minDistinct?.nations, 'ülke'],
  ]
  distinctLimits.forEach(([key, top, bottom, label]) => {
    const count = distinct(cards, key)
    if (top !== undefined && count > top) {
      issues.push({ text: `En fazla ${top} farklı ${label} olabilir (şu an ${count})`, missing: count - top })
    }
    if (bottom !== undefined && count < bottom) {
      issues.push({ text: `En az ${bottom} farklı ${label} gerekli (şu an ${count})`, missing: bottom - count })
    }
  })
  if (constraints.minQuality) {
    const below = cards.filter((c) => qualityOf(c.overall) < constraints.minQuality!).length
    if (below > 0) {
      issues.push({ text: `Tüm oyuncular en az ${QUALITY_LABELS[constraints.minQuality]} olmalı`, missing: below })
    }
  }
  constraints.levelCounts?.forEach((r) => {
    const have = cards.filter((c) => qualityOf(c.overall) >= r.level).length
    if (have < r.min) {
      issues.push({ text: `En az ${r.min} ${QUALITY_LABELS[r.level]} (ya da üstü) oyuncu gerekli`, missing: r.min - have })
    }
  })
  constraints.fromAny?.forEach((r) => {
    const names = new Set(r.names)
    const have = cards.filter((c) => {
      const value = c[r.kind]
      return Boolean(value) && names.has(value!)
    }).length
    if (have < r.min) {
      issues.push({ text: `${r.names.join(' / ')} içinden en az ${r.min} oyuncu gerekli (şu an ${have})`, missing: r.min - have })
    }
  })
  return issues
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
const PENALTY_COST_REFERENCE = 20

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
  extraIssues(cards, constraints).forEach((issue) => violations.push(issue.text))
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
  // Ceza ağırlıkları maliyet ölçeğine göre büyür: rating bazlı maliyette ~1, coin bazlı maliyette şartlar ucuz-ama-sağlamayan çözümlere yenilmez.
  const costScale = Math.max(1, Math.max(0, ...eligible.map(cardCost)) / PENALTY_COST_REFERENCE)
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
        next.push({ picks, used: new Set(state.used).add(card.id), cost, score: cost + penalty(picks, order.slice(0, step + 1).map((o) => o.slot), constraints) * costScale })
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
  const extra = extraIssues(picks, constraints).reduce((sum, issue) => sum + issue.missing, 0)
  return Math.max(0, constraints.chemMin - projectedChem) * CHEM_WEIGHT + Math.max(0, constraints.teamRatingMin - average) * RATING_WEIGHT + (missing + extra) * REQUIRED_WEIGHT
}
