import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { Academy } from '../../api/types'
import { Chip, EmptyState, ErrorState, Panel, Segmented, SidePanel, Skeleton, SourceTag, type DataSource } from '../../design/components/primitives'
import { CAREER_PAGE_WIDTH } from '../../design/careerPage'
import { useActiveCareerId } from '../../state/careerStore'
import { usePageParams } from '../player/playerPage'
import { academyQuery } from './academyQuery'
import { highlights, LINES, parseLine, parseSort, SORTS, visiblePlayers, type Highlight } from './academyRules'
import { useYouthOpener } from './useYouthOpener'
import { YouthDetailBody } from './YouthDetailBody'
import { YouthList } from './YouthList'


const IMPORT_LINK = <Link to="/career/import" className="inline-flex min-h-10 items-center rounded-[var(--radius-sm)] bg-accent px-3 text-sm font-semibold text-on-accent hover:opacity-90 max-sm:min-h-11">İçe aktar</Link>

function HighlightCard({ card, onOpen }: { card: Highlight; onOpen: (id: number) => void }) {
  const title = card.kind === 'READY' ? 'A takıma hazır' : card.kind === 'TOP_POTENTIAL' ? 'En yüksek potansiyel' : 'Plan seçilmeli'
  return (
    <article className="glass-3 flex min-w-0 flex-1 flex-col gap-1 rounded-[var(--radius-sm)] p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-2">{title}</h3>

      {card.kind === 'PLAN_NEEDED' ? (
        <a href="#oyuncular" className="text-sm font-semibold text-accent underline-offset-2 hover:underline">{card.text} → öneriye bak</a>
      ) : (
        <>
          <button type="button" onClick={() => onOpen(card.player.playerId)} className="text-left text-sm font-semibold hover:underline">
            {card.player.name} · {card.player.age ?? '—'} · {card.player.bestPosition ?? card.player.positions[0]}
          </button>
          <p className="text-sm text-ink-2">{card.text}</p>
          {card.kind === 'READY' && <span><Chip>tahmin</Chip></span>}
        </>
      )}
    </article>
  )
}

function Body({ academy, careerId }: { academy: Academy; careerId: number }) {
  const { params, set } = usePageParams()
  const sort = parseSort(params.get('sirala'))
  const line = parseLine(params.get('hat'))
  const { open, close, selectedId } = useYouthOpener('altyapi')
  const visible = useMemo(() => visiblePlayers(academy.players, sort, line), [academy.players, sort, line])
  const cards = useMemo(() => highlights(academy.players), [academy.players])
  const selected = academy.players.find((p) => p.playerId === selectedId)

  if (academy.players.length === 0) {
    return academy.teamId === null || academy.teamId === undefined ? (
      <EmptyState action={IMPORT_LINK}>Bu export'ta altyapı görünmüyor. Kariyer içinden export al.</EmptyState>
    ) : (
      <EmptyState>Altyapıda oyuncu yok. Oyunda gençlik scoutlarının getirdiği oyuncular burada görünür.</EmptyState>
    )
  }
  return (
    <div className="flex flex-col gap-3 min-[820px]:flex-row min-[820px]:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {cards.length > 0 && (
          <section aria-labelledby="one-cikanlar" className="flex flex-col gap-2">
            {/* Başlık sırası h1 → h2 → h3 (kart başlıkları h3). */}
            <h2 id="one-cikanlar" className="sr-only">Öne çıkanlar</h2>
            <div className="flex flex-col gap-2 min-[640px]:flex-row">
              {cards.map((c) => <HighlightCard key={c.kind} card={c} onOpen={open} />)}
            </div>
          </section>
        )}
        <Panel title="Oyuncular" actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Segmented label="Sırala" value={sort} options={SORTS} onChange={(v) => set({ sirala: v === 'potansiyel' ? undefined : v })} />
            <Segmented label="Hat" value={line} options={LINES} onChange={(v) => set({ hat: v === 'tumu' ? undefined : v })} />
          </div>
        )}>
          <div id="oyuncular">
            {visible.length === 0 ? <p className="text-sm text-ink-2">Bu hatta oyuncu yok.</p> : <YouthList players={visible} label="Oyuncular" onOpen={open} selectedId={selectedId} />}
          </div>
        </Panel>
      </div>
      {selected && (
        <SidePanel title={selected.name} onClose={close}>
          <div className="overflow-y-auto"><YouthDetailBody careerId={careerId} playerId={selected.playerId} /></div>
        </SidePanel>
      )}
    </div>
  )
}

/**
 * Altyapı (/career/academy, ACADEMY-b §2): "Altyapımda kim var, ne yapmalıyım?". Öne çıkanlar (en çok 3 kart), iki satırlık oyuncu kartları, sıralama ve
 * hat filtresi (?sirala=, ?hat=), satıra tıklayınca sağ panel (mobilde ayrı sayfa). Yalnız sunucu verisi; legacy store ve taslak okunmaz.
 */
export function AcademyPage() {
  const activeId = useActiveCareerId()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === activeId) ?? careers.data?.[0]
  const id = career?.id
  const academy = useQuery({ ...academyQuery(id ?? 0), enabled: id !== undefined })
  const snapshots = useQuery({ queryKey: ['snapshots', id], queryFn: () => endpoints.snapshots(id!), enabled: id !== undefined, retry: false })
  const lastImport = (snapshots.data ?? []).find((s) => s.source === 'IMPORT')
  const record: DataSource | undefined = lastImport ? { kind: 'record', at: lastImport.takenAt } : undefined

  const heading = <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Altyapı</h1>
  if (careers.isLoading) {
    return <Skeleton className="h-64" />
  }
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
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          {heading}
          {academy.data?.found && <p className="text-sm text-ink-2">{academy.data.name ?? 'Altyapı'} · {academy.data.players.length} oyuncu</p>}
        </div>
        {record && <SourceTag source={record} />}
      </header>
      {academy.isLoading ? <Skeleton className="h-64" /> : academy.isError && !academy.data ? (
        <ErrorState message="Altyapı yüklenemedi." onRetry={() => academy.refetch()} />
      ) : academy.data ? <Body academy={academy.data} careerId={career.id} /> : null}
    </div>
  )
}
