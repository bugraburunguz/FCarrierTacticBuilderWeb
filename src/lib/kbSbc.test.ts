import { describe, expect, it } from 'vitest'
import type { Formation, KbSbcSet } from '../api/types'
import { isItemScore, isSingleItem, kbChallenges } from './kbSbc'
import { findChallengeFormation } from './sbcChallenge'

const set = (challenges: KbSbcSet['challenges']): KbSbcSet => ({ id: 1, name: 'S', category: 'C', reward: [], status: 'CONFIRMED', challengeCount: challenges!.length, challenges })

describe('bilgi tabanı görevi (V3-05d-b)', () => {
  it('formasyon: bizim kimlik etikette, EA ham kodu formation\'da; EA görev tipi korunur', () => {
    const [squad, single, unknown] = kbChallenges(set([
      { id: 1, setId: 1, name: 'a', formation: '4-1-2-1-2 (geniş)', eaFormation: 'f41212', eaType: 'OPEN_CHALLENGE', kind: 'SQUAD', requirements: [] },
      { id: 2, setId: 1, name: 'b', eaType: 'ONE_CLICK_CHALLENGE', kind: 'SINGLE_ITEM', requirements: [], itemScoreTarget: 4000 },
      { id: 3, setId: 1, name: 'c', eaFormation: 'f999', eaType: 'OPEN_CHALLENGE', kind: 'SQUAD', requirements: [] },
    ]))
    expect(squad).toMatchObject({ formationLabel: '4-1-2-1-2 (geniş)', formation: 'f41212', type: 'OPEN_CHALLENGE', kind: 'SQUAD' })
    expect(single).toMatchObject({ kind: 'SINGLE_ITEM', type: 'ONE_CLICK_CHALLENGE' })
    expect(unknown).toMatchObject({ formation: 'f999' })
    expect(unknown.formationLabel).toBeUndefined()
  })

  it('tür: SINGLE_ITEM (ya da yakalamada ONE_CLICK_CHALLENGE) tek kart; skor tabanı yalnız ITEM_SCORE', () => {
    expect(isSingleItem({ kind: 'SINGLE_ITEM' } as never)).toBe(true)
    expect(isSingleItem({ type: 'ONE_CLICK_CHALLENGE' } as never)).toBe(true)
    expect(isSingleItem({ type: 'BRICK_CHALLENGE' } as never)).toBe(false)
    expect(isItemScore({ kind: 'ITEM_SCORE' } as never)).toBe(true)
    expect(isItemScore({ type: 'ONE_CLICK_CHALLENGE' } as never)).toBe(false)
  })

  it('formasyon EA koduyla da bulunur (eaFormationId); bilinmeyen kod bulunmaz', () => {
    const formations = [{ id: '4-1-2-1-2 (geniş)', eaFormationId: 'f41212', slots: [] }, { id: '4-5-1 (CAM)', eaFormationId: 'f451', slots: [] }] as unknown as Formation[]
    expect(findChallengeFormation('f41212', formations)?.id).toBe('4-1-2-1-2 (geniş)')
    expect(findChallengeFormation('f451', formations)?.id).toBe('4-5-1 (CAM)')
    expect(findChallengeFormation('f999', formations)).toBeUndefined()
  })
})
