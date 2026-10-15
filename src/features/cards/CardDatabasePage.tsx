import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { Select } from '../../components/ui'
import { MobileSheet, useIsMobile } from '../../design/components/MobileSheet'
import { Button, Segmented } from '../../design/components/primitives'
import { CatalogResults } from '../catalog/CatalogResults'
import { CatalogFiltersButton, CatalogSearch, CatalogShell, MoreFilters, PositionChips } from '../catalog/CatalogShell'
import { activeFilterCount, filtersFromParams, filtersToParams, toPlayerQuery, type CardFilters, type CardSort } from './cardFilters'
import { CardFilterFields } from './CardFilterFields'
import { CardTable } from './CardTable'
import { CardTile } from './CardTile'

const STALE_MS = 120_000
const TEXT_SORTS = ['name', 'club', 'league', 'position']
const SORT_LABEL: { id: CardSort; label: string }[] = [
  { id: 'overall', label: 'OVR' },
  { id: 'name', label: 'İsim' },
  { id: 'age', label: 'Yaş' },
  { id: 'weakfoot', label: 'Zayıf ayak' },
  { id: 'skillmoves', label: 'Hareket' },
]
const TEXTS = { noun: 'kart', error: 'Kartlar yüklenemedi.', empty: 'Henüz kart yok.', emptyFiltered: 'Bu süzgeçlere uyan kart yok.' }

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

/** UT kart veritabanı (Katalog şablonu, ortak parçalar src/features/catalog): yapışkan cam filtre çubuğu, ızgara/tablo, "daha fazla yükle". Süzgeçler adres çubuğunda. */
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
  const total = query.data?.pages[0]?.totalItems ?? 0

  function sortBy(key: CardSort) {
    set(filters.sort === key ? { order: filters.order === 'asc' ? 'desc' : 'asc' } : { sort: key, order: TEXT_SORTS.includes(key) ? 'asc' : 'desc' })
  }

  const bar = (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <CatalogSearch value={filters.q} onChange={(q) => set({ q })} />
        {!mobile && <SortSelect filters={filters} set={set} />}
        <Segmented label="Görünüm" value={filters.view} options={[{ id: 'grid', label: 'Izgara' }, { id: 'table', label: 'Tablo' }]} onChange={(view) => set({ view })} />
        {mobile && <CatalogFiltersButton count={extra} onOpen={() => setSheet(true)} />}
      </div>
      <PositionChips value={filters.pos} onChange={(pos) => set({ pos })} />
      {!mobile && <MoreFilters count={extra}><CardFilterFields filters={filters} set={set} /></MoreFilters>}
    </>
  )

  return (
    <CatalogShell title="Kart veritabanı" bar={bar}>
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
      <CatalogResults
        query={query}
        view={filters.view}
        texts={TEXTS}
        filtered={params.size > 0}
        onClear={() => setParams({}, { replace: true })}
        renderTile={(p, cardWidth) => <CardTile key={p.id} player={p} cardWidth={cardWidth} />}
        renderTable={(groups) => <CardTable groups={groups} filters={filters} onSort={sortBy} />}
      />
    </CatalogShell>
  )
}
