import { Package, RefreshCw, Sparkles, ThumbsUp, Timer, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { KbItem, KbSbcSet, SbcSetVotes } from '../../api/types'
import { PlayerCard } from '../../components/card/PlayerCard'
import { Chip } from '../../design/components/primitives'
import { cardPlayerOfKbItem } from '../../lib/cardPlayer'
import { BADGE_TEXT, categoryLabel, countdownText, parseReward, repeatText, sbcBadge, votePct } from './sbcList'

/** Ödül kartının genişliği: çipler + 6 stat ≥ 11px sığan en küçük kart (PlayerCard META_MIN_WIDTH) üstünde. */
const REWARD_CARD_WIDTH = 150
const LOCAL_DATE = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' })

/**
 * SBC set kartı (Katalog ızgarası): ödül (kendi PlayerCard'ımız ya da rozet; EA render yok), ad, görev sayısı, tekrar, geri sayım,
 * oy yüzdesi, Yeni/Değişti, "Çöz". Veri yoksa alan gösterilmez (uydurma yok).
 */
export function SbcCard({ set, items, votes, now }: { set: KbSbcSet; items: Map<number, KbItem>; votes?: SbcSetVotes; now: number }) {
  const reward = parseReward(set.reward)
  const rewardItems = reward.itemResourceIds.map((id) => items.get(id)).filter((i): i is KbItem => i !== undefined)
  const unknownPlayers = reward.itemResourceIds.length - rewardItems.length
  const badge = sbcBadge(set, now)
  const left = countdownText(set.endsAt, now)
  const repeat = repeatText(set.repeatable)
  const pct = votePct(votes)
  return (
    <li className="glass-3 flex min-w-0 flex-col gap-3 p-3">
      <div className="flex min-h-6 flex-wrap items-center gap-1.5">
        <Chip>{categoryLabel(set.category)}</Chip>
        {/* Nötr çip + simge: ton zemini (good/info-soft) açık temada aurora üstünde 4,5:1'in altına düşüyordu; anlam simge ve metinde. */}
        {badge && (
          <Chip>
            {badge === 'new' ? <Sparkles size={12} aria-hidden="true" className="text-good" /> : <RefreshCw size={12} aria-hidden="true" className="text-info" />}
            {BADGE_TEXT[badge]}
          </Chip>
        )}
      </div>
      {(rewardItems.length > 0 || unknownPlayers > 0 || reward.packs > 0) && (
        <div aria-label="Ödül" role="group" className="flex flex-wrap items-center justify-center gap-2">
          {rewardItems.map((item) => <PlayerCard key={item.eaResourceId} player={cardPlayerOfKbItem(item)} width={REWARD_CARD_WIDTH} />)}
          {unknownPlayers > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] px-3 py-1 text-xs font-semibold text-ink-2">
              <UserRound size={14} aria-hidden="true" />
              {unknownPlayers > 1 ? `${unknownPlayers} oyuncu ödülü` : 'Oyuncu ödülü'}
            </span>
          )}
          {reward.packs > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] px-3 py-1 text-xs font-semibold text-ink-2">
              <Package size={14} aria-hidden="true" />
              {reward.packs > 1 ? `${reward.packs} paket` : 'Paket'}
            </span>
          )}
        </div>
      )}
      <h2 className="line-clamp-2 font-display text-lg font-semibold leading-6 [overflow-wrap:anywhere]" title={set.name}>{set.name}</h2>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
        <span>{set.challengeCount} görev</span>
        {repeat && <span>Tekrar {repeat}</span>}
        {left && set.endsAt && (
          <span className="inline-flex items-center gap-1" title={`Bitiş: ${LOCAL_DATE.format(new Date(set.endsAt))}`}>
            <Timer size={14} aria-hidden="true" />
            <span>{left}</span>
          </span>
        )}
        {pct !== null && (
          <span className="inline-flex items-center gap-1" title="Beğeni oranı">
            <ThumbsUp size={14} aria-hidden="true" />
            <span className="num">%{pct}</span>
          </span>
        )}
      </p>
      <Link to={`/ut/sbc/${set.id}`} aria-label={`Çöz: ${set.name}`}
        className="mt-auto inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-semibold text-on-accent hover:opacity-90 max-sm:min-h-11">
        Çöz
      </Link>
    </li>
  )
}
