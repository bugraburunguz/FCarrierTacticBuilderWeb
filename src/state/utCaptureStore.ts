import { useSyncExternalStore } from 'react'
import type { CaptureResult } from '../api/types'
import { bigStore } from './bigStore'

const NAME = 'utCapture'

/** Yakalamadan kadro/SBC/Evo ekranlarının ihtiyaç duyduğu küçük özet (kartlar ayrıca utCardStore'da). */
export interface UtCaptureSummary {
  importedAt: string
  sbcSets: CaptureResult['sbcSets']
  evolutions: CaptureResult['evolutions']
  activeSquad?: CaptureResult['activeSquad']
  squads: CaptureResult['squads']
  coins?: number
  unknownPaths: string[]
  sbcChallenges: NonNullable<CaptureResult['sbcChallenges']>
}

export const utCaptureStore = {
  get: (): UtCaptureSummary | undefined => bigStore.get<UtCaptureSummary>(NAME),
  set(result: CaptureResult): boolean {
    bigStore.set(NAME, {
      importedAt: new Date().toISOString(),
      sbcSets: result.sbcSets,
      evolutions: result.evolutions,
      activeSquad: result.activeSquad,
      squads: result.squads,
      coins: result.coins,
      unknownPaths: result.unknownPaths ?? [],
      sbcChallenges: result.sbcChallenges ?? [],
    } satisfies UtCaptureSummary)
    return true
  },
  subscribe: bigStore.subscribe,
}

export function useUtCapture(): UtCaptureSummary | undefined {
  return useSyncExternalStore(utCaptureStore.subscribe, utCaptureStore.get)
}
