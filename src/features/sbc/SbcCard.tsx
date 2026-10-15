import { Package, RefreshCw, Sparkles, ThumbsUp, Timer, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { KbItem, KbSbcSet, SbcSetVotes } from '../../api/types'
import { BASE_H, BASE_W, PlayerCard } from '../../components/card/PlayerCard'
import { useIsMobile } from '../../design/components/MobileSheet'
import { Chip } from '../../design/components/primitives'
import { cardPlayerOfKbItem, cardPlayerOfRewardItem } from '../../lib/cardPlayer'
import { BADGE_TEXT, categoryLabel, countdownText, parseReward, repeatText, sbcBadge, votePct } from './sbcList'

/** Sabit ödül alanı yüksekliği (px): aynı satırdaki kartlar hizalı kalsın. Masaüstü 152, mobil (<820px) 120. */
const REWARD_H = { desktop: 152, mobile: 120 } as const
const LOCAL_DATE = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' })

/**
 * Ödül alanı: oyuncu → kendi PlayerCard'ımız (alan yüksekliğine sığan genişlik). Önce EA ödül kartı verisi (reyting/mevki yakalamadan, ad katalogdan),
 * yoksa yedek ut_item; paket → büyük simge, bilinmeyen oyuncu → siluet.
 */
function Reward({ set, items, names, height }: { set: KbSbcSet; items: Map<number, KbItem>; names: Map<number, string>; height: number }) {
  const reward = parseReward(set.reward)
  const ea = reward.eaItems[0]
  const item = ea ? undefined : reward.itemResourceIds.map((id) => items.get(id)).find((i): i is KbItem => i !== undefined)
  const unknownPlayers = reward.itemResourceIds.length - (item ? 1 : 0)
  const width = Math.floor((height * BASE_W) / BASE_H)
  const icon = Math.round(height * 0.38)
  const placeholder = (Icon: typeof Package, label: string) => (
    <span className="flex flex-col items-center gap-2 text-ink-2">
      <Icon size={icon} strokeWidth={1.5} aria-hidden="true" className="text-accent" />
      <span className="text-sm font-semibold">{label}</span>
    </span>
  )
  return (
    <div aria-label="Ödül" role="group" className="flex items-center justify-center gap-3 overflow-hidden" style={{ height }}>
      {ea ? (
        <PlayerCard player={cardPlayerOfRewardItem(ea, (ea.assetId !== undefined ? names.get(ea.assetId) : undefined) ?? (ea.resourceId !== undefined ? items.get(ea.resourceId)?.name : undefined))} width={width} />
      ) : item ? (
        <PlayerCard player={cardPlayerOfKbItem(item)} width={width} />
      ) : reward.picks > 0 ? (
        placeholder(UserRound, reward.picks > 1 ? `${reward.picks} oyuncu seçimi` : 'Oyuncu seçimi')
      ) : unknownPlayers > 0 ? (
        placeholder(UserRound, unknownPlayers > 1 ? `${unknownPlayers} oyuncu ödülü` : 'Oyuncu ödülü')
      ) : reward.packs > 0 ? (
        placeholder(Package, reward.packs > 1 ? `${reward.packs} paket` : 'Paket')
      ) : (
        // Coin vb. bu turda gösterilmeyen tür varsa "Diğer ödül"; liste boşsa veri yok.
        placeholder(Package, Array.isArray(set.reward) && set.reward.length > 0 ? 'Diğer ödül' : 'Ödül bilgisi yok')
      )}
    </div>
  )
}

/**
 * SBC set kartı (Katalog ızgarası): kartın tamamı tek tıklama hedefi (/ut/sbc/:setId; erişilebilir ad = set adı). Sabit ödül alanı,
 * ad (2 satır), görev sayısı, tekrar, geri sayım, oy yüzdesi, Yeni/Değişti ve ikincil "Çöz →" etiketi. Veri yoksa alan gösterilmez.
 */
export function SbcCard({ set, items, names, votes, now }: { set: KbSbcSet; items: Map<number, KbItem>; names: Map<number, string>; votes?: SbcSetVotes; now: number }) {
  const mobile = useIsMobile()
  const badge = sbcBadge(set, now)
  const left = countdownText(set.endsAt, now)
  const repeat = repeatText(set.repeatable)
  const pct = votePct(votes)
  return (
    <li className="min-w-0">
      <Link to={`/ut/sbc/${set.id}`} aria-label={set.name} data-sbc-card
        className="glass-3 flex h-full flex-col gap-3 p-3 text-ink outline-none transition-colors hover:bg-[var(--glass-hover)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]">
        <div className="flex h-6 items-center gap-1.5 overflow-hidden">
          <Chip>{categoryLabel(set.category)}</Chip>
          {/* Nötr çip + simge: ton zemini açık temada aurora üstünde 4,5:1'in altına düşüyordu; anlam simge ve metinde. */}
          {badge && (
            <Chip>
              {badge === 'new' ? <Sparkles size={12} aria-hidden="true" className="text-good" /> : <RefreshCw size={12} aria-hidden="true" className="text-info" />}
              {BADGE_TEXT[badge]}
            </Chip>
          )}
        </div>
        <Reward set={set} items={items} names={names} height={mobile ? REWARD_H.mobile : REWARD_H.desktop} />
        <h2 className="line-clamp-2 h-12 font-display text-lg font-semibold leading-6 [overflow-wrap:anywhere]" title={set.name}>{set.name}</h2>
        <p className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
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
        {/* İkincil görünüm: vurgu rengi açık temada cam zemin üstünde 4,28:1 kalıyordu; metin --ink, çerçeve ikincil düğme gibi. */}
        <span className="mt-auto inline-flex min-h-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--glass-border)] px-3 text-sm font-semibold text-ink">
          Çöz →
        </span>
      </Link>
    </li>
  )
}
