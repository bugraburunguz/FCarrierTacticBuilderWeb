import { useQuery } from '@tanstack/react-query'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { EmptyState, ErrorState, Segmented, SidePanel, Skeleton } from '../../design/components/primitives'
import { CAREER_PAGE_WIDTH } from '../../design/careerPage'
import { isPlateau } from '../../lib/deskRules'
import { useActiveCareerId } from '../../state/careerStore'
import { useYouthOpener } from '../academy/useYouthOpener'
import { YouthList } from '../academy/YouthList'
import { YouthDetailBody } from '../academy/YouthDetailBody'
import { movers, seasonStartRange, type Mover } from './growthData'

type Range = 'last' | 'season'

function Section({ title, children, actions, subtitle }: { title: string; children: ReactNode; actions?: ReactNode; subtitle?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="glass-2 flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id={id} className="font-display text-xl font-semibold leading-6">{title}</h2>
          {subtitle && <p className="text-xs text-ink-2">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}

/** "▲ Nyoni +3 (66→69)" — düz metin; yön ok ve işaretle de yazar (renk tek başına anlam taşımaz). */
const moverText = (m: Mover) => `${m.delta > 0 ? '▲' : '▼'} ${m.name} ${m.delta > 0 ? '+' : '−'}${Math.abs(m.delta)} (${m.from}→${m.to})`

/**
 * Gelişim (ACADEMY-b §3): "Kadromdaki gençler doğru gelişiyor mu?". Gelişim planları (A takım ≤ 23 yaş, potansiyeli OVR'den ≥ 5 yüksek + kiralıktaki
 * gençler; Altyapı satır biçimi ve paneli; geçmiş istemez) ve "Son içe aktarmadan beri" düz listesi (▲/▼, fark, önce→şimdi; plato satır içinde; iki
 * içe aktarma ister). Oyuncu seçici ve geçmiş grafiği oyuncu sayfasının Gelişim sekmesinde.
 */
export function GrowthPage() {
  const careerId = useActiveCareerId()
  const [range, setRange] = useState<Range>('last')
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id!), enabled: id !== undefined })
  const youth = useQuery({ queryKey: ['youth', id], queryFn: () => endpoints.youth(id!), enabled: id !== undefined, staleTime: 300_000 })
  const snapshots = useQuery({ queryKey: ['snapshots', id], queryFn: () => endpoints.snapshots(id!), enabled: id !== undefined, retry: false })
  const enough = (snapshots.data?.length ?? 0) >= 2
  const season = useMemo(() => seasonStartRange(snapshots.data ?? []), [snapshots.data])
  const span = range === 'season' && season ? season : undefined
  const diff = useQuery({ queryKey: ['snapshot-diff', id, span?.from, span?.to, snapshots.data?.length], queryFn: () => endpoints.snapshotDiff(id!, span?.from, span?.to), enabled: id !== undefined && enough, retry: false })
  const { open, close, selectedId } = useYouthOpener('gelisim')

  const members = useMemo(() => new Map((squad.data ?? []).map((c) => [c.player.id, c.player])), [squad.data])
  // Yalnız kadro: fark tüm kayıt dünyasını kapsar (altyapı ve başka takımlar dahil).
  const moved = useMemo(() => {
    const { risers, fallers } = movers((diff.data?.rows ?? []).filter((r) => members.has(r.playerId)))
    return [...risers, ...fallers]
  }, [diff.data, members])
  // Masa'nın "Süre ver ya da kirala" bağlantısı plan listesinde olmayan kadro oyuncusunu da açar (panel ucu kadro oyuncusu için çalışır).
  const selected = selectedId === undefined ? undefined
    : youth.data?.find((p) => p.playerId === selectedId) ?? (members.has(selectedId) ? { playerId: selectedId, name: members.get(selectedId)!.name } : undefined)

  if (careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  const heading = <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Gelişim</h1>
  if (!career) {
    return (
      <div className={`mx-auto ${CAREER_PAGE_WIDTH} py-2`}>
        {heading}
        <EmptyState action={<Link to="/career/new" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Yeni kariyer başlat</Link>}>Önce bir kariyer başlat.</EmptyState>
      </div>
    )
  }

  return (
    <div className={`mx-auto flex w-full ${CAREER_PAGE_WIDTH} flex-col gap-3 py-2`}>
      <header>{heading}</header>
      <div className="flex flex-col gap-3 min-[820px]:flex-row min-[820px]:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Section title="Gelişim planları" subtitle="A takımda 23 yaş ve altı + kiralıktaki gençler · tahmin">
            {youth.isLoading ? <Skeleton className="h-40" /> : youth.isError && !youth.data ? (
              <ErrorState message="Gelişim planları yüklenemedi." onRetry={() => youth.refetch()} />
            ) : (youth.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-2">Gelişim planı önerilecek genç yok (≤ 23 yaş, potansiyeli OVR'den en az 5 yüksek).</p>
            ) : (
              <YouthList players={youth.data!} label="Gelişim planları" onOpen={open} selectedId={selectedId} />
            )}
          </Section>

          <Section title="Son içe aktarmadan beri" actions={enough ? (
            <Segmented label="Aralık" value={range} onChange={setRange}
              options={[{ id: 'last', label: 'Son iki içe aktarma' }, ...(season ? [{ id: 'season' as const, label: 'Sezon başı → şimdi' }] : [])]} />
          ) : undefined}>
            {snapshots.isLoading ? <Skeleton className="h-24" /> : snapshots.isError ? <ErrorState message="İçe aktarma geçmişi yüklenemedi." onRetry={() => snapshots.refetch()} /> : !enough ? (
              <p className="text-sm text-ink-2">İkinci içe aktarmadan sonra görünür.</p>
            ) : diff.isLoading ? <Skeleton className="h-24" /> : diff.isError ? <ErrorState message="Kadro farkı yüklenemedi." onRetry={() => diff.refetch()} /> : moved.length === 0 ? (
              <p className="text-sm text-ink-2">Bu aralıkta OVR'ı değişen yok.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm tabular-nums">
                {moved.map((m) => {
                  const player = members.get(m.playerId)
                  return (
                    <li key={m.playerId}>
                      <span className={m.delta > 0 ? 'text-good' : 'text-bad'}>{moverText(m)}</span>
                      {player && isPlateau(player) && <span className="text-warn">{" ⚠ POT'a ulaştı"}</span>}
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>
        </div>
        {selected && id !== undefined && (
          <SidePanel title={selected.name} onClose={close}>
            <div className="overflow-y-auto"><YouthDetailBody careerId={id} playerId={selected.playerId} /></div>
          </SidePanel>
        )}
      </div>
    </div>
  )
}
