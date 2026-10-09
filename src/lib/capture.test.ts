import { describe, expect, it } from 'vitest'
import type { CaptureCard, CaptureObjectiveGroup } from '../api/types'
import { toPlannerObjectives, toSbcPool } from './capture'

function card(patch: Partial<CaptureCard>): CaptureCard {
  return { instanceId: 1, assetId: 1, rating: 80, positions: ['ST'], teamId: 1, leagueId: 1, nation: 1, untradeable: false, faceLabels: [], faceStats: [], duplicate: false, pile: 'club', ...patch }
}

const groups: CaptureObjectiveGroup[] = [
  {
    groupId: 1,
    name: 'Weekly Objectives',
    gameMode: 'CLUB',
    endTime: 1_821_139_200,
    rewards: [],
    objectives: [
      { id: 1, name: 'Score 10 goals', progress: 4, total: 10, status: 'IN_PROGRESS', lockedBy: [], rewards: [{ type: 'coin', value: 500, count: 2 }] },
      { id: 2, name: 'Complete an SBC', progress: 0, total: 1, status: 'IN_PROGRESS', lockedBy: [], rewards: [] },
      { id: 3, name: 'Locked one', progress: 0, total: 1, status: 'IN_PROGRESS', lockedBy: [9], rewards: [] },
      { id: 4, name: 'Done', progress: 1, total: 1, status: 'COMPLETED', lockedBy: [], rewards: [] },
    ],
  },
  { groupId: 2, name: 'Career thing', gameMode: 'CAREER_MANAGER', rewards: [], objectives: [{ id: 5, name: 'Play 3 matches', progress: 0, total: 3, status: 'IN_PROGRESS', lockedBy: [], rewards: [] }] },
]

describe('capture mapping', () => {
  it('devam eden ve kilidi açık objective\'leri kalan ilerlemeyle planlayıcıya çevirir', () => {
    const result = toPlannerObjectives(groups, { gameModes: ['CLUB'] })
    expect(result.map((o) => o.id)).toEqual(['1-1', '1-2'])
    expect(result[0].requirements[0]).toEqual({ kind: 'GOALS', count: 6 })
    expect(result[0].rewardValue).toBe(1000)
    expect(result[0].group).toBe('Weekly')
    expect(result[0].expiresAt).toBe('2027-09-17')
    expect(result[1].webAppDoable).toBe(true)
  })

  it('mod filtresi yoksa tüm modları alır', () => {
    expect(toPlannerObjectives(groups).map((o) => o.id)).toContain('2-5')
  })

  it('kulüp kartlarını rating, tür ve untradeable\'a göre gruplar; fiyatı ortalamadan alır', () => {
    const pool = toSbcPool([
      card({ rating: 82, marketAverage: 1000 }),
      card({ rating: 82, marketAverage: 2000 }),
      card({ rating: 82, untradeable: true }),
      card({ rating: 91, cardType: 'ICON' }),
      card({ rating: 30 }),
    ])
    const tradeable = pool.find((p) => p.rating === 82 && !p.untradeable)!
    expect(tradeable.count).toBe(2)
    expect(tradeable.priceEach).toBe(1500)
    expect(pool.find((p) => p.untradeable)!.priceEach).toBeUndefined()
    expect(pool.find((p) => p.rarity === 'ICON')).toBeDefined()
    expect(pool.some((p) => p.rating === 30)).toBe(false)
  })
})

describe('toPlannerObjectives ana görev / alt görev', () => {
  it('alt görevleri ana göreve bağlar, ana ödülü son alt göreve ekler', () => {
    const group = {
      groupId: 7,
      name: 'Weekly',
      rewards: [{ type: 'coin', value: 1000, count: 1 }],
      objectives: [
        { id: 1, name: 'A', progress: 1, total: 1, status: 'COMPLETED', lockedBy: [], rewards: [] },
        { id: 2, name: 'B', progress: 0, total: 2, status: 'IN_PROGRESS', lockedBy: [1], rewards: [{ type: 'coin', value: 200, count: 1 }] },
        { id: 3, name: 'C', progress: 0, total: 3, status: 'IN_PROGRESS', lockedBy: [], rewards: [{ type: 'coin', value: 300, count: 1 }] },
      ],
    } as unknown as Parameters<typeof toPlannerObjectives>[0][number]
    const result = toPlannerObjectives([group])
    expect(result.map((o) => o.name)).toEqual(['B', 'C'])
    expect(result[0]).toMatchObject({ parentId: '7', parentName: 'Weekly', subIndex: 2, subTotal: 3, subDone: 1 })
    expect(result[0].rewardValue).toBe(200)
    expect(result[1].rewardValue).toBe(1300)
  })
})
