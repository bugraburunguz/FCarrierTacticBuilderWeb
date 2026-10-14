import { useInfiniteQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { Input, Select } from '../../components/ui'
import { MobileSheet, useIsMobile } from '../../design/components/MobileSheet'
import { VirtualChunk } from '../../design/components/VirtualChunk'
import { Button, Chip, EmptyState, ErrorState, Segmented, Skeleton } from '../../design/components/primitives'
import { POSITIONS } from '../../lib/format'
import { activeFilterCount, CARD_PAGE_SIZE, filtersFromParams, filtersToParams, toPlayerQuery, type CardFilters, type CardSort } from './cardFilters'
import { CardFilterFields } from './CardFilterFields'
import { CardTable } from './CardTable'
import { CardTile } from './CardTile'

const STALE_MS = 120_000
const SKELETONS = 12
/** Pencereleme parça boyutu (kart) ve ilk yükseklik tahmini (px); ölçülünce gerçek yükseklik kullanılır. */
export const CHUNK = 24
const CHUNK_ESTIMATE = 1400
const chunked = <T,>(items: T[]): T[][] => Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) => items.slice(i * CHUNK, (i + 1) * CHUNK))
const TEXT_SORTS = ['name', 'club', 'league', 'position']
const SORT_LABEL: { id: CardSort; label: string }[] = [
  { id: 'overall', label: 'OVR' },
  { id: 'name', label: 'İsim' },
  { id: 'age', label: 'Yaş' },
  { id: 'weakfoot', label: 'Zayıf ayak' },
  { id: 'skillmoves', label: 'Hareket' },
]

function SortSelect({ filters, set }: { filters: CardFilters; set: (patch: Partial<CardFilters>) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted">
      Sırala
      <Select value={filters.sort} onChange={(e) => set({ sort: e.target.value as CardSort, order: TEXT_SORTS.includes(e.target.value) ? 'asc' : 'desc' })}>
        {SORT_LABEL.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </Select>
    </label>
  )
}

/** UT kart veritabanı (Katalog şablonu): yapışkan cam filtre çubuğu, ızgara/tablo geçişi, "daha fazla yükle". Süzgeçler adres çubuğunda. */
export function CardDatabasePage() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const set = (patch: Partial<CardFilters>) => setParams(filtersToParams({ ...filters, ...patch }), { replace: true })
  const mobile = useIsMobile()
  const [sheet, setSheet] = useState(false)
  const extra = activeFilterCount(filters)

  const query = useInfiniteQuery({
    queryKey: ['card-db', params.toString()],
    queryFn: ({ pageParam }) => endpoints.players(toPlayerQuery(filters, pageParam)),
    initialPageParam: 0,
    getNextPageParam: (last) => ((last.page + 1) * last.size < last.totalItems ? last.page + 1 : undefined),
    staleTime: STALE_MS,
  })
  const players = query.data?.pages.flatMap((p) => p.items) ?? []
  const total = query.data?.pages[0]?.totalItems ?? 0

  function sortBy(key: CardSort) {
    set(filters.sort === key ? { order: filters.order === 'asc' ? 'desc' : 'asc' } : { sort: key, order: TEXT_SORTS.includes(key) ? 'asc' : 'desc' })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 py-2">
      <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Kart veritabanı</h1>

      <div className="z-20 min-[820px]:sticky min-[820px]:top-16">
        <section aria-label="Süzgeçler" className="glass glass-sticky flex flex-col gap-3 p-3 sm:px-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="relative flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-muted">
              Ara
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 text-muted" />
              <Input type="search" value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder="Oyuncu adı" className="pl-9" />
            </label>
            {!mobile && <SortSelect filters={filters} set={set} />}
            <Segmented label="Görünüm" value={filters.view} options={[{ id: 'grid', label: 'Izgara' }, { id: 'table', label: 'Tablo' }]} onChange={(view) => set({ view })} />
            {mobile && (
              <Button onClick={() => setSheet(true)} aria-haspopup="dialog" className="gap-2">
                <SlidersHorizontal size={16} aria-hidden="true" />
                Filtreler{extra > 0 ? ` (${extra})` : ''}
              </Button>
            )}
          </div>
          <div role="group" aria-label="Mevki" className="flex gap-1.5 max-[819px]:-mx-3 max-[819px]:overflow-x-auto max-[819px]:px-3 max-[819px]:pb-1 min-[820px]:flex-wrap">
            {POSITIONS.map((pos) => (
              <Chip key={pos} pressed={filters.pos.includes(pos)} onClick={() => set({ pos: filters.pos.includes(pos) ? filters.pos.filter((x) => x !== pos) : [...filters.pos, pos] })}>{pos}</Chip>
            ))}
          </div>
          {!mobile && (
            <details open={extra > 0} className="text-sm">
              <summary className="min-h-8 cursor-pointer text-xs font-semibold text-accent">Daha fazla filtre{extra > 0 ? ` (${extra})` : ''}</summary>
              <div className="pt-2"><CardFilterFields filters={filters} set={set} /></div>
            </details>
          )}
        </section>
      </div>

      {mobile && sheet && (
        <MobileSheet title="Filtreler" onClose={() => setSheet(false)}>
          <div className="flex flex-col gap-3">
            <SortSelect filters={filters} set={set} />
            <CardFilterFields filters={filters} set={set} />
            <div className="flex gap-2">
              <Button onClick={() => set({ gender: 0, league: undefined, nat: undefined, ovrMin: undefined, ovrMax: undefined, wfMin: undefined, smMin: undefined, foot: undefined, pos: [] })}>Temizle</Button>
              <Button variant="primary" onClick={() => setSheet(false)}>{total} kartı göster</Button>
            </div>
          </div>
        </MobileSheet>
      )}

      {query.isLoading ? (
        <ul aria-busy="true" aria-label="Yükleniyor" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: SKELETONS }, (_, i) => (
            <li key={i}><Skeleton className="h-[260px]" /></li>
          ))}
        </ul>
      ) : query.isError ? (
        <ErrorState message="Kartlar yüklenemedi." onRetry={() => query.refetch()} />
      ) : players.length === 0 ? (
        <EmptyState action={params.size > 0 ? <Button onClick={() => setParams({}, { replace: true })}>Süzgeçleri temizle</Button> : undefined}>
          {params.size > 0 ? 'Bu süzgeçlere uyan kart yok.' : 'Henüz kart yok.'}
        </EmptyState>
      ) : (
        <>
          <p role="status" className="text-xs text-muted">{total.toLocaleString('tr-TR')} kart · {players.length} gösteriliyor</p>
          {filters.view === 'table' ? (
            <CardTable groups={chunked(players)} filters={filters} onSort={sortBy} />
          ) : (
            <div className="flex flex-col gap-3">
              {chunked(players).map((group) => (
                <VirtualChunk key={group[0].id} estimate={CHUNK_ESTIMATE}>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                    {group.map((p) => (
                      <CardTile key={p.id} player={p} />
                    ))}
                  </ul>
                </VirtualChunk>
              ))}
            </div>
          )}
          {query.hasNextPage && (
            <div className="flex justify-center">
              <Button onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} disabledReason={query.isFetchingNextPage ? 'Yükleniyor…' : undefined}>
                {CARD_PAGE_SIZE} kart daha yükle
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
