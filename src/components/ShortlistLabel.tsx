import { Link } from 'react-router-dom'
import type { ShortlistItem } from '../api/types'
import { formatEur } from '../lib/format'

/** Kısa liste satırının oyuncu bilgisi: ad (profil bağlantısı), OVR, mevki, kulüp, değer ve not. */
export function ShortlistLabel({ item }: { item: ShortlistItem }) {
  const player = item.player
  return (
    <div className="min-w-0">
      <Link to={`/players/${item.playerId}`} className="font-semibold underline decoration-dotted underline-offset-2">{player?.name ?? `Oyuncu #${item.playerId}`}</Link>
      {player && (
        <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
          <span className="num">{player.overall}</span>
          <span>{player.positions.slice(0, 3).join(', ')}</span>
          {player.club && <span>{player.club}</span>}
          {player.valueEur !== undefined && <span>{formatEur(player.valueEur)}</span>}
        </div>
      )}
      {item.note && <p className="text-xs text-muted">{item.note}</p>}
    </div>
  )
}
