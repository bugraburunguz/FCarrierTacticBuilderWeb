import { describe, expect, it } from 'vitest'
import { estimateEffort, mergeXi, parseRequirement, planObjectives, requiredSlots, type Objective } from './objectives'

function objective(id: string, patch: Partial<Objective> = {}): Objective {
  return { id, name: id, group: 'Weekly', requirements: [], rewardValue: 1000, sp: 0, webAppDoable: false, ...patch }
}

describe('objectives', () => {
  it('aynı XI ile sağlanabilen objective\'leri gruplar', () => {
    const plan = planObjectives([
      objective('a', { requirements: [{ kind: 'XI_LEAGUE', value: 'Premier League', count: 1 }] }),
      objective('b', { requirements: [{ kind: 'XI_LEAGUE', value: "Women's Super League", count: 1 }] }),
    ])
    expect(plan.groups).toHaveLength(1)
    expect(plan.groups[0].xiSlots).toBe(2)
  })

  it('XI\'ye sığmayan şartları ayrı gruplara böler', () => {
    const plan = planObjectives([
      objective('a', { requirements: [{ kind: 'XI_LEAGUE', value: 'Premier League', count: 8 }] }),
      objective('b', { requirements: [{ kind: 'XI_LEAGUE', value: 'La Liga', count: 5 }] }),
    ])
    expect(plan.groups).toHaveLength(2)
  })

  it('farklı türde şartlar aynı oyuncularla sağlanabilir', () => {
    const xi = mergeXi([[{ kind: 'XI_LEAGUE', value: 'Premier League', count: 6 }], [{ kind: 'XI_NATION', value: 'Brazil', count: 5 }]])
    expect(requiredSlots(xi)).toBe(6)
  })

  it('web app\'te yapılabilenleri ayırır ve süresi yakın olanı öne alır', () => {
    const plan = planObjectives([
      objective('web2', { webAppDoable: true, expiresAt: '2026-11-10' }),
      objective('web1', { webAppDoable: true, expiresAt: '2026-11-01' }),
      objective('late', { requirements: [{ kind: 'PLAY_MATCHES', count: 3 }], expiresAt: '2026-12-01' }),
      objective('soon', { requirements: [{ kind: 'GOALS', count: 10 }], expiresAt: '2026-11-05', rewardValue: 10 }),
    ])
    expect(plan.web.map((o) => o.id)).toEqual(['web1', 'web2'])
    expect(plan.groups[0].objectives.some((o) => o.id === 'soon')).toBe(true)
  })

  it('maç çabasını şartlardan tahmin eder; grup çabası en büyüğüdür', () => {
    expect(estimateEffort(objective('g', { requirements: [{ kind: 'GOALS', count: 5 }] }))).toBe(3)
    const plan = planObjectives([
      objective('g', { requirements: [{ kind: 'GOALS', count: 4 }] }),
      objective('m', { requirements: [{ kind: 'PLAY_MATCHES', count: 5 }] }),
    ])
    expect(plan.groups).toHaveLength(1)
    expect(plan.groups[0].effortMatches).toBe(5)
  })

  it('şart satırını çözer', () => {
    expect(parseRequirement('XI_LEAGUE:Premier League:1')).toEqual({ kind: 'XI_LEAGUE', value: 'Premier League', count: 1 })
    expect(parseRequirement('GOALS:3')).toEqual({ kind: 'GOALS', count: 3 })
    expect(parseRequirement('YANLIS:3')).toBeUndefined()
  })
})

describe('xi metni', () => {
  it('yazılıp geri çözülür', async () => {
    const { xiToText, parseXiText } = await import('./objectives')
    const text = xiToText([{ kind: 'XI_LEAGUE', value: 'Premier League', count: 1 }, { kind: 'XI_NATION', value: 'Brazil', count: 2 }])
    expect(parseXiText(text)).toEqual({ league: { 'Premier League': 1 }, nationality: { Brazil: 2 }, club: {} })
  })
})
