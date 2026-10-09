import type { CardPlayer } from '../components/card/PlayerCard'
import type { SbcCandidate } from './sbcTraditional'
import type { UtCard } from './utCard'

/** UtCard / SBC adayını kart bileşeninin beklediği biçime çevirir. */
export function cardPlayerOf(card: UtCard | SbcCandidate, position?: string): CardPlayer {
  const isUt = 'rating' in card
  return {
    name: card.name,
    rating: isUt ? card.rating : card.overall,
    position,
    faceUrl: card.faceUrl,
    cardType: card.cardType,
    rarity: card.rarity,
    nationality: card.nationality,
    club: card.club,
    league: card.league,
    faceStats: isUt ? card.faceStats : undefined,
    faceLabels: isUt ? card.faceLabels : undefined,
    weakFoot: isUt ? card.weakFoot : undefined,
    skillMoves: isUt ? card.skillMoves : undefined,
  }
}
