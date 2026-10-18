import type { KbItem, PlayerSummary, RewardItem } from '../api/types'
import type { CardPlayer } from '../components/card/PlayerCard'
import type { SbcCandidate } from './sbcTraditional'
import type { UtCard } from './utCard'

/** UtCard / SBC adayını kart bileşeninin beklediği biçime çevirir. */
export function cardPlayerOf(card: UtCard | SbcCandidate, position?: string): CardPlayer {
  const isUt = 'rating' in card
  return {
    name: card.name,
    // V3-05d-c: kulüp kartının adı katalogdan (assetId); yakalanan ad yedek
    assetId: card.assetId,
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

/**
 * V3-05c-c: EA ödül kartı verisi (allowlist) → kart bileşeni. Reyting ve mevki ödül kartının kendisinden (özel sürüm olabilir); ad katalogdan
 * (assetId), yoksa ut_item'dan, o da yoksa genel ad. Katalog yüz statları ödül sürümüne ait olmayabileceği için kullanılmaz.
 */
export function cardPlayerOfRewardItem(item: RewardItem, name?: string): CardPlayer {
  return { name: name ?? 'Ödül oyuncusu', rating: item.rating ?? 0, position: item.preferredPosition }
}

/** Katalog/kariyer oyuncusu → kart bileşeninin beklediği biçim (yüz değerleri dahil). */
export function cardPlayerOfSummary(player: PlayerSummary, position?: string): CardPlayer {
  return {
    name: player.name,
    // EA oyuncu kimliği: kart görseli (/img/card/{id}) ve katalog adı için.
    assetId: player.faceAssetId,
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
