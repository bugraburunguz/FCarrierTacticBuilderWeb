import { describe, expect, it } from 'vitest'
import { matchSlots, type CompareSlot } from './compareMatch'

const slot = (slotId: string, position: string, x: number): CompareSlot => ({ slotId, position, x })
const F442 = [slot('GK', 'GK', 50), slot('LB', 'LB', 10), slot('LCB', 'CB', 35), slot('RCB', 'CB', 65), slot('RB', 'RB', 90),
  slot('LM', 'LM', 10), slot('LCM', 'CM', 35), slot('RCM', 'CM', 65), slot('RM', 'RM', 90), slot('LST', 'ST', 35), slot('RST', 'ST', 65)]
const F433 = [slot('GK', 'GK', 50), slot('LB', 'LB', 10), slot('LCB', 'CB', 35), slot('RCB', 'CB', 65), slot('RB', 'RB', 90),
  slot('RCM', 'CM', 70), slot('CM', 'CM', 50), slot('LCM', 'CM', 30), slot('LW', 'LW', 15), slot('ST', 'ST', 50), slot('RW', 'RW', 85)]

/** KARIYER-UX FAZ 5 (4b-2 kararı): aynı formasyon → slot kimliği; farklı → mevki, aynı mevkide soldan sağa sıra; eşleşmeyen ayrı listede. */
describe('matchSlots', () => {
  it('aynı formasyon: slot kimliğiyle, yalnız-A/B yok', () => {
    const m = matchSlots({ formation: '4-4-2', slots: F442 }, { formation: '4-4-2', slots: [...F442].reverse() })
    expect(m.pairs.map((p) => [p.a, p.b])).toEqual(F442.map((s) => [s.slotId, s.slotId]))
    expect(m.onlyA).toEqual([])
    expect(m.onlyB).toEqual([])
  })

  it('farklı formasyon: mevkiye göre, aynı mevkide soldan sağa (x); eşleşmeyenler yalnız A / yalnız B', () => {
    const m = matchSlots({ formation: '4-4-2', slots: F442 }, { formation: '4-3-3', slots: F433 })
    expect(m.pairs.map((p) => [p.a, p.b])).toEqual([
      ['GK', 'GK'], ['LB', 'LB'], ['LCB', 'LCB'], ['RCB', 'RCB'], ['RB', 'RB'],
      ['LCM', 'LCM'], ['RCM', 'CM'], ['LST', 'ST'],
    ])
    expect(m.onlyA).toEqual(['LM', 'RM', 'RST'])
    expect(m.onlyB).toEqual(['RCM', 'LW', 'RW'])
  })
})
