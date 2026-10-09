import { describe, expect, it } from 'vitest'
import { parseChallengeText } from './sbcText'

describe('parseChallengeText', () => {
  it('EA ekranı metnini normalleştirilmiş şartlara çevirir', () => {
    const { requirements, unknown } = parseChallengeText(`
      Min. Team Rating: 83
      Min. Team Chemistry: 14
      # of Players in the Squad: Min 11
      Same Club Count: Max 3
      Nations in Squad: Min 2
      Player Quality: Min Silver
      Players from League: Premier League: Min 2
      Weird Rule: 5
    `)
    expect(requirements).toEqual([
      { kind: 'TEAM_RATING', op: 'MIN', value: 83 },
      { kind: 'CHEMISTRY', op: 'MIN', value: 14 },
      { kind: 'SAME_CLUB', op: 'MAX', value: 3 },
      { kind: 'NATION_COUNT', op: 'MIN', value: 2 },
      { kind: 'QUALITY', op: 'MIN', value: 2 },
      { kind: 'FROM', op: 'MIN', value: 2, refs: [{ kind: 'LEAGUE', id: 0, name: 'Premier League' }] },
    ])
    expect(unknown).toEqual(['Weird Rule: 5'])
  })

  it('tür öneki yoksa lig varsayılır; sayısı olmayan şart bilinmeyene düşer', () => {
    const { requirements, unknown } = parseChallengeText('Players from Brazil: Min 1\nSame Nation Count')
    expect(requirements[0]).toMatchObject({ kind: 'FROM', refs: [{ kind: 'LEAGUE', name: 'Brazil' }] })
    expect(unknown).toEqual(['Same Nation Count'])
  })
})
