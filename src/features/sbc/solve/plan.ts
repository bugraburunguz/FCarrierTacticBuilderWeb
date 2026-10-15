import type { Formation, FormationSlot, SbcChallenge } from '../../../api/types'
import { challengeSetup } from '../../../lib/sbcChallenge'
import { solveTraditional, type SbcConstraints, type SbcSlot, type SbcSolution, type SolveOptions } from '../../../lib/sbcTraditional'
import type { Customize, PlanCandidate } from './candidates'

/** Çözücü zaman bütçesi (ms): aşılınca ışın daraltılır, çözüm yine döner. */
export const SOLVE_DEADLINE_MS = 3000
/**
 * Şart cezası katsayısı: en pahalı katmanın (fiyatı bilinmeyen) 11 kartlık toplamından büyük; böylece çözücü önce şartları sağlar,
 * maliyet (öncelik katmanı) yalnız eşit şartlı kadrolar arasında seçer.
 */
export const PENALTY_SCALE = 1e12

export interface PlanRequest {
  slots: SbcSlot[]
  constraints: SbcConstraints
  /** Çözücünün zorlayamadığı şartlar (elle kontrol). */
  notes: string[]
}

export interface PlanResult extends Omit<SbcSolution, 'picks'> {
  picks: (PlanCandidate | undefined)[]
  slots: FormationSlot[]
  /** Çözüm yoksa tıkayan şartlar (havuz ön kontrolü + en iyi kadronun ihlalleri). */
  blocking: string[]
  notes: string[]
}

export function planRequest(challenge: SbcChallenge, formation: Formation, customize: Customize): PlanRequest {
  const setup = challengeSetup(challenge, [formation])
  return {
    slots: formation.slots.map((s) => ({ slotId: s.slotId, position: s.position })),
    constraints: { teamRatingMin: setup.teamRatingMin, chemMin: setup.chemMin, ...setup.extra, ...(customize.budget !== undefined ? { budget: customize.budget } : {}) },
    notes: setup.notes,
  }
}

export const solveOptions = (): SolveOptions => ({ deadlineMs: SOLVE_DEADLINE_MS, penaltyScale: PENALTY_SCALE })

/** Havuzun şartı hiç karşılayamadığı durumlar (çözücüyü beklemeden açıklama). */
export function preflight(request: PlanRequest, pool: PlanCandidate[]): string[] {
  const out: string[] = []
  request.constraints.fromAny?.forEach((r) => {
    const names = new Set(r.names)
    const have = new Set(pool.filter((c) => c[r.kind] && names.has(c[r.kind]!)).map((c) => c.playerKey)).size
    if (have < r.min) {
      out.push(`Havuzda ${r.names.join(' / ')} oyuncusu ${have} (gerekli ${r.min})`)
    }
  })
  const positions = new Set(request.slots.map((s) => s.position))
  positions.forEach((position) => {
    const need = request.slots.filter((s) => s.position === position).length
    const have = new Set(pool.filter((c) => c.positions.includes(position)).map((c) => c.playerKey)).size
    if (have < need) {
      out.push(`Havuzda ${position} oyuncusu ${have} (gerekli ${need})`)
    }
  })
  return out
}

export function toPlanResult(solution: SbcSolution, request: PlanRequest, formation: Formation, pool: PlanCandidate[]): PlanResult {
  const byId = new Map(pool.map((c) => [c.id, c]))
  const picks = solution.picks.map((p) => (p ? byId.get(p.id) ?? (p as PlanCandidate) : undefined))
  const blocking = solution.feasible ? [] : [...new Set([...preflight(request, pool), ...solution.violations])]
  return { ...solution, picks, slots: formation.slots, blocking, notes: request.notes }
}

/** Senkron çözüm (testler ve Worker yokken); sayfa Worker'daki `solvePlanAsync`'i kullanır. */
export function solvePlan({ challenge, formation, pool, customize }: { challenge: SbcChallenge; formation: Formation; pool: PlanCandidate[]; customize: Customize }): PlanResult {
  const request = planRequest(challenge, formation, customize)
  return toPlanResult(solveTraditional(request.slots, pool, request.constraints, undefined, solveOptions()), request, formation, pool)
}
