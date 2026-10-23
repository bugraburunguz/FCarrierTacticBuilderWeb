import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { CareerPlayer } from '../../api/types'
import { LAB_KEY, labStore } from '../../state/labStore'
import { useLabBinding } from './useLabBinding'

const squad = [
  { player: { id: 1, name: 'Kaleci', overall: 66, positions: ['GK'] }, onLoan: false },
  { player: { id: 9, name: 'Forvet', overall: 63, positions: ['ST'] }, onLoan: false },
] as unknown as CareerPlayer[]

/** KARIYER-UX FAZ 4a (D-28): Lab kurucusu yalnız aktif taslağa yazar; eski tek kopya depo (fc.tactic, fc.lineup) hiç yazılmaz. */
describe('useLabBinding', () => {
  beforeEach(() => {
    localStorage.clear()
    labStore.reload()
  })

  it('durum aktif taslaktan; kurucu değişikliği taslağa yazılır ve taslak kirlenir', () => {
    const created = labStore.create(7, { name: 'Deneme', origin: { kind: 'main', ref: '1' }, tactic: { formation: '4-4-2', slots: {} }, lineup: { GK: 1 } })
    if (!created.ok) throw new Error('taslak açılamadı')
    labStore.markSaved(7, created.draft.id, 1)
    const { result } = renderHook(() => useLabBinding(7, squad))
    expect(result.current.binding.state.formationId).toBe('4-4-2')
    expect(result.current.binding.state.assigned).toEqual({ GK: 1 })
    expect(result.current.draft?.dirty).toBe(false)

    act(() => result.current.binding.patch((cur) => ({ assigned: { ...cur.assigned, LST: 9 }, roleOverride: { LST: 'poacher_attack' } })))
    const draft = labStore.get(7).drafts[0]
    expect(draft.lineup).toEqual({ GK: 1, LST: 9 })
    expect(draft.tactic.slots.LST).toEqual({ tags: [], roleId: 'poacher_attack' })
    expect(draft.dirty).toBe(true)
    expect(result.current.binding.state.assigned).toEqual({ GK: 1, LST: 9 })
    expect(localStorage.getItem('fc.tactic')).toBeNull()
    expect(localStorage.getItem('fc.lineup')).toBeNull()
  })

  it('taslak yoksa patch hiçbir şey yazmaz', () => {
    const { result } = renderHook(() => useLabBinding(7, squad))
    expect(result.current.draft).toBeUndefined()
    act(() => result.current.binding.patch({ formationId: '3-5-2' }))
    expect(localStorage.getItem(LAB_KEY)).toBeNull()
  })
})
