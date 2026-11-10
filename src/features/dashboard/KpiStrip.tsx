import type { ReactNode } from 'react'
import type { CareerPlayer } from '../../api/types'
import { OvrBox, Skeleton } from '../../design/components/primitives'
import { squadStats } from '../careerSquad/careerSquadRules'

const decimal = (value?: number) => (value === undefined ? undefined : value.toLocaleString('tr-TR', { maximumFractionDigits: 1 }))

function Tile({ label, sub, children }: { label: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="glass flex min-w-0 items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{label}</span>
        {sub && <span className="truncate text-xs text-ink-2">{sub}</span>}
      </div>
      {children}
    </div>
  )
}

/**
 * Masa özet şeridi (FCA-3, Stitch telemetri satırı): takım ortalaması, ana taktiğin ilk 11 ortalaması, ortalama yaş. Yalnız eldeki veri:
 * ortalamalar kiralık gönderilenler hariç (Kadro özetiyle aynı kural); ilk 11 ana taktik yoksa "Ana taktik yok".
 */
export function KpiStrip({ squad, starters, isMain, pending }: { squad: CareerPlayer[]; starters: number[]; isMain: boolean; pending: boolean }) {
  const stats = squadStats(squad)
  const byId = new Map(squad.map((c) => [c.player.id, c.player.overall]))
  const starterOvr = starters.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
  const starterAvg = starterOvr.length ? Math.round(starterOvr.reduce((s, v) => s + v, 0) / starterOvr.length) : undefined
  const teamAvg = stats.avgOverall === undefined ? undefined : Math.round(stats.avgOverall)

  return (
    <section aria-label="Kadro özeti" className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
      <Tile label="Takım ortalaması" sub={`${stats.count} oyuncu kayıtlı`}>
        <span aria-label={teamAvg === undefined ? 'Takım ortalaması bilinmiyor' : `Takım ortalaması ${teamAvg}`}>
          <OvrBox value={teamAvg} />
        </span>
      </Tile>
      <Tile label="İlk 11 ortalaması" sub={isMain ? 'Ana taktiğe göre' : undefined}>
        {pending ? <Skeleton className="h-9 w-9" /> : isMain && starterAvg !== undefined ? (
          <span aria-label={`İlk 11 ortalaması ${starterAvg}`}><OvrBox value={starterAvg} /></span>
        ) : <span className="text-sm text-muted">Ana taktik yok</span>}
      </Tile>
      <Tile label="Ortalama yaş" sub={stats.loanedOut ? `${stats.loanedOut} oyuncu kiralıkta` : undefined}>
        <span className="font-display text-[28px] font-bold leading-7 tabular-nums text-ink">{decimal(stats.avgAge) ?? '–'}</span>
      </Tile>
    </section>
  )
}
