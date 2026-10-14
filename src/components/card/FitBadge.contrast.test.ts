import { describe, expect, it } from 'vitest'
import { contrastRatio, over, parseColor } from '../../design/contrast'
import { TIER_LOOK } from '../../lib/cardDesign'
import { FIT_BADGE_COLORS } from './FitBadge'

/** Saha rozeti kontrastı (REP-b): her rozet durumu, bronz / gümüş / altın kartın her çerçeve renginin üstünde metin ≥ 4,5:1. Rozet tema bağımsız (kart yüzeyi tema bağımsız), koyu ve açık temada aynı. */
describe('saha rozeti kontrastı', () => {
  for (const theme of ['koyu', 'açık']) {
    for (const [tier, stops] of (['bronze', 'silver', 'gold'] as const).map((k) => [k, TIER_LOOK[k].frame] as const)) {
      for (const [state, colors] of Object.entries(FIT_BADGE_COLORS)) {
        for (const stop of stops) {
          it(`${state} · ${tier} ${stop} · ${theme} tema`, () => {
            const bg = over(parseColor(colors.bg), parseColor(stop))
            expect(contrastRatio(parseColor(colors.fg), bg)).toBeGreaterThanOrEqual(4.5)
          })
        }
      }
    }
  }
})
