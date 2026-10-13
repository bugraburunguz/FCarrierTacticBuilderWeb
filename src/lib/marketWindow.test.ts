import { describe, expect, it } from 'vitest'
import { marketWindow } from './sbcTraditional'

describe('marketWindow (WEB-BUG-02)', () => {
  it('rating şartı varsa etrafında pencere, pahalıdan ucuza', () => {
    expect(marketWindow(84, {})).toEqual({ ovrMin: 76, ovrMax: 90, order: 'desc' })
  })

  it('rating şartı yoksa pencere 0..6 değil: kalite tabanından 99\'a, ucuzdan pahalıya', () => {
    expect(marketWindow(0, {})).toEqual({ ovrMin: 45, ovrMax: 99, order: 'asc' })
    expect(marketWindow(0, { minQuality: 3 })).toEqual({ ovrMin: 75, ovrMax: 99, order: 'asc' })
  })

  it('en çok kalite tavanı pencereyi daraltır (Max Gümüş = 74)', () => {
    expect(marketWindow(0, { maxQuality: 2 })).toEqual({ ovrMin: 45, ovrMax: 74, order: 'asc' })
    expect(marketWindow(80, { maxQuality: 2 })).toEqual({ ovrMin: 72, ovrMax: 74, order: 'desc' })
  })
})
