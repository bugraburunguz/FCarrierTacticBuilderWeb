import { useSyncExternalStore } from 'react'
import type { CaptureResult } from '../api/types'

const KEY = 'fc.utCapture'

/** Yakalamadan kadro/SBC/Evo ekranlarının ihtiyaç duyduğu küçük özet (kartlar ayrıca fc.utCards'ta). */
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

let current: UtCaptureSummary | undefined = load()
const listeners = new Set<() => void>()

function load(): UtCaptureSummary | undefined {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as UtCaptureSummary) : undefined
  } catch {
    return undefined
  }
}

export const utCaptureStore = {
  get: () => current,
  set(result: CaptureResult): boolean {
    current = {
      importedAt: new Date().toISOString(),
      sbcSets: result.sbcSets,
      evolutions: result.evolutions,
      activeSquad: result.activeSquad,
      squads: result.squads,
      coins: result.coins,
      unknownPaths: result.unknownPaths ?? [],
      sbcChallenges: result.sbcChallenges ?? [],
    }
    listeners.forEach((l) => l())
    try {
      localStorage.setItem(KEY, JSON.stringify(current))
      return true
    } catch {
      return false
    }
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useUtCapture(): UtCaptureSummary | undefined {
  return useSyncExternalStore(utCaptureStore.subscribe, utCaptureStore.get)
}
