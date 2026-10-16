import { describe, expect, it } from 'vitest'
import { LEAGUE_LEVEL_BAND, leagueLevel } from './leagueLevel'

describe('Lig seviyesi göstergesi (V3-06c)', () => {
  it('fark ±2 içindeyse "Lig seviyesinde"; eşik tek yerde', () => {
    expect(LEAGUE_LEVEL_BAND).toBe(2)
    expect(leagueLevel(64, 62)).toEqual({ kind: 'at', diff: 2, text: 'Lig seviyesinde' })
    expect(leagueLevel(60, 62)).toEqual({ kind: 'at', diff: -2, text: 'Lig seviyesinde' })
    expect(leagueLevel(62, 62)?.kind).toBe('at')
  })

  it('üstünde +N, altında −N (gerçek eksi işareti)', () => {
    expect(leagueLevel(70, 62)).toEqual({ kind: 'above', diff: 8, text: 'Ligin üstünde (+8)' })
    expect(leagueLevel(55, 62)).toEqual({ kind: 'below', diff: -7, text: 'Ligin altında (−7)' })
  })

  it('lig gücü bilinmiyorsa gösterge yok', () => {
    expect(leagueLevel(70, undefined)).toBeUndefined()
  })
})
