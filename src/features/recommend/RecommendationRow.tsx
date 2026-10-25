import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { CareerRecommendationItem } from '../../api/types'
import { BucketChip } from '../careerPlayers/BucketChip'
import { FitBadge } from '../../components/card/FitBadge'
import { FitNarrativeView } from '../../components/FitNarrativeView'
import { PlayerCard } from '../../components/card/PlayerCard'
import { HelpPopover } from '../../components/ui'
import { Chip } from '../../design/components/primitives'
import { cardPlayerOfSummary } from '../../lib/cardPlayer'
import { deltaText, FIT_HELP, fitDisplay, futureText, ovrGapText, roleFitText, strengthText } from '../../lib/fitLabels'
import { formatEur } from '../../lib/format'

const THUMB = 44

const TAG_LABEL = { FREE: 'Serbest', YOUNG: 'Genç', READY: 'Hazır' } as const

/**
 * Öneri satırı (PickList ailesi, 08 §15): küçük kart + isim/OVR; kova rozeti ve gerekçesi (açılır not); yaş · kulüp (lig) · OVR farkı · değer;
 * rozetli levelFit ve currentFit; Δ mevcut; futureFit (SCOUT_RANGE'de sunucu göndermez → hiç gösterilmez). Renk tek başına anlam taşımaz: rozet metni vardır.
 */
export function RecommendationRow({ item, showRole = false, action, extra, cardWidth = THUMB }: { item: CareerRecommendationItem; showRole?: boolean; action?: ReactNode; extra?: ReactNode; cardWidth?: number }) {
  const { player } = item
  const fit = fitDisplay({ levelFit: item.levelFit, currentFit: item.currentFit, fitLabel: item.fitLabel })
  const club = player.club ? `${player.club}${player.league ? ` (${player.league})` : ''}` : 'Kulüpsüz'
  return (
    <li className="glass-3 flex flex-col gap-2 px-2 py-2 text-ink">
      <div className="flex flex-wrap items-start gap-3">
        <span className="shrink-0" style={{ width: cardWidth }}>
          <PlayerCard player={cardPlayerOfSummary(player, player.positions[0])} width={cardWidth} />
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
            {item.ovrGap !== undefined && <span title={FIT_HELP.ovrGap}>{ovrGapText(item.ovrGap)} · </span>}
            {player.valueEur !== undefined ? formatEur(player.valueEur) : 'Değer bilinmiyor'}
          </p>
        </div>
        {/* <480px: uyum sütunu satırın altına iner (ad ve kulüp satırı dar sütuna sıkışmasın). */}
        <div className="flex shrink-0 flex-col items-end gap-1 max-[479px]:w-full max-[479px]:flex-row max-[479px]:flex-wrap max-[479px]:items-center max-[479px]:gap-x-3">
          <FitBadge state={fit.state} compact tailored={item.narrative?.tailored} />
          {item.levelFit !== undefined && <span title={FIT_HELP.level} className="text-xs font-semibold tabular-nums">{roleFitText(item.levelFit)}</span>}
          <span title={FIT_HELP.rolePoints} className="text-xs tabular-nums text-ink-2">{strengthText(item.currentFit)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {/* Nötr çip + renkli nokta (V3-06c: tonlu "bad" çip koyu temada 4,41:1 kalıyordu); liste sayfasıyla aynı bileşen. */}
        <BucketChip bucket={item.bucket} />
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
          <span title={FIT_HELP.delta} className={`font-semibold tabular-nums ${item.deltaVsCurrent >= 0 ? 'text-good' : 'text-bad'}`}>{deltaText(item.deltaVsCurrent)}</span>
        )}
        {item.futureFit !== undefined && <span title={FIT_HELP.future} className="tabular-nums text-ink-2">{futureText(item.futureFit)}</span>}
        <span className="ml-auto">{action}</span>
      </div>
      {extra}
      {item.narrative && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-ink-2">Neden?</summary>
          <div className="pt-1">
            <FitNarrativeView narrative={item.narrative} />
          </div>
        </details>
      )}
    </li>
  )
}
