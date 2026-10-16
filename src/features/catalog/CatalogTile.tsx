import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { PlayerSummary } from '../../api/types'
import { PlayerCard } from '../../components/card/PlayerCard'
import { CompareButton } from '../../components/CompareButton'
import { cardPlayerOfSummary } from '../../lib/cardPlayer'

/**
 * Izgara kartı (blur yok): kendi çerçeveli PlayerCard hücreyi doldurur (genişlik = hücre − dolgu, cardGridLayout), altında mevki · yaş,
 * isteğe bağlı ek satır (ör. kariyer: kulüp, değer, kova) ve karşılaştır. Tıklayınca oyuncu sayfası.
 */
export function CatalogTile({ player, cardWidth, href, extra }: { player: PlayerSummary; cardWidth: number; href: string; extra?: ReactNode }) {
  const position = player.positions[0]
  return (
    <li className="glass-3 flex min-w-0 flex-col items-center gap-2 px-2 py-3">
      <Link to={href} aria-label={`${player.name}, ${player.overall}, ${player.positions.join(' ')}`} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <PlayerCard player={cardPlayerOfSummary(player, position)} width={cardWidth} />
      </Link>
      <p className="w-full truncate text-center text-xs text-ink-2" title={`${player.positions.join(' / ')}${player.club ? ` · ${player.club}` : ''}`}>
        {player.positions.slice(0, 3).join(' · ')}{player.age ? ` · ${player.age}` : ''}
      </p>
      {extra}
      <CompareButton entry={{ id: player.id, name: player.name, overall: player.overall, position: position ?? '' }} compact />
    </li>
  )
}
