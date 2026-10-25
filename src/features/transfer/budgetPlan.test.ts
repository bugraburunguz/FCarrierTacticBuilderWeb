import { describe, expect, it } from 'vitest'
import type { CareerPlayer, ShortlistItem } from '../../api/types'
import type { SlotFitRow } from '../squad/useSlotFits'
import { budgetPlan, needsForTransfer, salesIncome } from './transferPlan'

const member = (id: number, extra: Partial<CareerPlayer> = {}, player: object = {}): CareerPlayer =>
  ({ player: { id, name: `P${id}`, overall: 70, positions: ['CM'], age: 25, valuationEstimated: false, ...player }, onLoan: false, ...extra }) as CareerPlayer
const item = (playerId: number, valueEur?: number, maxFeeEur?: number): ShortlistItem => ({
  playerId, maxFeeEur, player: { id: playerId, name: `S${playerId}`, overall: 70, positions: ['ST'], valueEur, valuationEstimated: false },
})
const row = (slotId: string, playerId: number, fitLabel: string, levelFit: number): SlotFitRow => ({
  slotId, position: 'CM', roleId: 'b2b', roleName: 'Box-to-Box', playerId, playerName: `P${playerId}`,
  fit: { fitLabel, levelFit } as never, display: { pct: levelFit, state: fitLabel === 'GOOD' ? 'good' : 'bad' } as never,
})

/** KARIYER-UX FAZ 5 (15 §4.4): Bütçe planı ve İhtiyaçlar. */
describe('Transfer FAZ 5 hesapları', () => {
  it('İhtiyaçlar Masa zayıf halka kuralıyla (weakLinks, sınırsız): WEAK/WRONG_ROLE (AT_LEVEL değil, FAZ 6a-G), en zayıf önce; tüm kadroda hepsi; derinlik açıkları sonda', () => {
    const rows = [row('CM1', 1, 'AT_LEVEL', 55), row('CM2', 2, 'WEAK', 30), row('CM3', 3, 'GOOD', 80), row('CM4', 4, 'WRONG_ROLE', 40)]
    const needs = needsForTransfer(rows, false, [])
    expect(needs.filter((n) => n.slotId).map((n) => n.key)).toEqual(['slot-CM2', 'slot-CM4'])
    expect(needs.find((n) => n.key === 'slot-CM2')).toMatchObject({ slotId: 'CM2', position: 'CM', roleId: 'b2b' })
    expect(needsForTransfer(rows, true, []).filter((n) => n.slotId).map((n) => n.key)).toContain('slot-CM3')
    expect(needs.at(-1)?.key).toMatch(/^depth-/)
  })

  it('FIT-1: ihtiyaç metni rozetteki metriğin adıyla — Rol oturması varsa o, norm yoksa Güç', () => {
    const withRole = { ...row('CM1', 1, 'WEAK', 30), display: { pct: 30, state: 'bad', strength: 55, roleFit: 30 } as never }
    const noNorm = { ...row('CM2', 2, 'WEAK', 45), display: { pct: 45, state: 'bad', strength: 45 } as never }
    const details = needsForTransfer([withRole, noNorm], true, []).filter((n) => n.slotId).map((n) => n.detail)
    expect(details).toEqual(['P1 · Rol oturması %30', 'P2 · Güç 45'])
  })

  it('satış planı geliri = Σ FOR_SALE (istenen bedel, yoksa değer); ikisi de yoksa bilinmeyen sayılır; LOAN_OK gelir değil', () => {
    const squad = [member(1, { valueEur: 2_000_000 }), member(2, {}, { valueEur: 1_000_000 }), member(3), member(4, { valueEur: 9_000_000 })]
    const tags = [{ playerId: 1, tag: 'FOR_SALE', askingPriceEur: 2_500_000 }, { playerId: 2, tag: 'FOR_SALE' }, { playerId: 3, tag: 'FOR_SALE' }, { playerId: 4, tag: 'LOAN_OK' }] as never
    expect(salesIncome(squad, tags)).toEqual({ total: 3_500_000, unknown: 1, count: 3 })
  })

  it('kalan bütçe = bütçe − kısa liste + satış planı; bütçe bilinmiyorsa kalan yok (0 değil)', () => {
    const squad = [member(1, { valueEur: 2_000_000 })]
    const tags = [{ playerId: 1, tag: 'FOR_SALE', askingPriceEur: 1_000_000 }] as never
    const plan = budgetPlan({ budgetEur: 5_000_000, wageBudgetEur: 40_000, shortlist: [item(50, 1_500_000, 1_200_000), item(51, 800_000)], squad, tags })
    expect(plan.shortlist.total).toBe(2_000_000)
    expect(plan.sales.total).toBe(1_000_000)
    expect(plan.remaining).toBe(4_000_000)
    expect(budgetPlan({ budgetEur: undefined, shortlist: [], squad, tags }).remaining).toBeUndefined()
    expect(budgetPlan({ budgetEur: 5_000_000, shortlist: [], squad: [], tags: [] }).remaining).toBe(5_000_000)
  })

  it('maaş etkisi: herhangi bir maaş bilinmiyorsa hesaplanmaz ve bilinmeyen sayısı döner (kısmi toplam yok)', () => {
    const squad = [member(1, { wageEur: 5_000 }), member(2)]
    const sellBoth = [{ playerId: 1, tag: 'FOR_SALE' }, { playerId: 2, tag: 'FOR_SALE' }] as never
    expect(budgetPlan({ budgetEur: 1, wageBudgetEur: 40_000, shortlist: [item(50, 1)], squad, tags: sellBoth }).wage).toEqual({ kind: 'unknown', unknown: 2 })
    expect(budgetPlan({ budgetEur: 1, wageBudgetEur: 40_000, shortlist: [], squad, tags: [{ playerId: 1, tag: 'FOR_SALE' }] as never }).wage)
      .toEqual({ kind: 'known', deltaEur: -5_000, share: -0.125 })
    expect(budgetPlan({ budgetEur: 1, shortlist: [], squad, tags: [] }).wage).toEqual({ kind: 'empty' })
  })
})
