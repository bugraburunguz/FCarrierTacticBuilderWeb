import { describe, expect, it } from 'vitest'
import type { RoleFit } from '../../api/types'
import { fitDisplay } from '../../lib/fitLabels'
import { needsFromFits, type SlotFitRow } from './useSlotFits'

const row = (slotId: string, levelFit: number, score: number, fitLabel: RoleFit['fitLabel']): SlotFitRow => {
  const fit = { playerId: 1, playerName: slotId, roleId: 'r', roleName: 'Rol', score, levelFit, fitLabel, outOfPosition: false, reasons: [], weaponChecks: [], projectedRating: 70 } as RoleFit
  return { slotId, position: 'CM', roleId: 'r', roleName: 'Rol', playerId: 1, playerName: slotId, fit, display: fitDisplay(fit) }
}

describe('İhtiyaçlar = yeni motor (E3-10b)', () => {
  const rows = [row('CM1', 38, 65, 'WEAK'), row('CM2', 12, 40, 'WRONG_ROLE'), row('ST', 55, 70, 'AT_LEVEL'), row('GK', 80, 90, 'GOOD')]

  it('yalnız sarı ve kırmızı; seviyesine göre artan (kırmızı en başta)', () => {
    expect(needsFromFits(rows).map((r) => r.slotId)).toEqual(['CM2', 'CM1'])
  })

  it('"tüm kadro" görünümünde hepsi, yine artan', () => {
    expect(needsFromFits(rows, true).map((r) => r.slotId)).toEqual(['CM2', 'CM1', 'ST', 'GK'])
  })

  it('aynı oyuncunun sahadaki ve İhtiyaçlar\'daki değeri aynı: ikisi de fitDisplay(RoleFit).pct', () => {
    const cm1 = rows[0]
    expect(needsFromFits(rows).find((r) => r.slotId === 'CM1')?.display.pct).toBe(fitDisplay(cm1.fit).pct)
    expect(cm1.display.pct).toBe(38)
  })
})
