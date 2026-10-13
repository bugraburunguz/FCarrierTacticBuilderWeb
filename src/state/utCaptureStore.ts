import { useSyncExternalStore } from 'react'
import type { CaptureResult } from '../api/types'
import { mergeSummary } from '../lib/captureMerge'
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
  /** Bölüm başına son güncelleme zamanı; yakalama yalnız gelen bölümleri yeniler (WEB-BUG-14). */
  sections: Partial<Record<'club' | 'market' | 'sbc' | 'evolutions' | 'squad', string>>
}

export const utCaptureStore = {
  get: (): UtCaptureSummary | undefined => bigStore.get<UtCaptureSummary>(NAME),
  /** Yakalamadan yalnız gelen bölümleri önceki özetin üstüne birleştirir. */
  set(result: CaptureResult): boolean {
    bigStore.set(NAME, mergeSummary(bigStore.get<UtCaptureSummary>(NAME), result, new Date().toISOString()))
    return true
  },
  subscribe: bigStore.subscribe,
}

export function useUtCapture(): UtCaptureSummary | undefined {
  return useSyncExternalStore(utCaptureStore.subscribe, utCaptureStore.get)
}
