import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { lazy, Suspense, useId, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { EmptyState, ErrorState, Segmented, Skeleton } from '../../design/components/primitives'
import { isPlateau } from '../../lib/deskRules'
import { useActiveCareerId } from '../../state/careerStore'
import { usePageParams } from '../player/playerPage'
import { historySeries, movers, seasonStartRange } from './growthData'

// Grafikler ayrı parça (lazy): sayfa iskeleti önce gelir.
const HistoryChart = lazy(() => import('./GrowthCharts').then((m) => ({ default: m.HistoryChart })))
const MoversChart = lazy(() => import('./GrowthCharts').then((m) => ({ default: m.MoversChart })))

const MOVERS_SHOWN = 8
type Range = 'last' | 'season'

function Section({ title, children, actions, className = '' }: { title: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={`glass-2 flex min-w-0 flex-col gap-3 p-3 sm:p-4 ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="font-display text-xl font-semibold leading-6">{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  )
}

/**
 * Gelişim v3 (V3-06e, 08 §10): oyuncu seçici (?oyuncu=) → OVR/POT geçmişi grafiği (x = kayıt anındaki oyun tarihi, yoksa içe aktarma sırası),
 * plato uyarısı (deskRules.isPlateau), kadro geneli en çok yükselenler / düşenler (snapshotDiff; aralık: son iki içe aktarma ya da sezon başı → şimdi).
 * Yalnız mevcut uçlar: squad, snapshots, snapshotDiff, playerHistory. Yeni puanlama ya da projeksiyon yok.
 */
export function GrowthPage() {
  const careerId = useActiveCareerId()
  const { params, set } = usePageParams()
  const [range, setRange] = useState<Range>('last')
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id!), enabled: id !== undefined })
  const snapshots = useQuery({ queryKey: ['snapshots', id], queryFn: () => endpoints.snapshots(id!), enabled: id !== undefined, retry: false })
  const enough = (snapshots.data?.length ?? 0) >= 2
  const season = useMemo(() => seasonStartRange(snapshots.data ?? []), [snapshots.data])
  const span = range === 'season' && season ? season : undefined
  const diff = useQuery({ queryKey: ['snapshot-diff', id, span?.from, span?.to, snapshots.data?.length], queryFn: () => endpoints.snapshotDiff(id!, span?.from, span?.to), enabled: id !== undefined && enough, retry: false })

  const players = squad.data ?? []
  // ?oyuncu= (v3); eski ?player= bağlantıları da açılır.
  const wanted = Number(params.get('oyuncu') ?? params.get('player'))
  const selected = players.find((c) => c.player.id === wanted) ?? players[0]
  const selectedId = selected?.player.id
  const history = useQuery({ queryKey: ['history', id, selectedId], queryFn: () => endpoints.playerHistory(id!, selectedId!), enabled: id !== undefined && selectedId !== undefined && enough, retry: false })
  const series = useMemo(() => (history.data && history.data.length > 0 ? historySeries(history.data) : undefined), [history.data])
  const moved = useMemo(() => movers(diff.data?.rows ?? []), [diff.data])

  if (careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  if (!career) {
    return (
      <div className="mx-auto max-w-[1280px] py-2">
        <h1 className="mb-3 font-display text-[26px] font-bold leading-[30px] sm:text-[32px] sm:leading-9">Gelişim</h1>
        <EmptyState action={<Link to="/career/new" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Yeni kariyer başlat</Link>}>Önce bir kariyer başlat.</EmptyState>
      </div>
    )
  }

  const importLink = <Link to="/career/import" className="inline-flex min-h-10 items-center rounded-[var(--radius-sm)] bg-accent px-3 text-sm font-semibold text-on-accent hover:opacity-90 max-sm:min-h-11">İçe aktar</Link>

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 py-2">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Gelişim</h1>
        {players.length > 0 && (
          <label className="flex max-w-md flex-col gap-1 text-xs font-medium text-ink-2">
            Oyuncu
            <select value={selectedId ?? ''} onChange={(e) => set({ oyuncu: e.target.value, player: undefined })}
              className="glass-3 min-h-10 rounded-[var(--radius-sm)] px-3 text-sm text-ink max-sm:min-h-11">
              {players.map((c) => <option key={c.player.id} value={c.player.id}>{c.player.name} · {c.player.positions[0]} · {c.player.overall}</option>)}
            </select>
          </label>
        )}
      </header>

      {snapshots.isLoading ? <Skeleton className="h-64" /> : snapshots.isError ? <ErrorState message="İçe aktarma geçmişi yüklenemedi." onRetry={() => snapshots.refetch()} /> : !enough ? (
        <EmptyState action={importLink}>Gelişimi görmek için en az iki içe aktarma gerekir.</EmptyState>
      ) : (
        <>
          <Section title="OVR geçmişi">
            {selected && isPlateau(selected.player) && (
              <div role="status" aria-label="Plato" className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--warn)] px-3 py-2 text-sm text-warn">
                <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                <span><b>Plato:</b> {selected.player.name} potansiyeline ulaştı ({selected.player.overall}/{selected.player.potential}); bundan sonra yükselişi sınırlı olabilir.</span>
              </div>
            )}
            {history.isLoading ? <Skeleton className="h-60" /> : history.isError ? <ErrorState message="Gelişim geçmişi yüklenemedi." onRetry={() => history.refetch()} /> : !series ? (
              <EmptyState>Bu oyuncunun içe aktarma geçmişi yok.</EmptyState>
            ) : (
              <Suspense fallback={<Skeleton className="h-60" />}>
                <HistoryChart series={series} />
              </Suspense>
            )}
          </Section>

          <div className="flex items-center gap-2">
            <Segmented label="Aralık" value={range} onChange={setRange}
              options={[{ id: 'last', label: 'Son iki içe aktarma' }, ...(season ? [{ id: 'season' as const, label: 'Sezon başı → şimdi' }] : [])]} />
          </div>
          {diff.isError ? <ErrorState message="Kadro farkı yüklenemedi." onRetry={() => diff.refetch()} /> : (
            <div className="flex flex-col gap-3 min-[1024px]:flex-row min-[1024px]:items-start">
              <Section title="En çok yükselenler" className="min-[1024px]:flex-1">
                {diff.isLoading ? <Skeleton className="h-40" /> : moved.risers.length === 0 ? <p className="text-sm text-ink-2">Bu aralıkta OVR'ı yükselen yok.</p> : (
                  <Suspense fallback={<Skeleton className="h-40" />}>
                    <MoversChart movers={moved.risers.slice(0, MOVERS_SHOWN)} caption="En çok yükselenler: OVR farkı" />
                  </Suspense>
                )}
              </Section>
              <Section title="Düşenler" className="min-[1024px]:flex-1">
                {diff.isLoading ? <Skeleton className="h-40" /> : moved.fallers.length === 0 ? <p className="text-sm text-ink-2">Bu aralıkta OVR'ı düşen yok.</p> : (
                  <Suspense fallback={<Skeleton className="h-40" />}>
                    <MoversChart movers={moved.fallers.slice(0, MOVERS_SHOWN)} caption="Düşenler: OVR farkı" />
                  </Suspense>
                )}
              </Section>
            </div>
          )}
        </>
      )}
    </div>
  )
}
