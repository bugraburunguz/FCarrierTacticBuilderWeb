import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { CareerPlayerContract, PlayerSummary } from '../../api/types'
import { HelpPopover } from '../../components/ui'
import { ErrorState, Skeleton, StatTile } from '../../design/components/primitives'
import { formatEur } from '../../lib/format'
import { BucketChip } from '../careerPlayers/BucketChip'
import { potentialText } from './playerPage'

const dateText = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/**
 * Gelişim (V3-06b): yalnız mevcut veriden — OVR → POT, gelişim payı ve yaş. Projeksiyon/yaş eğrisi için v3 ucu yok, gösterilmez
 * (eski gelişim ucu WeaponState rozetli, ENG-M8). Ayrıntı ve takip gelişim sayfasında (V3-06e), kadrodaki oyuncu için bağlantı.
 */
export function DevelopmentTab({ summary, inSquad }: { summary: PlayerSummary; inSquad: boolean }) {
  const pot = potentialText(summary)
  const headroom = summary.potential !== undefined ? summary.potential - summary.overall : undefined
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <StatTile label="Şimdi" value={summary.overall} />
        {pot !== undefined && <StatTile label="Potansiyel" value={pot} />}
        {headroom !== undefined && <StatTile label="Gelişim payı" value={headroom > 0 ? `+${headroom}` : String(headroom)} />}
        {summary.age !== undefined && <StatTile label="Yaş" value={summary.age} />}
      </div>
      {pot !== undefined && (
        <p className="text-sm text-ink-2">
          OVR → POT: {summary.overall} → {pot}
          {headroom !== undefined && headroom <= 0 && ': potansiyeline ulaşmış görünüyor.'}
        </p>
      )}
      {inSquad
        ? <p className="text-sm"><Link to={`/career/growth?oyuncu=${summary.id}`} className="font-semibold text-accent underline-offset-2 hover:underline">Gelişim takibi</Link>: OVR/POT güncellemeleri ve geçmiş.</p>
        : <p className="text-xs text-muted">Gelişim takibi kadrondaki oyuncular içindir.</p>}
    </div>
  )
}

function Row({ term, children, help }: { term: string; children: ReactNode; help?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-[var(--glass-border)] py-2 text-sm">
      <dt className="flex items-center gap-1.5 text-ink-2">{term}{help}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  )
}

/**
 * Sözleşme ve değer (V3-06b): yalnız kayıtta olan alanlar (0'a çevrilmez, ENG-02). Kalan ay oyun tarihine göre; kova öneri hattının
 * sınıflandırıcısından; alım sonrası bütçe yalnız bütçe ve değer biliniyorsa ve oyuncu kadroda değilse (sunucu karar verir).
 */
export function ContractTab({ query }: { query: UseQueryResult<CareerPlayerContract> }) {
  if (query.isLoading) {
    return <Skeleton className="h-48" />
  }
  if (query.isError || !query.data) {
    return <ErrorState message="Sözleşme bilgisi yüklenemedi." onRetry={() => query.refetch()} />
  }
  const c = query.data
  return (
    <div className="flex flex-col">
    <dl className="flex flex-col">
      {c.valueEur !== undefined && (
        <Row term="Piyasa değeri" help={c.valuationEstimated ? <HelpPopover label="Tahmini değer"><p>Kayıtta değer yok; işaretli değer modelin tahmini.</p></HelpPopover> : undefined}>
          {c.valuationEstimated ? `≈ ${formatEur(c.valueEur)}` : formatEur(c.valueEur)}
        </Row>
      )}
      {c.wageEur !== undefined && <Row term="Maaş">{formatEur(c.wageEur)} / hafta</Row>}
      {c.contractUntil !== undefined && (
        <Row term="Sözleşme bitişi">
          {dateText(c.contractUntil)}
          {c.monthsLeft !== undefined && c.gameDate !== undefined && (
            <span className="block text-xs font-normal text-muted">{c.monthsLeft} ay kaldı · oyun tarihi {dateText(c.gameDate)}</span>
          )}
        </Row>
      )}
      {c.onLoan && <Row term="Kiralık durumu">Kiralık</Row>}
      {c.releaseClauseEur !== undefined && <Row term="Serbest bırakma bedeli">{formatEur(c.releaseClauseEur)}</Row>}
      {c.feasibility !== undefined && (
        <Row term="Ulaşılabilirlik" help={<HelpPopover label="Ulaşılabilirlik"><p>Öneri hattıyla aynı sınıflandırma: bütçe oranı, kulüp gücü farkı, kadrondaki ilk 11'e göre OVR farkı ve kalan sözleşme.</p></HelpPopover>}>
          <BucketChip bucket={c.feasibility} />
        </Row>
      )}
      {c.budgetAfterPurchaseEur !== undefined && (
        <Row term="Alım sonrası bütçe">
          <span className={c.budgetAfterPurchaseEur < 0 ? 'text-bad' : undefined}>{formatEur(c.budgetAfterPurchaseEur)}</span>
          {c.budgetEur !== undefined && <span className="block text-xs font-normal text-muted">bütçe {formatEur(c.budgetEur)}</span>}
        </Row>
      )}
    </dl>
    {c.inSquad && <p className="pt-2 text-xs text-muted">Oyuncu kadronda: ulaşılabilirlik ve alım sonrası bütçe gösterilmez.</p>}
    </div>
  )
}
