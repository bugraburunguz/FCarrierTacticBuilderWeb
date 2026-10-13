import { describe, expect, it } from 'vitest'
import { modeForPath } from './modeStore'

describe('modeForPath (WEB-BUG-07)', () => {
  it('UT yolları ut moduna, kariyer yolları career moduna zorlar', () => {
    expect(modeForPath('/ut/sbc')).toBe('ut')
    expect(modeForPath('/ut')).toBe('ut')
    expect(modeForPath('/career/desk')).toBe('career')
    expect(modeForPath('/squad/builder')).toBe('career')
    expect(modeForPath('/tactics/wizard')).toBe('career')
  })

  it('ortak sayfalarda mod değişmez', () => {
    expect(modeForPath('/')).toBeUndefined()
    expect(modeForPath('/players')).toBeUndefined()
    expect(modeForPath('/profile')).toBeUndefined()
    expect(modeForPath('/utensil')).toBeUndefined()
  })
})
