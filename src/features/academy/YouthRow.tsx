import type { AcademyPlayer } from '../../api/types'
import { Chip } from '../../design/components/primitives'
import { STATUS_LABEL } from './academyRules'

const SCALE_MIN = 40
const SCALE_MAX = 99
const pct = (value: number) => `${Math.max(0, Math.min(100, ((value - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100))}%`

/**
 * OVR → POT çubuğu (ACADEMY-b §2): mevcut OVR dolu, potansiyele kadar boş çerçeve; aralık modunda uçta bant işareti. Değerler metinle de yazar
 * (renk tek başına anlam taşımaz). Ölçek 40–99.
 */
export function OvrPotBar({ overall, potential, potentialRange }: { overall?: number | null; potential?: number | null; potentialRange?: string | null }) {
  const ovr = overall ?? SCALE_MIN
  const [low, high] = potentialRange ? potentialRange.split('–').map(Number) : [potential ?? undefined, undefined]
  const potLabel = potential ?? potentialRange ?? '—'
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span role="img" aria-label={`OVR ${overall ?? '—'}, POT ${potLabel}`} className="relative block h-2 w-24 shrink-0 overflow-hidden rounded-full bg-[var(--glass-3)] sm:w-32">
        {low !== undefined && <span className="absolute inset-y-0 left-0 rounded-full border border-[var(--line-strong,var(--line))]" style={{ width: pct(high ?? low) }} />}
        {high !== undefined && low !== undefined && (
          <span aria-hidden="true" className="absolute inset-y-0 bg-[var(--line)]" style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }} />
        )}
        <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: pct(ovr) }} />
      </span>
      <span className="whitespace-nowrap text-sm tabular-nums">{overall ?? '—'} → {potLabel}</span>
    </span>
  )
}

/**
 * Plan gerekçesi ad tekrar etmeden: "Vardy · Plansız tahmini …" → "Plansız tahmini …". Sunucu metni hep "{ad} · " ile başlar; ad arayüzde farklı
 * yazılabildiği için ("Oyuncu #…" → "Adı bilinmiyor") ilk ayraca kadar kırpılır.
 */
const reasonText = (player: AcademyPlayer) => {
  const text = player.plan?.text ?? ''
  const cut = text.indexOf(' · ')
  return cut > 0 ? text.slice(cut + 3) : text
}

/**
 * Altyapı ve Gelişim satırı: iki satırlık kart (masaüstünde de tablo değil). 1. satır: ad, yaş, mevki (dönüşüm varsa "CM → CDM önerilir"; kanatta taraf
 * gerekçesi title), OVR → POT çubuğu. 2. satır: önerilen plan ve durum (metinle). `reason` (Gelişim): 3. satır tek satır gerekçe. Tıklayınca panel
 * (masaüstü) ya da oyuncu sayfası (mobil).
 */
export function YouthRow({ player, onOpen, selected = false, reason = false }: { player: AcademyPlayer; onOpen: (playerId: number) => void; selected?: boolean; reason?: boolean }) {
  const position = player.bestPosition ?? player.positions[0] ?? '—'
  return (
    <button type="button" onClick={() => onOpen(player.playerId)} aria-current={selected || undefined}
      className={`glass-3 flex w-full flex-col gap-1 rounded-[var(--radius-sm)] p-3 text-left hover:ring-1 hover:ring-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${selected ? 'ring-1 ring-[var(--accent)]' : ''}`}>
      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <b className="truncate">{player.name}</b>
          <span className="text-sm tabular-nums text-ink-2">{player.age ?? '—'}</span>
          <span className="text-sm text-ink-2" title={player.sideReason ?? undefined}>
            {player.conversionPosition ? `${position} → ${player.conversionPosition} önerilir` : position}
          </span>
          {player.loanedOut && <Chip tone="info">Kiralıkta</Chip>}
        </span>
        <OvrPotBar overall={player.overall} potential={player.potential} potentialRange={player.potentialRange} />
      </span>
      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-ink-2">
        <span>Önerilen plan: <span className="font-semibold text-ink">{player.plan?.label ?? '—'}</span></span>
        {player.status && <span>Durum: <span className="font-semibold text-ink">{STATUS_LABEL[player.status]}</span></span>}
      </span>
      {/* GT-a: Gelişim'de tek satır gerekçe (tahmin), ad tekrar etmeden. */}
      {reason && player.plan?.text && <span className="text-xs text-ink-2">{reasonText(player)}</span>}
      {player.promoteInfo && <span className="text-xs text-ink-2">{player.promoteInfo.text}</span>}
    </button>
  )
}
