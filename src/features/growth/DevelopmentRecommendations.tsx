import { useQuery } from '@tanstack/react-query'
import { useId, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { DevelopmentOption, DevelopmentWeakSlot } from '../../api/types'
import { HelpPopover } from '../../components/ui'
import { Chip, Skeleton } from '../../design/components/primitives'
import type { SlotFitRow } from '../squad/useSlotFits'

const STALE_MS = 300_000
/** Uyarı metni: hepsi tahmin (büyüme modeli kalibre edilmedi, FIT-3 madde 10). */
const ESTIMATE_TAG = 'tahmin · kalibre edilmedi'

const signed = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`

function OptionLine({ o }: { o: DevelopmentOption }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-ink-2">
      <span>{o.position} · {o.planName} planı ({o.roleName})</span>
      <span className="tabular-nums">2 sezonda Güç {Math.round(o.strength2)} · Dengeli {Math.round(o.balancedStrength2)} · <b className="text-ink">{signed(o.gain)}</b></span>
    </li>
  )
}

/**
 * FIT-3 madde 11: 23 yaş ve altı, potansiyeli OVR'sinden ≥ 5 yüksek oyuncular için gelişim planı önerisi. Takımın zayıf slotları (Masa sınıfı
 * KALITE_ACIGI/IKISI) istekle gider; her özel plan Dengeli'ye karşı kıyaslanır. Gelişim sayfası tam liste, Kadro › Derinlik kompakt (yalnız özel plan).
 */
export function DevelopmentRecommendations({ careerId, rows, compact = false }: { careerId?: number; rows: SlotFitRow[]; compact?: boolean }) {
  const titleId = useId()
  const weakSlots = useMemo<DevelopmentWeakSlot[]>(() => rows.filter((r) => r.weakClass === 'KALITE_ACIGI' || r.weakClass === 'IKISI')
    .map((r) => ({ slotId: r.slotId, position: r.position, roleId: r.roleId, playerId: r.playerId })), [rows])
  const query = useQuery({
    queryKey: ['development-recommendations', careerId, JSON.stringify(weakSlots)],
    queryFn: () => endpoints.developmentRecommendations(careerId!, weakSlots),
    enabled: careerId !== undefined,
    staleTime: STALE_MS,
    retry: false,
  })
  const shown = (query.data ?? []).filter((r) => !compact || !r.balanced)
  if (compact && (query.isError || (query.isSuccess && shown.length === 0))) {
    return null
  }
  return (
    <section aria-labelledby={titleId} className="glass-2 flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 id={titleId} className="font-display text-xl font-semibold leading-6">Gelişim planı önerileri</h2>
        <Chip tone="warn">{ESTIMATE_TAG}</Chip>
        <HelpPopover label="Gelişim önerisi nasıl hesaplanır?">
          23 yaş ve altı, potansiyeli OVR'sinden en az 5 yüksek oyuncular. Her plan 2 sezon sonrası Güç'le aynı mevki ve rolde Dengeli plana karşı
          kıyaslanır; fark 2 Güç'ten azsa Dengeli önerilir. Büyüme modeli henüz gerçek içe aktarmalarla kalibre edilmedi.
        </HelpPopover>
      </header>
      {query.isLoading ? <Skeleton className="h-24" /> : query.isError ? <p className="text-sm text-ink-2">Öneriler alınamadı.</p> : shown.length === 0 ? (
        <p className="text-sm text-ink-2">Kapsamda oyuncu yok (23 yaş ve altı, potansiyeli OVR'sinden en az 5 yüksek).</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((r) => (
            <li key={r.playerId} className="glass-3 flex flex-col gap-1.5 rounded-[var(--radius-sm)] p-2.5">
              <span className="text-sm">
                <Link to={`/players/${r.playerId}?sekme=gelisim`} className="font-semibold hover:underline">{r.playerName}</Link>
                {r.text.slice(r.playerName.length)}
              </span>
              {!compact && r.options.length > 0 && <ul aria-label={`${r.playerName} plan seçenekleri`} className="flex flex-col gap-0.5">{r.options.map((o) => <OptionLine key={o.planKey + o.position + o.roleId} o={o} />)}</ul>}
              {compact && r.recommended && <span className="text-xs tabular-nums text-ink-2">Dengeli'ye göre {signed(r.recommended.gain)} Güç</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
