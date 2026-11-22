import { describe, expect, it } from 'vitest'
import type { Career } from '../api/types'
import { resolveActiveCareer } from './activeCareer'

const list = [{ id: 3 }, { id: 5 }] as Career[]

/** FCA-35 W1: sayfa sorguları kariyer listesini beklemez; saklı kimlikle hemen başlar, liste gelince doğrulanır. */
describe('resolveActiveCareer', () => {
  it('liste gelmeden saklı kimlik kullanılır', () => {
    expect(resolveActiveCareer(undefined, 5)).toEqual({ career: undefined, id: 5 })
  })

  it('liste geldiğinde saklı kimlik listede varsa o kariyer', () => {
    expect(resolveActiveCareer(list, 5)).toEqual({ career: list[1], id: 5 })
  })

  it('saklı kimlik listede yoksa (silinmiş, başka hesap) ilk kariyere düşer', () => {
    expect(resolveActiveCareer(list, 9)).toEqual({ career: list[0], id: 3 })
  })

  it('liste boşsa kimlik yok; saklı kimlik de yoksa beklenir', () => {
    expect(resolveActiveCareer([], 5)).toEqual({ career: undefined, id: undefined })
    expect(resolveActiveCareer(undefined, undefined)).toEqual({ career: undefined, id: undefined })
  })
})
