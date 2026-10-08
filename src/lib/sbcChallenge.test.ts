import { describe, expect, it } from 'vitest'
import type { Formation, SbcChallenge } from '../api/types'
import { challengeSetup, describeRequirement } from './sbcChallenge'

const formations: Formation[] = [
  { id: '4-5-1', label: '4-5-1', slots: [] },
  { id: '4-5-1 (CAM)', label: '4-5-1 (LM-CM-RM + 2 CAM)', slots: [] },
  { id: '4-4-2', label: '4-4-2', slots: [] },
]

const challenge: SbcChallenge = {
  setId: 36,
  setName: 'Marquee Matchups',
  challengeId: 67,
  name: 'Como 1907 v AS Roma',
  status: 'NOT_STARTED',
  type: 'OPEN_CHALLENGE',
  formation: 'f451',
  formationLabel: '4-5-1',
  repeatable: false,
  timesCompleted: 0,
  awards: [],
  requirements: [
    { kind: 'FROM', op: 'MIN', value: 1, refs: [{ kind: 'CLUB', id: 1745, name: 'Como' }, { kind: 'CLUB', id: 52, name: 'AS Roma' }] },
    { kind: 'FROM', op: 'MIN', value: 2, refs: [{ kind: 'NATION', id: 27 }] },
    { kind: 'LEAGUE_COUNT', op: 'MAX', value: 4 },
    { kind: 'LEVEL_COUNT', op: 'MIN', value: 1, level: 3 },
    { kind: 'QUALITY', op: 'MIN', value: 2 },
    { kind: 'SAME_CLUB', op: 'MAX', value: 3 },
    { kind: 'TEAM_RATING', op: 'MIN', value: 75 },
    { kind: 'CHEMISTRY', op: 'MIN', value: 18 },
  ],
}

describe('SBC challenge → çözücü kısıtları', () => {
  it('şartları kısıtlara çevirir, formasyonu bulur, çözülemeyen adı not düşer', () => {
    const setup = challengeSetup(challenge, formations)
    expect(setup.formationId).toBe('4-5-1')
    expect(setup.teamRatingMin).toBe(75)
    expect(setup.chemMin).toBe(18)
    expect(setup.extra.max).toEqual({ sameClub: 3, leagues: 4 })
    expect(setup.extra.minQuality).toBe(2)
    expect(setup.extra.levelCounts).toEqual([{ level: 3, min: 1 }])
    expect(setup.extra.fromAny).toEqual([{ kind: 'club', names: ['Como', 'AS Roma'], min: 1 }])
    expect(setup.notes.join(' ')).toContain('ülke #27')
  })

  it('şartlar okunur metne dönüşür', () => {
    expect(describeRequirement(challenge.requirements[0])).toBe('Como / AS Roma içinden en az 1 oyuncu')
    expect(describeRequirement(challenge.requirements[2])).toBe('en çok 4 farklı lig')
    expect(describeRequirement(challenge.requirements[4])).toBe('Oyuncular en az Gümüş kalitede')
    expect(describeRequirement(challenge.requirements[6])).toBe("Takım rating'i en az 75")
  })
})
