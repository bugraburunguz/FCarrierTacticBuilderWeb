import { describe, expect, it } from 'vitest'
import type { ReplicaApplyResult, ReplicaSummary, TacticCodeImport } from '../../api/types'
import { lineupFromApply, tacticFromCode, tacticFromReplica } from './labSources'

const replica = {
  id: 'barca-2011', club: 'Barcelona', season: '2010/11', formationId: '4-3-3', eaFormation: '4-3-3', buildUp: 'SHORT_PASSING', defensiveApproach: 'HIGH', lineHeight: 72,
  slots: [{ slotId: 'ST', position: 'ST', role: 'False 9', focus: 'Build-Up', roleId: 'false_nine_buildup' }, { slotId: 'GK', position: 'GK', role: 'Sweeper Keeper', focus: 'Balanced', roleId: 'sweeper_keeper_balanced' }],
} as unknown as ReplicaSummary

/** KARIYER-UX FAZ 4b: Lab taslağının kaynakları (replika, EA kodu) tek taktik modeline (TacticState) çevrilir. */
describe('Lab taslak kaynakları', () => {
  it('replika → formasyon, slot rolleri, oyun kurulumu ve hat yüksekliği', () => {
    expect(tacticFromReplica(replica)).toEqual({
      formation: '4-3-3', setup: { buildUp: 'Short', depth: 72 },
      slots: { ST: { tags: [], roleId: 'false_nine_buildup' }, GK: { tags: [], roleId: 'sweeper_keeper_balanced' } },
    })
    expect(tacticFromReplica({ ...replica, buildUp: 'COUNTER' } as ReplicaSummary).setup?.buildUp).toBe('Counter')
    expect(tacticFromReplica({ ...replica, buildUp: 'BALANCED' } as ReplicaSummary).setup?.buildUp).toBe('Balanced')
  })

  it('replika uygulama sonucu (kariyer kadrosu) → diziliş; oyuncusuz slot yazılmaz', () => {
    const result = { slots: [{ slotId: 'ST', player: { id: 9 } }, { slotId: 'GK', player: null }] } as unknown as ReplicaApplyResult
    expect(lineupFromApply(result)).toEqual({ ST: 9 })
  })

  it('EA kodu → formasyon, roller ve kurulum', () => {
    const code = { formation: '4-4-2', buildUp: 'Counter', depth: 35, exact: true, warnings: [], slots: [{ slotId: 'LST', roleId: 'poacher_attack', roleName: 'Poacher' }] } as unknown as TacticCodeImport
    expect(tacticFromCode(code)).toEqual({ formation: '4-4-2', setup: { buildUp: 'Counter', depth: 35 }, slots: { LST: { tags: [], roleId: 'poacher_attack' } } })
  })
})
