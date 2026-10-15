import { describe, expect, it } from 'vitest'
import type { CareerPlayer } from '../api/types'
import roleIds from './roleIds.fixture.json'
import { ageProfile, alerts, depthRows, sellAdvice, suggestActions, TRANSFER_ROLE_BY_GROUP, weakSlots, type DeskSlot } from './deskRules'

function player(id: number, position: string, overall: number, age: number, extra: Partial<CareerPlayer['player']> = {}, loanedOut = false): CareerPlayer {
  return { player: { id, name: `P${id}`, overall, age, positions: [position], potential: overall + 2, valueEur: 2_000_000, ...extra } as CareerPlayer['player'], onLoan: false, loanedOut }
}

const slot = (slotId: string, position: string, pct: number, playerId: number, fitLabel: DeskSlot['fitLabel'] = pct < 20 ? 'WRONG_ROLE' : pct < 40 ? 'WEAK' : 'AT_LEVEL'): DeskSlot => ({ slotId, position, roleId: 'r', playerId, playerName: `P${playerId}`, pct, fitLabel })

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

  it('zayıf halka yalnız sarı/kırmızı bant (seviyesine göre), en zayıf başta; seviyesinde olan değil', () => {
    const weak = weakSlots([slot('a', 'ST', 30, 3), slot('b', 'CB', 90, 2), slot('c', 'GK', 10, 1), slot('d', 'CM', 55, 4)])
    expect(weak.map((w) => w.slotId)).toEqual(['c', 'a'])
  })

  it('3 iş: zayıf halka önde, sonra satış ve genç', () => {
    const actions = suggestActions({ squad, slots: [slot('a', 'ST', 30, 3), slot('b', 'CB', 90, 2)], tags: {} })
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

describe('sellAdvice (V3-06c satış planı; Masa "3 iş" ile aynı kurallar)', () => {
  const starters = new Set([2])
  it('satılık etiketi ya da 29+ yaş, ilk 11 dışı ve değeri olan → sat; gerekçe kısa metin', () => {
    expect(sellAdvice(player(3, 'ST', 70, 32, { valueEur: 6_000_000 }), starters, {})).toMatchObject({ kind: 'SELL', reason: expect.stringContaining("32 yaşında, ilk 11'de değil") })
    expect(sellAdvice(player(6, 'CM', 70, 24), starters, { 6: 'FOR_SALE' })).toMatchObject({ kind: 'SELL', reason: expect.stringContaining('satılık işaretli') })
  })

  it('21 yaş altı, potansiyeli 6+ puan üstünde, ilk 11 dışı ve kilitli değil → kirala', () => {
    expect(sellAdvice(player(4, 'CM', 60, 19, { potential: 78 }), starters, {})).toMatchObject({ kind: 'LOAN', reason: expect.stringContaining('potansiyeli 18 puan') })
    expect(sellAdvice(player(4, 'CM', 60, 19, { potential: 78 }), starters, { 4: 'LOCKED' }).kind).toBe('KEEP')
  })

  it('ilk 11 ya da kural dışı → tut (gerekçeli); "Sat" eylemi Masa ile aynı oyuncular', () => {
    expect(sellAdvice(player(2, 'CB', 78, 31), starters, {})).toMatchObject({ kind: 'KEEP', reason: "İlk 11'de" })
    expect(sellAdvice(player(7, 'CB', 70, 25), starters, {})).toMatchObject({ kind: 'KEEP' })
    const squad = [player(3, 'ST', 70, 32, { valueEur: 6_000_000 }), player(4, 'CM', 60, 19, { potential: 78 }), player(2, 'CB', 78, 31)]
    const sells = suggestActions({ squad, slots: [slot('b', 'CB', 90, 2)], tags: {} }).filter((a) => a.kind === 'SELL').map((a) => a.title)
    expect(sells).toEqual(squad.filter((c) => sellAdvice(c, starters, {}).kind === 'SELL').map((c) => `Sat: ${c.player.name}`))
  })
})

describe('TRANSFER_ROLE_BY_GROUP (WEB-BUG-06)', () => {
  it('her roleId backend rol listesinde var', () => {
    Object.entries(TRANSFER_ROLE_BY_GROUP).forEach(([group, { roleId }]) => expect(roleIds, `${group}: ${roleId}`).toContain(roleId))
  })
})
