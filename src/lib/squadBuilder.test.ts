import { describe, expect, it } from 'vitest'
import type { FormationSlot, Role, RoleAlternative } from '../api/types'
import { eaRoleKey } from './eaRoles'
import { firstFocus, ovrBand, rankRoleGroups, remapAssignments, roleGroups, swapSlots } from './squadBuilder'

const role = (id: string, name: string, focus: string, positions: string[]): Role => ({ id, baseRole: name, name: `${name} (${focus})`, positions, focus, weapons: [], accelerate: [], movementTags: [] })
const slot = (slotId: string, position: string): FormationSlot => ({ slotId, position, group: position, defaultRole: '', x: 0, y: 0 })

describe('squad builder yardımcıları', () => {
  it('roller aileye göre gruplanır ve yalnızca mevkideki roller gelir', () => {
    const roles = [
      role('stopper_balanced', 'Stopper', 'Balanced', ['CB']),
      role('stopper_aggressive', 'Stopper', 'Aggressive', ['CB']),
      role('poacher_attack', 'Poacher', 'Attack', ['ST']),
    ]
    const allowed = new Set([eaRoleKey('CB', 'Stopper', 'Balanced'), eaRoleKey('CB', 'Stopper', 'Aggressive'), eaRoleKey('ST', 'Poacher', 'Attack')])
    const groups = roleGroups(roles, 'CB', allowed)
    expect(groups).toHaveLength(1)
    expect(groups[0].options.map((o) => o.focus)).toEqual(['Balanced', 'Aggressive'])
    expect(firstFocus(groups[0]).roleId).toBe('stopper_balanced')
  })

  it('EA listesi yüklenmediyse rol seçici kilitli: hiçbir rol uydurulmaz (TAC-10)', () => {
    expect(roleGroups([role('stopper_balanced', 'Stopper', 'Balanced', ['CB'])], 'CB', undefined)).toEqual([])
  })

  it('focus (mevki, rol) bazında süzülür: RM Winger Versatile oyunda yok', () => {
    const roles = [role('winger_balanced', 'Winger', 'Balanced', ['RM', 'RW']), role('winger_versatile', 'Winger', 'Versatile', ['RM', 'RW'])]
    const allowed = new Set([eaRoleKey('RM', 'Winger', 'Balanced'), eaRoleKey('RW', 'Winger', 'Balanced'), eaRoleKey('RW', 'Winger', 'Versatile')])
    expect(roleGroups(roles, 'RM', allowed)[0].options.map((o) => o.focus)).toEqual(['Balanced'])
    expect(roleGroups(roles, 'RW', allowed)[0].options.map((o) => o.focus)).toEqual(['Balanced', 'Versatile'])
  })

  it('OVR bandı eşikleri', () => {
    expect(ovrBand(80)).toBe('var(--ovr-80)')
    expect(ovrBand(70)).toBe('var(--ovr-70)')
    expect(ovrBand(65)).toBe('var(--ovr-65)')
    expect(ovrBand(60)).toBe('var(--ovr-60)')
    expect(ovrBand(59)).toBe('var(--ovr-low)')
  })

  it('formasyon değişiminde uyumlu oyuncu yerinde kalır, diğeri boş uyumlu slota geçer, sığmayan düşer', () => {
    const positions: Record<number, string[]> = { 1: ['ST'], 2: ['CAM'], 3: ['GK'] }
    const next = remapAssignments({ ST: 1, CAM: 2, GK: 3 }, (id) => positions[id], [slot('ST', 'ST'), slot('CAM2', 'CAM')])
    expect(next).toEqual({ ST: 1, CAM2: 2 })
  })

  it('sürükle-bırak: iki slotun oyuncuları yer değiştirir, boş slota taşınır, aynı slotta değişmez', () => {
    expect(swapSlots({ A: 1, B: 2 }, 'A', 'B')).toEqual({ A: 2, B: 1 })
    expect(swapSlots({ A: 1 }, 'A', 'B')).toEqual({ B: 1 })
    expect(swapSlots({ B: 2 }, 'A', 'B')).toEqual({ A: 2 })
    const same = { A: 1 }
    expect(swapSlots(same, 'A', 'A')).toBe(same)
  })

  it('FIT-2 madde 6: rol grupları ve odaklar oyuncuya göre (Rol oturması, yoksa Güç) en uygun önce; bilinmeyen rol sonda, sıra korunur', () => {
    const groups = [
      { base: 'Winger', options: [{ focus: 'Balanced', roleId: 'w_b' }, { focus: 'Attack', roleId: 'w_a' }] },
      { base: 'Wide Playmaker', options: [{ focus: 'Attack', roleId: 'wp_a' }] },
      { base: 'Inside Forward', options: [{ focus: 'Balanced', roleId: 'if_b' }, { focus: 'Attack', roleId: 'if_a' }] },
    ]
    const fits = new Map([
      ['w_b', { roleId: 'w_b', roleName: 'W', currentFit: 60, levelFit: 40 }],
      ['w_a', { roleId: 'w_a', roleName: 'W', currentFit: 62, levelFit: 48 }],
      ['if_b', { roleId: 'if_b', roleName: 'IF', currentFit: 66, levelFit: 60 }],
      ['if_a', { roleId: 'if_a', roleName: 'IF', currentFit: 70, levelFit: 71 }],
    ])
    const ranked = rankRoleGroups(groups, fits)
    expect(ranked.map((g) => g.base)).toEqual(['Inside Forward', 'Winger', 'Wide Playmaker'])
    expect(ranked[0].options.map((o) => o.roleId)).toEqual(['if_a', 'if_b'])
    expect(ranked[1].options.map((o) => o.roleId)).toEqual(['w_a', 'w_b'])
    expect(rankRoleGroups(groups, undefined)).toBe(groups)
    // İnceleme: normsuz rol (yalnız Güç, mutlak ölçek) oturmalı rollerin önüne geçmez.
    const withUnnormed = new Map<string, RoleAlternative>([...fits, ['wp_a', { roleId: 'wp_a', roleName: 'WP', currentFit: 90, levelFit: null }]])
    expect(rankRoleGroups(groups, withUnnormed).map((g) => g.base)).toEqual(['Inside Forward', 'Winger', 'Wide Playmaker'])
  })
})
