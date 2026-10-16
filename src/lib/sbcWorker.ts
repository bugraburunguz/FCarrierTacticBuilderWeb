import { rulesStore } from '../state/rulesStore'
import { solveTraditional, type SbcCandidate, type SbcConstraints, type SbcSlot, type SolveOptions } from './sbcTraditional'

export interface SolveRequest {
  slots: SbcSlot[]
  pool: SbcCandidate[]
  constraints: SbcConstraints
  /**
   * V3-05d: ana iş parçacığındaki kural dokümanı (`GET /ut/rules`). Worker kendi modül kopyasını taşır; verilmezse paketli fallback'te kalırdı,
   * bu yüzden kimya ve rating kuralları her istekle gelir.
   */
  rules?: unknown
  options?: Omit<SolveOptions, 'now'>
}

self.onmessage = (event: MessageEvent<SolveRequest>) => {
  const { slots, pool, constraints, rules, options } = event.data
  if (rules !== undefined) {
    rulesStore.set(rules)
  }
  self.postMessage(solveTraditional(slots, pool, constraints, undefined, options))
}
