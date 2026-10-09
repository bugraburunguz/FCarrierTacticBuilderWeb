import type { KbSbcSet, SbcChallenge } from '../api/types'

/** Herkese açık bilgi tabanındaki challenge'ı çözücünün kullandığı biçime çevirir (şartlar aynı normalleştirilmiş yapıdadır). */
export function kbChallenges(set?: KbSbcSet): SbcChallenge[] {
  return (set?.challenges ?? []).map((c) => ({
    setId: set!.id,
    setName: set!.name,
    challengeId: c.id,
    name: c.name,
    status: 'NOT_STARTED',
    type: c.kind === 'ITEM_SCORE' ? 'ONE_CLICK' : 'OPEN_CHALLENGE',
    formation: c.formation,
    formationLabel: c.formation,
    repeatable: set!.repeatable !== undefined && set!.repeatable !== null,
    timesCompleted: 0,
    awards: Array.isArray(c.reward) ? c.reward : [],
    requirements: c.requirements ?? [],
  }))
}
