import type { CaptureResult } from '../api/types'
import type { UtCaptureSummary } from '../state/utCaptureStore'
import type { UtCard } from './utCard'

/** Gelen kaynağın ('club' | 'market') kartlarını bütünüyle yeniler; gelmeyen kaynağın önceki kartları korunur (SBC-only yakalama kulübü silmez). */
export function mergeCards(previous: UtCard[] | undefined, incoming: UtCard[]): UtCard[] {
  const refreshed = new Set(incoming.map((c) => c.source))
  return [...(previous ?? []).filter((c) => !refreshed.has(c.source)), ...incoming]
}

/** Yakalamadan yalnız gelen bölümleri önceki özetin üstüne yazar; her bölümün zaman damgası ayrı tutulur. */
export function mergeSummary(previous: UtCaptureSummary | undefined, result: CaptureResult, now: string): UtCaptureSummary {
  const sections = { ...(previous?.sections ?? {}) }
  const stamp = (name: keyof UtCaptureSummary['sections'], received: boolean) => {
    if (received) {
      sections[name] = now
    }
    return received
  }
  const hasSbc = stamp('sbc', result.sbcSets.length > 0 || (result.sbcChallenges ?? []).length > 0)
  const hasEvo = stamp('evolutions', result.evolutions.length > 0)
  stamp('squad', result.activeSquad !== undefined || result.squads.length > 0)
  stamp('club', result.cards.length > 0)
  stamp('market', result.prices.some((p) => p.card !== undefined))
  return {
    importedAt: now,
    sbcSets: hasSbc ? result.sbcSets : (previous?.sbcSets ?? []),
    sbcChallenges: hasSbc ? (result.sbcChallenges ?? []) : (previous?.sbcChallenges ?? []),
    evolutions: hasEvo ? result.evolutions : (previous?.evolutions ?? []),
    activeSquad: result.activeSquad ?? previous?.activeSquad,
    squads: result.squads.length > 0 ? result.squads : (previous?.squads ?? []),
    coins: result.coins ?? previous?.coins,
    unknownPaths: result.unknownPaths && result.unknownPaths.length > 0 ? result.unknownPaths : (previous?.unknownPaths ?? []),
    sections,
  }
}
