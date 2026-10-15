import type { KbItem, PlayerSummary } from '../api/types'
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
    faceStatsApproximate: isUt ? card.faceStatsApproximate : undefined,
    weakFoot: isUt ? card.weakFoot : undefined,
    skillMoves: isUt ? card.skillMoves : undefined,
  }
}

/** Bilgi tabanı kartı (ut_item) → kart bileşeni: promo kartı kendi renginde, ICON/HERO kendi tasarımında. */
export function cardPlayerOfKbItem(item: KbItem): CardPlayer {
  const special = item.cardType === 'ICON' || item.cardType === 'HERO' ? item.cardType : undefined
  return { name: item.name, rating: item.rating, position: item.position, cardType: special, rarity: item.promo ?? (special ? undefined : item.cardType) }
}

/** Katalog/kariyer oyuncusu → kart bileşeninin beklediği biçim (yüz değerleri dahil). */
export function cardPlayerOfSummary(player: PlayerSummary, position?: string): CardPlayer {
  return {
    name: player.name,
    rating: player.overall,
    position,
    faceUrl: player.faceUrl,
    nationality: player.nationality,
    club: player.club,
    league: player.league,
    faceStats: player.faceStats,
    faceLabels: player.faceLabels,
    faceStatsApproximate: player.faceStatsApproximate,
    weakFoot: player.weakFoot,
    skillMoves: player.skillMoves,
  }
}
