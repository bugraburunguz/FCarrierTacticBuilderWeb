import { describe, expect, it } from 'vitest'
import type { FormationSlot, Role } from '../api/types'
import { firstFocus, ovrBand, remapAssignments, roleGroups } from './squadBuilder'

const role = (id: string, name: string, focus: string, positions: string[]): Role => ({ id, baseRole: name, name: `${name} (${focus})`, positions, focus, weapons: [], accelerate: [], movementTags: [] })
const slot = (slotId: string, position: string): FormationSlot => ({ slotId, position, group: position, defaultRole: '', x: 0, y: 0 })

describe('squad builder yardımcıları', () => {
  it('roller aileye göre gruplanır ve yalnızca mevkideki roller gelir', () => {
    const roles = [
      role('stopper_balanced', 'Stopper', 'Balanced', ['CB']),
      role('stopper_aggressive', 'Stopper', 'Aggressive', ['CB']),
      role('poacher_attack', 'Poacher', 'Attack', ['ST']),
    ]
    const groups = roleGroups(roles, 'CB')
    expect(groups).toHaveLength(1)
    expect(groups[0].options.map((o) => o.focus)).toEqual(['Balanced', 'Aggressive'])
    expect(firstFocus(groups[0]).roleId).toBe('stopper_balanced')
  })

  it('OVR bandı eşikleri', () => {
    expect(ovrBand(80)).toBe('#0e9b52')
    expect(ovrBand(65)).toBe('#86b81f')
    expect(ovrBand(59)).toBe('#d47a24')
  })

  it('formasyon değişiminde uyumlu oyuncu yerinde kalır, diğeri boş uyumlu slota geçer, sığmayan düşer', () => {
    const positions: Record<number, string[]> = { 1: ['ST'], 2: ['CAM'], 3: ['GK'] }
    const next = remapAssignments({ ST: 1, CAM: 2, GK: 3 }, (id) => positions[id], [slot('ST', 'ST'), slot('CAM2', 'CAM')])
    expect(next).toEqual({ ST: 1, CAM2: 2 })
  })
})
