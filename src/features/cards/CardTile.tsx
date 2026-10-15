import type { PlayerSummary } from '../../api/types'
import { CatalogTile } from '../catalog/CatalogTile'
import { utPlayerHref } from './utPlayer'

/** Kart bağlantısı: UT oyuncu sayfası (/ut/players/:assetId). */
export const playerHref = utPlayerHref

/** Kart veritabanı ızgara kartı: ortak Katalog kartı, UT oyuncu sayfasına gider. */
export function CardTile({ player, cardWidth }: { player: PlayerSummary; cardWidth: number }) {
  return <CatalogTile player={player} cardWidth={cardWidth} href={playerHref(player)} />
}
