import { solveTraditional, type SbcCandidate, type SbcConstraints, type SbcSlot } from './sbcTraditional'

export interface SolveRequest {
  slots: SbcSlot[]
  pool: SbcCandidate[]
  constraints: SbcConstraints
}

self.onmessage = (event: MessageEvent<SolveRequest>) => {
  const { slots, pool, constraints } = event.data
  self.postMessage(solveTraditional(slots, pool, constraints))
}
