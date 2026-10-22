import { describe, expect, it } from 'vitest'
import type { FormationSlot } from '../api/types'
import { formationRows } from './squadDensity'

const s = (slotId: string, position: string, x: number, y: number) => ({ slotId, position, x, y, defaultRole: 'r', group: position }) as unknown as FormationSlot

/** KARIYER-UX FAZ 3: taktiğe göre mevki haritası satırlarla (hatlar) çizilir; mutlak konumda CM/CDM hücreleri çakışıyordu (4-1-3-2). */
describe('formationRows', () => {
  it('hatlar hücumdan kaleye; hat içinde soldan sağa; kaleci en altta tek başına', () => {
    const rows = formationRows([
      s('GK', 'GK', 50, 92), s('RB', 'RB', 85, 72), s('LB', 'LB', 15, 72), s('LCB', 'CB', 35, 74), s('RCB', 'CB', 65, 74),
      s('CDM', 'CDM', 50, 60), s('LM', 'LM', 12, 47), s('CM', 'CM', 50, 50), s('RM', 'RM', 88, 47), s('LST', 'ST', 38, 15), s('RST', 'ST', 62, 15),
    ])
    expect(rows.map((r) => r.map((x) => x.slotId))).toEqual([['LST', 'RST'], ['LM', 'CM', 'RM'], ['CDM'], ['LB', 'LCB', 'RCB', 'RB'], ['GK']])
  })
})
