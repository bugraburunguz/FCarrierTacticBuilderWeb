import type { ReactNode } from 'react'
import type { CareerPlayer } from '../../api/types'
import { OvrBox, Skeleton } from '../../design/components/primitives'
import { squadStats } from '../careerSquad/careerSquadRules'

const decimal = (value?: number) => (value === undefined ? undefined : value.toLocaleString('tr-TR', { maximumFractionDigits: 1 }))
const XI = 11

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
 * Masa özet şeridi (FCA-3, Stitch telemetri satırı): takım ortalaması, ana taktiğin ilk 11 ortalaması, ortalama yaş. Yalnız eldeki veri.
 * İki ortalama da kiralığa gönderilenleri saymaz (Kadro özetiyle aynı kural). Kadro yüklenirken iskelet; alınamazsa "–" (0 oyuncu yazılmaz).
 */
export function KpiStrip({ squad, starters, isMain, pending, squadState }: {
  squad: CareerPlayer[]; starters: number[]; isMain: boolean; pending: boolean; squadState: 'loading' | 'error' | 'ready'
}) {
  const stats = squadStats(squad)
  const active = new Map(squad.filter((c) => !c.loanedOut).map((c) => [c.player.id, c.player.overall]))
  const starterOvr = starters.flatMap((id) => (active.has(id) ? [active.get(id)!] : []))
  const starterAvg = starterOvr.length ? Math.round(starterOvr.reduce((s, v) => s + v, 0) / starterOvr.length) : undefined
  const ready = squadState === 'ready'
  const teamAvg = ready && stats.avgOverall !== undefined ? Math.round(stats.avgOverall) : undefined
  const loading = squadState === 'loading'

  return (
    <section aria-label="Kadro özeti" className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
      <Tile label="Takım ortalaması" sub={ready ? `${stats.count} oyuncu kayıtlı` : undefined}>
        {loading ? <Skeleton className="h-9 w-9" /> : <OvrBox value={teamAvg} label="Takım ortalaması" />}
      </Tile>
      <Tile label="İlk 11 ortalaması" sub={isMain && ready ? `${starterOvr.length}/${XI} · ana taktiğe göre` : undefined}>
        {pending || loading ? <Skeleton className="h-9 w-9" /> : !isMain ? <span className="text-sm text-muted">Ana taktik yok</span> : (
          <OvrBox value={ready ? starterAvg : undefined} label="İlk 11 ortalaması" />
        )}
      </Tile>
      <Tile label="Ortalama yaş" sub={ready && stats.loanedOut ? `${stats.loanedOut} oyuncu kiralıkta` : undefined}>
        {loading ? <Skeleton className="h-7 w-12" /> : (
          <span className="font-display text-[28px] font-bold leading-7 tabular-nums text-ink">{(ready ? decimal(stats.avgAge) : undefined) ?? '–'}</span>
        )}
      </Tile>
    </section>
  )
}
