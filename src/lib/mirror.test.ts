import { describe, expect, it } from 'vitest'
import { mirrorTactic } from './mirror'

describe('mirrorTactic', () => {
  it('swaps left and right slot selections and keeps central slots', () => {
    const mirrored = mirrorTactic({
      formation: '4-3-3',
      slots: { RW: { tags: ['w_cross'] }, LW: { tags: ['w_cut_inside'], roleId: 'inside_forward_balanced' }, ST: { tags: ['st_poacher'] } },
    })

    expect(mirrored.slots.LW).toEqual({ tags: ['w_cross'] })
    expect(mirrored.slots.RW).toEqual({ tags: ['w_cut_inside'], roleId: 'inside_forward_balanced' })
    expect(mirrored.slots.ST).toEqual({ tags: ['st_poacher'] })
  })

  it('moves a one-sided selection to the other side', () => {
    const mirrored = mirrorTactic({ formation: '4-3-3', slots: { RB: { tags: ['fb_overlap'] } } })

    expect(mirrored.slots.LB).toEqual({ tags: ['fb_overlap'] })
    expect(mirrored.slots.RB).toBeUndefined()
  })
})
