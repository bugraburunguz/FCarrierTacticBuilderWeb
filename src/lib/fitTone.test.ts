import { describe, expect, it } from 'vitest'
import { FIT_STATE_OF, toneOf } from './fitTone'

describe('v3 rozet tonu (AT_LEVEL → badge boş)', () => {
  it('badge yoksa NEUTRAL, varsa kendisi', () => {
    expect(toneOf(undefined)).toBe('NEUTRAL')
    expect(toneOf(null)).toBe('NEUTRAL')
    expect(toneOf('GREEN')).toBe('GREEN')
    expect(toneOf('RED')).toBe('RED')
  })
  it('FitState eşlemesi: NEUTRAL → neutral, diğerleri değişmez', () => {
    expect(FIT_STATE_OF.NEUTRAL).toBe('neutral')
    expect(FIT_STATE_OF.GREEN).toBe('good')
    expect(FIT_STATE_OF.YELLOW).toBe('ok')
    expect(FIT_STATE_OF.RED).toBe('bad')
  })
})
