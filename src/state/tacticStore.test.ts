import { describe, expect, it } from 'vitest'
import { DEFAULT_TACTIC, lockedBy, tacticStore, toTacticRequest } from './tacticStore'

describe('tacticStore', () => {
  it('persists to localStorage and restores on reload', () => {
    tacticStore.set({ formation: '4-4-2', presetId: 'gegenpress', slots: { LB: { tags: ['fb_overlap'] } } })

    tacticStore.reload()

    expect(tacticStore.get().formation).toBe('4-4-2')
    expect(tacticStore.get().slots.LB.tags).toEqual(['fb_overlap'])
  })

  it('falls back to the default tactic on corrupt storage', () => {
    localStorage.setItem('fc.tactic', '{not json')

    tacticStore.reload()

    expect(tacticStore.get()).toEqual(DEFAULT_TACTIC)
  })

  it('maps the slot record to the API request shape', () => {
    const request = toTacticRequest({ formation: '4-3-3', presetId: 'p', slots: { ST: { tags: ['st_target'], roleId: 'target_forward_attack' }, GK: { tags: [] } } })

    expect(request).toEqual({
      formation: '4-3-3',
      presetId: 'p',
      slots: [
        { slotId: 'ST', tags: ['st_target'], roleId: 'target_forward_attack' },
        { slotId: 'GK', tags: [], roleId: undefined },
      ],
    })
  })

  it('locks tags that conflict with the selected ones', () => {
    const conflicts: Record<string, string[]> = { a: ['b'], b: ['a'], c: [] }

    const locked = lockedBy(['a'], (id) => conflicts[id] ?? [])

    expect([...locked]).toEqual(['b'])
  })
})
