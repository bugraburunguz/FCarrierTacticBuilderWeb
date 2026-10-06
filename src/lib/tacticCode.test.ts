import { describe, expect, it } from 'vitest'
import type { BehaviorTag, Formation, Role } from '../api/types'
import type { TacticState } from '../state/tacticStore'
import { decodeTactic, encodeTactic, TacticCodeError, type TacticCatalog } from './tacticCode'

const slot = (slotId: string, group: string) => ({ slotId, position: group, group, defaultRole: 'x', x: 50, y: 50 })
const tag = (id: string, position: string): BehaviorTag => ({ id, position, label: id, weaponAttrs: [], expectedMin: 0, modifier: false, conflicts: [] })
const role = (id: string): Role => ({ id, baseRole: id, name: id, positions: [], focus: 'Balanced', weapons: [], accelerate: [], movementTags: [] })

const catalog: TacticCatalog = {
  formations: [
    { id: '4-4-2', slots: [slot('GK', 'GK'), slot('LST', 'ST'), slot('RST', 'ST')] } as Formation,
    { id: '4-3-3', slots: [slot('GK', 'GK'), slot('ST', 'ST')] } as Formation,
  ],
  roles: [role('poacher'), role('target_forward'), role('goalkeeper')],
  tags: [tag('st_target', 'ST'), tag('st_press', 'ST'), tag('st_run_behind', 'ST'), tag('gk_sweep', 'GK')],
}

const state: TacticState = {
  formation: '4-4-2',
  slots: { LST: { tags: ['st_press', 'st_target'], roleId: 'poacher' }, GK: { tags: ['gk_sweep'] } },
  setup: { buildUp: 'Counter', depth: 73 },
}

describe('tactic code', () => {
  it('round-trips formation, roles, tags and setup', () => {
    const decoded = decodeTactic(encodeTactic(state, catalog), catalog)
    expect(decoded.formation).toBe('4-4-2')
    expect(decoded.setup).toEqual({ buildUp: 'Counter', depth: 73 })
    expect(decoded.slots.LST.roleId).toBe('poacher')
    expect([...decoded.slots.LST.tags].sort()).toEqual(['st_press', 'st_target'])
    expect(decoded.slots.GK.tags).toEqual(['gk_sweep'])
    expect(decoded.slots.RST).toBeUndefined()
  })

  it('omits the setup when none was chosen', () => {
    const decoded = decodeTactic(encodeTactic({ formation: '4-3-3', slots: {} }, catalog), catalog)
    expect(decoded.setup).toBeUndefined()
    expect(decoded.formation).toBe('4-3-3')
  })

  it('is deterministic and case sensitive', () => {
    const code = encodeTactic(state, catalog)
    expect(encodeTactic(state, catalog)).toBe(code)
    expect(() => decodeTactic(code.toUpperCase(), catalog)).toThrow(TacticCodeError)
  })

  it('rejects typos through the checksum and foreign codes', () => {
    const code = encodeTactic(state, catalog)
    const index = PREFIX_LENGTH + 5
    const flipped = code.slice(0, index) + (code[index] === 'A' ? 'B' : 'A') + code.slice(index + 1)
    expect(() => decodeTactic(flipped, catalog)).toThrow(TacticCodeError)
    expect(() => decodeTactic('RZtRyXrXbt%T', catalog)).toThrow(/FCK1/)
    expect(() => decodeTactic('FCK1.AB', catalog)).toThrow(TacticCodeError)
  })
})

const PREFIX_LENGTH = 'FCK1.'.length
