import { describe, expect, it } from 'vitest'
import type { CaptureResult } from '../api/types'
import type { UtCaptureSummary } from '../state/utCaptureStore'
import { mergeCards, mergeSummary } from './captureMerge'
import type { UtCard } from './utCard'

const T1 = '2026-10-01T10:00:00.000Z'
const T2 = '2026-10-02T10:00:00.000Z'

const card = (key: string, source: UtCard['source']): UtCard => ({ key, source, name: key, rating: 80, positions: ['ST'] })

function result(patch: Partial<CaptureResult>): CaptureResult {
  return { stats: {} as CaptureResult['stats'], cards: [], squads: [], prices: [], objectives: [], sbcSets: [], evolutions: [], currencies: [], config: { formations: [] }, ...patch }
}

const previous: UtCaptureSummary = {
  importedAt: T1,
  sbcSets: [],
  evolutions: [{ id: 1, name: 'Evo', levels: 2 }],
  activeSquad: { slots: [], name: 'Ana kadro' },
  squads: [{ id: 1, name: 'Kadro 1' }],
  coins: 5000,
  unknownPaths: [],
  sbcChallenges: [],
  sections: { club: T1, market: T1, sbc: T1, evolutions: T1, squad: T1 },
}

describe('mergeCards (WEB-BUG-14)', () => {
  it('yalnız SBC içeren yakalamada kulüp ve market kartları korunur', () => {
    const merged = mergeCards([card('c:1', 'club'), card('m:1', 'market')], [])
    expect(merged.map((c) => c.key)).toEqual(['c:1', 'm:1'])
  })

  it('gelen kaynak bütünüyle yenilenir, gelmeyen kaynak korunur', () => {
    const merged = mergeCards([card('c:1', 'club'), card('c:2', 'club'), card('m:1', 'market')], [card('c:3', 'club')])
    expect(merged.map((c) => c.key).sort()).toEqual(['c:3', 'm:1'])
  })
})

describe('mergeSummary (WEB-BUG-14)', () => {
  it('SBC-only yakalama aktif kadroyu, Evo ve kadro listesini silmez; yalnız SBC bölümü güncellenir', () => {
    const merged = mergeSummary(previous, result({ sbcSets: [{ setId: 9, name: 'Yeni SBC', challengesCount: 1, challengesCompleted: 0, repeatable: false }] }), T2)

    expect(merged.sbcSets).toHaveLength(1)
    expect(merged.activeSquad?.name).toBe('Ana kadro')
    expect(merged.evolutions).toHaveLength(1)
    expect(merged.squads).toHaveLength(1)
    expect(merged.coins).toBe(5000)
    expect(merged.sections).toEqual({ ...previous.sections, sbc: T2 })
  })

  it('gelen aktif kadro ve bakiye eskisinin yerine geçer', () => {
    const merged = mergeSummary(previous, result({ activeSquad: { slots: [], name: 'Yeni kadro' }, coins: 9000, cards: [{ instanceId: 1 } as CaptureResult['cards'][number]] }), T2)

    expect(merged.activeSquad?.name).toBe('Yeni kadro')
    expect(merged.coins).toBe(9000)
    expect(merged.sections.squad).toBe(T2)
    expect(merged.sections.club).toBe(T2)
    expect(merged.sections.sbc).toBe(T1)
  })

  it('önceki kayıt yokken boş bölümler boş kalır', () => {
    const merged = mergeSummary(undefined, result({}), T2)
    expect(merged.sections).toEqual({})
    expect(merged.sbcSets).toEqual([])
  })
})
