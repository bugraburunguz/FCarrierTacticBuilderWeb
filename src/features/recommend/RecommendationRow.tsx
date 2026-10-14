import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { CareerRecommendationItem, RecommendBucket } from '../../api/types'
import { FitBadge, type FitState } from '../../components/card/FitBadge'
import { PlayerCard } from '../../components/card/PlayerCard'
import { HelpPopover } from '../../components/ui'
import { Chip } from '../../design/components/primitives'
import { cardPlayerOfSummary } from '../../lib/cardPlayer'
import { formatEur } from '../../lib/format'

const THUMB = 44

const BUCKET_TONE: Record<RecommendBucket, 'good' | 'warn' | 'bad'> = { ALINABILIR: 'good', ZOR: 'warn', HAYAL: 'bad' }
const FIT_STATE_OF_LABEL: Record<NonNullable<CareerRecommendationItem['fitLabel']>, FitState> = { GOOD: 'good', AT_LEVEL: 'neutral', WEAK: 'ok', WRONG_ROLE: 'bad' }
const TAG_LABEL = { FREE: 'Serbest', YOUNG: 'Genç', READY: 'Hazır' } as const

const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`

/**
 * Öneri satırı (PickList ailesi, 08 §15): küçük kart + isim/OVR; kova rozeti ve gerekçesi (açılır not); yaş · kulüp (lig) · OVR farkı · değer;
 * rozetli levelFit ve currentFit; Δ mevcut; futureFit (SCOUT_RANGE'de sunucu göndermez → hiç gösterilmez). Renk tek başına anlam taşımaz: rozet metni vardır.
 */
export function RecommendationRow({ item, showRole = false, action }: { item: CareerRecommendationItem; showRole?: boolean; action?: ReactNode }) {
  const { player } = item
  const fitState = item.fitLabel ? FIT_STATE_OF_LABEL[item.fitLabel] : 'neutral'
  const club = player.club ? `${player.club}${player.league ? ` (${player.league})` : ''}` : 'Kulüpsüz'
  return (
    <li className="glass-3 flex flex-col gap-2 px-2 py-2 text-ink">
      <div className="flex items-start gap-3">
        <span className="shrink-0" style={{ width: THUMB }}>
          <PlayerCard player={cardPlayerOfSummary(player, player.positions[0])} width={THUMB} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <b className="font-[var(--font-num)] text-base tabular-nums">{player.overall}</b>
            <Link to={`/players/${player.id}`} className="text-sm font-semibold underline decoration-dotted underline-offset-2">
              {player.name}
            </Link>
          </div>
          <p className="text-xs text-muted">
            {player.positions.slice(0, 3).join(' / ')}
            {player.age !== undefined ? ` · ${player.age} yaş` : ''} · {club}
          </p>
          <p className="text-xs text-ink-2">
            {item.ovrGap !== undefined && <span>OVR farkı {signed(item.ovrGap)} · </span>}
            {player.valueEur !== undefined ? formatEur(player.valueEur) : 'Değer bilinmiyor'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <FitBadge state={fitState} pct={item.levelFit !== undefined ? Math.round(item.levelFit) : undefined} />
          <span className="font-[var(--font-num)] text-xs tabular-nums text-ink-2">uyum {item.currentFit.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Chip tone={BUCKET_TONE[item.bucket]}>{item.bucketLabel}</Chip>
        <HelpPopover label={`${item.bucketLabel} gerekçesi`}>
          <ul className="space-y-1">
            {item.bucketFactors.map((f) => (
              <li key={f.name}>
                <b>{f.name}</b> ({f.points > 0 ? `+${f.points}` : f.points}): {f.note}
              </li>
            ))}
          </ul>
        </HelpPopover>
        {item.tags.map((t) => (
          <Chip key={t}>{TAG_LABEL[t]}</Chip>
        ))}
        {item.positionLabel && <Chip tone="warn">{item.positionLabel}</Chip>}
        {showRole && (
          <span className="text-ink-2">
            {item.roleName}
            {item.focus ? ` (${item.focus})` : ''}
          </span>
        )}
        {item.deltaVsCurrent !== undefined && (
          <span className={`font-semibold tabular-nums ${item.deltaVsCurrent >= 0 ? 'text-good' : 'text-bad'}`}>{`Δ mevcut ${signed(item.deltaVsCurrent)}`}</span>
        )}
        {item.futureFit !== undefined && <span className="tabular-nums text-ink-2">{`futureFit ${item.futureFit.toFixed(1)}`}</span>}
        <span className="ml-auto">{action}</span>
      </div>
    </li>
  )
}
