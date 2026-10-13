import { beforeEach, describe, expect, it } from 'vitest'
import { migrateAssignments, migrateTacticState, migrateUtSquad, runStorageMigrations } from './migrations'

describe('5-3-2 CM → CDM slot taşıması (TAC-09)', () => {
  it('taktikte slot, etiket ve geçersiz rol taşınır; geçerli rol korunur', () => {
    const moved = migrateTacticState({
      formation: '5-3-2',
      slots: { CM: { tags: ['cm_deep_build', 'cm_late_run'], roleId: 'box_to_box_balanced' }, LCM: { tags: ['cm_engine'] } },
    })
    expect(moved.slots.CM).toBeUndefined()
    expect(moved.slots.CDM).toEqual({ tags: ['cdm_deep_build'], roleId: undefined })
    expect(moved.slots.LCM).toEqual({ tags: ['cm_engine'] })

    const kept = migrateTacticState({ formation: '5-3-2', slots: { CM: { tags: [], roleId: 'holding_defend' } } })
    expect(kept.slots.CDM.roleId).toBe('holding_defend')
  })

  it('diğer formasyonlara dokunmaz', () => {
    const state = { formation: '4-3-3', slots: { CM: { tags: ['cm_deep_build'] } } }
    expect(migrateTacticState(state)).toBe(state)
  })

  it('kariyer yerleşimi ve UT kadrosu taşınır', () => {
    expect(migrateAssignments({ '1': { CM: 7, GK: 1 } }, '5-3-2')).toEqual({ '1': { CDM: 7, GK: 1 } })
    expect(migrateAssignments({ '1': { CM: 7 } }, '4-3-3')).toEqual({ '1': { CM: 7 } })
    const ut = migrateUtSquad({ formationId: '5-3-2', picked: { CM: { name: 'x' }, GK: { name: 'y' } }, roleOverride: { CM: 'box_to_box_balanced' } })
    expect(Object.keys(ut.picked).sort()).toEqual(['CDM', 'GK'])
    expect(ut.roleOverride).toEqual({})
  })

  describe('depolama', () => {
    beforeEach(() => localStorage.clear())

    it('kayıtlı veriler bir kez dönüştürülür', () => {
      localStorage.setItem('fc.tactic', JSON.stringify({ formation: '5-3-2', slots: { CM: { tags: ['cm_ball_winner'] } } }))
      localStorage.setItem('fc.lineup', JSON.stringify({ '3': { CM: 9 } }))
      runStorageMigrations(localStorage)
      expect(JSON.parse(localStorage.getItem('fc.tactic')!).slots.CDM.tags).toEqual(['cdm_destroyer'])
      expect(JSON.parse(localStorage.getItem('fc.lineup')!)).toEqual({ '3': { CDM: 9 } })

      localStorage.setItem('fc.lineup', JSON.stringify({ '3': { CM: 9 } }))
      runStorageMigrations(localStorage)
      expect(JSON.parse(localStorage.getItem('fc.lineup')!)).toEqual({ '3': { CM: 9 } })
    })
  })
})
