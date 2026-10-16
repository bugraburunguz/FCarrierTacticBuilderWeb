import type { KbSbcSet, SbcChallenge } from '../api/types'

/** Hedef skor tipi (item-score) challenge'lar squad değil streamlined çözücüyle çözülür. */
export function isItemScore(challenge: SbcChallenge): boolean {
  return challenge.kind === 'ITEM_SCORE'
}

/**
 * V3-05d-b: tek kart teslimi (EA ONE_CLICK_CHALLENGE → KB SINGLE_ITEM): saha yok, tek kartın şartları.
 * Yakalanan (kişisel) görevde tür yok, EA tipi var; bilgi tabanında tür var.
 */
export function isSingleItem(challenge: SbcChallenge): boolean {
  return challenge.kind === 'SINGLE_ITEM' || Boolean(challenge.type?.startsWith('ONE_CLICK'))
}

/**
 * Herkese açık bilgi tabanındaki challenge'ı çözücünün kullandığı biçime çevirir (şartlar aynı normalleştirilmiş yapıdadır).
 * formationLabel = bizim formasyon kimliği; formation = EA ham kodu (eşlenmemişse arayüz "Formasyon tanınmadı (f…)").
 */
export function kbChallenges(set?: KbSbcSet): SbcChallenge[] {
  return (set?.challenges ?? []).map((c) => ({
    setId: set!.id,
    setName: set!.name,
    challengeId: c.id,
    name: c.name,
    status: 'NOT_STARTED',
    type: c.eaType ?? (c.kind === 'SINGLE_ITEM' ? 'ONE_CLICK_CHALLENGE' : 'OPEN_CHALLENGE'),
    kind: c.kind,
    pointsRequired: c.itemScoreTarget,
    formation: c.eaFormation ?? c.formation,
    formationLabel: c.formation,
    repeatable: set!.repeatable !== undefined && set!.repeatable !== null,
    timesCompleted: 0,
    awards: Array.isArray(c.reward) ? c.reward : [],
    requirements: c.requirements ?? [],
  }))
}
