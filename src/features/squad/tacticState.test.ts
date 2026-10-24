import { describe, expect, it } from 'vitest'
import type { TacticState } from '../../lib/tactic'
import { squadStateOf, tacticOf } from './tacticState'

/** KARIYER-UX FAZ 4a: Lab taslağı kurucuya squadStateOf ile girer, kurucu değişikliği tacticOf ile taslağa döner (gidiş-dönüş birebir). */
describe('tacticOf (squadStateOf tersi)', () => {
  it('formasyon, preset, kurulum, rol ve etiketler gidiş-dönüşte aynı; boş seçim yazılmaz', () => {
    const tactic: TacticState = {
      formation: '4-4-2', presetId: 'p1', setup: { buildUp: 'Counter', depth: 40 },
      slots: { ST: { tags: ['run'], roleId: 'advanced_forward_attack' }, GK: { tags: [], roleId: 'goalkeeper_defend' }, LM: { tags: ['wide'] } },
    }
    expect(tacticOf(squadStateOf(tactic, { ST: 9 }))).toEqual(tactic)
  })

  it('formasyon yoksa varsayılan', () => {
    expect(tacticOf({ roleOverride: {}, tags: {}, assigned: {} }).formation).toBe('4-3-3')
  })
})
