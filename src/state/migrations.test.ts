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

    /** KARIYER-UX FAZ 1: tek kopya fc.tactic + fc.lineup → kariyere göre Lab taslağı (bir kez). Eski anahtarlar v2 için kalır. */
    it('tek kopya taslak, dizilişi olan her kariyere "Önceki taslak" olarak bir kez taşınır', () => {
      const tactic = { formation: '4-4-2', setup: { buildUp: 'Short', depth: 60 }, slots: { LST: { tags: [], roleId: 'poacher_attack' } } }
      localStorage.setItem('fc.tactic', JSON.stringify(tactic))
      localStorage.setItem('fc.lineup', JSON.stringify({ '3': { LST: 9 }, '5': { GK: 1 }, '8': {} }))
      runStorageMigrations(localStorage)

      const lab = JSON.parse(localStorage.getItem('fc.lab.v1')!)
      expect(Object.keys(lab).sort()).toEqual(['3', '5'])
      expect(lab['3'].drafts).toHaveLength(1)
      expect(lab['3'].drafts[0]).toMatchObject({ name: 'Önceki taslak', origin: { kind: 'blank', ref: 'fc.tactic' }, tactic, lineup: { LST: 9 }, dirty: true })
      expect(lab['3'].activeId).toBe(lab['3'].drafts[0].id)
      expect(lab['5'].drafts[0].lineup).toEqual({ GK: 1 })
      expect(localStorage.getItem('fc.tactic')).not.toBeNull()

      runStorageMigrations(localStorage)
      expect(JSON.parse(localStorage.getItem('fc.lab.v1')!)['3'].drafts).toHaveLength(1)
    })

    it('dizilişi olan kariyer yoksa yalnız etkin kariyere; taslak yoksa hiçbir şey yazılmaz', () => {
      localStorage.setItem('fc.tactic', JSON.stringify({ formation: '4-3-3', slots: {} }))
      localStorage.setItem('fc.career', '12')
      runStorageMigrations(localStorage)
      expect(Object.keys(JSON.parse(localStorage.getItem('fc.lab.v1')!))).toEqual(['12'])

      localStorage.clear()
      runStorageMigrations(localStorage)
      expect(localStorage.getItem('fc.lab.v1')).toBeNull()
    })
  })
})
