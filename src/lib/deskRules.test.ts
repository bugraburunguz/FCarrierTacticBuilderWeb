import { describe, expect, it } from 'vitest'
import type { CareerPlayer, SlotAssignment } from '../api/types'
import { ageProfile, alerts, depthRows, suggestActions, weakSlots } from './deskRules'

function player(id: number, position: string, overall: number, age: number, extra: Partial<CareerPlayer['player']> = {}, loanedOut = false): CareerPlayer {
  return { player: { id, name: `P${id}`, overall, age, positions: [position], potential: overall + 2, valueEur: 2_000_000, ...extra } as CareerPlayer['player'], onLoan: false, loanedOut }
}

const slot = (slotId: string, position: string, fit: number, playerId: number): SlotAssignment =>
  ({ slotId, position, roleId: 'r', roleName: 'Rol', tags: [], playerId, playerName: `P${playerId}`, roleFit: { score: fit } } as unknown as SlotAssignment)

describe('deskRules', () => {
  const squad = [player(1, 'GK', 80, 30), player(2, 'CB', 78, 26), player(3, 'ST', 70, 32, { valueEur: 6_000_000 }), player(4, 'CM', 60, 19, { potential: 78 })]

  it('yaş profili ortalama ve kovaları verir', () => {
    const profile = ageProfile(squad)
    expect(profile.average).toBe(26.8)
    expect(profile.buckets.find((b) => b.label === '30+')?.count).toBe(2)
  })

  it('derinlik açığı mevki grubuna göre sayılır', () => {
    const rows = depthRows(squad)
    expect(rows.find((r) => r.group === 'GK')).toMatchObject({ have: 1, need: 2, short: 1 })
    expect(rows.find((r) => r.group === 'CB')?.short).toBe(2)
  })

  it('zayıf halkalar en zayıftan başlar', () => {
    const weak = weakSlots([slot('a', 'ST', 66, 3), slot('b', 'CB', 90, 2), slot('c', 'GK', 40, 1)])
    expect(weak.map((w) => w.slotId)).toEqual(['c', 'a'])
  })

  it('3 iş: zayıf halka önde, sonra satış ve genç', () => {
    const actions = suggestActions({ squad, slots: [slot('a', 'ST', 50, 3), slot('b', 'CB', 90, 2)], tags: {} })
    expect(actions).toHaveLength(3)
    expect(actions[0].kind).toBe('FILL')
    expect(actions[0].to).toContain('pos=ST')
    expect(actions.map((a) => a.kind)).toContain('LOAN')
  })

  it('satılık etiketi önceliği artırır; kilitli genç kiralanmaz', () => {
    const actions = suggestActions({ squad, slots: [slot('b', 'CB', 90, 2)], tags: { 3: 'FOR_SALE', 4: 'LOCKED' } })
    expect(actions[0]).toMatchObject({ kind: 'SELL', title: 'Sat: P3' })
    expect(actions.some((a) => a.kind === 'LOAN')).toBe(false)
  })

  it('uyarılar: potansiyele ulaşan genç, düşüşte 30+, dönem sonu', () => {
    const list = alerts({
      squad: [player(5, 'CM', 75, 21, { potential: 75 }), player(3, 'ST', 70, 32)], slots: [], tags: {},
      diffRows: [{ kind: 'CHANGED', playerId: 3, name: 'P3', overallFrom: 72, overallTo: 70 }],
      windowEndsOn: '2027-01-31', today: new Date('2027-01-25'),
    })
    expect(list.map((a) => a.text)).toEqual(expect.arrayContaining([expect.stringContaining('potansiyeline ulaştı'), expect.stringContaining('düşüşte'), expect.stringContaining('6 gün')]))
  })
})
