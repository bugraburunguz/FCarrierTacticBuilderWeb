import { afterEach, describe, expect, it, vi } from 'vitest'
import bundled from './utRules.fc27.json'
import { rulesStore } from '../state/rulesStore'
import { solveTraditionalAsync } from './solveAsync'

// V3-05d: Worker ayrı modül kopyası taşır; sunucu kuralları (GET /ut/rules) her istekle gitmezse Worker paketli kopyada kalır.
afterEach(() => {
  rulesStore.reset()
  vi.unstubAllGlobals()
})

describe('çözücü Worker isteği', () => {
  it('sunucudan gelen kural dokümanı ve zaman bütçesi Worker\'a gider', async () => {
    const posted: unknown[] = []
    class FakeWorker {
      onmessage?: (e: { data: unknown }) => void
      postMessage(data: unknown) {
        posted.push(data)
        this.onmessage?.({ data: { feasible: false, picks: [], teamRating: 0, chemistry: 0, cost: 0, violations: [] } })
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', FakeWorker)
    const served = { ...bundled, rulesHash: 'sunucu' }
    expect(rulesStore.set(served)).toBe(true)
    await solveTraditionalAsync([], [], { teamRatingMin: 0, chemMin: 0 }, { deadlineMs: 3000 })
    expect(posted[0]).toMatchObject({ rules: served, options: { deadlineMs: 3000 } })
  })
})
