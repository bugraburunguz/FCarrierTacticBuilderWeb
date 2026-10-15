import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayerFacets, PlayerSummary } from '../../api/types'
import { CompareButton } from '../../components/CompareButton'
import { Select } from '../../components/ui'
import { MobileSheet, useIsMobile } from '../../design/components/MobileSheet'
import { Button, Chip, Segmented } from '../../design/components/primitives'
import { formatEur } from '../../lib/format'
import { CatalogResults } from '../catalog/CatalogResults'
import { CatalogFiltersButton, CatalogSearch, CatalogShell, MoreFilters, PositionChips } from '../catalog/CatalogShell'
import { CatalogTable, type CatalogColumn } from '../catalog/CatalogTable'
import { CatalogTile } from '../catalog/CatalogTile'
import { activeCareerFilterCount, BUCKETS, budgetKnown, careerFiltersFromParams, careerFiltersToParams, DEFAULT_CAREER_FILTERS, TEXT_SORTS, toCareerQuery, type CareerListFilters, type CareerSort } from './careerFilters'
import { CareerFilterFields } from './CareerFilterFields'

const STALE_MS = 120_000
const ROLES_STALE_MS = 600_000
const TEXTS = { noun: 'oyuncu', error: 'Oyuncular yüklenemedi.', empty: 'Kayıtta oyuncu yok.', emptyFiltered: 'Bu süzgeçlere uyan oyuncu yok.' }
const SORT_LABEL: { id: CareerSort; label: string }[] = [
  { id: 'overall', label: 'OVR' },
  { id: 'potential', label: 'POT' },
  { id: 'age', label: 'Yaş' },
  { id: 'value', label: 'Değer' },
  { id: 'name', label: 'İsim' },
]
const NUM = 'font-[var(--font-num)] tabular-nums'
const playerHref = (p: PlayerSummary) => `/players/${p.id}`
const contractText = (date?: string) => (date ? new Date(`${date}T00:00:00`).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }) : '–')

const DOT = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' } as const

/** Kova çipi: nötr çip + renkli nokta (açık temada tonlu çip zemini cam üstünde 4.5:1'in altına düşüyor; anlam metinde). */
function BucketChip({ player }: { player: PlayerSummary }) {
  const bucket = BUCKETS.find((b) => b.id === player.feasibility)
  return bucket ? (
    <Chip>
      <span aria-hidden="true" className={`size-2 rounded-full ${DOT[bucket.tone]}`} />
      {bucket.label}
    </Chip>
  ) : <span className="text-ink-2">–</span>
}

function columns(facets: CareerPlayerFacets | undefined, role: boolean): CatalogColumn<PlayerSummary, CareerSort>[] {
  const cols: (CatalogColumn<PlayerSummary, CareerSort> | false)[] = [
    { sort: 'overall', label: 'OVR', align: 'right', cellClassName: NUM, cell: (p) => p.overall },
    { sort: 'name', label: 'Oyuncu', cell: (p) => <Link to={playerHref(p)} className="font-medium text-ink hover:underline">{p.name}</Link> },
    { sort: 'potential', label: 'POT', align: 'right', cellClassName: `${NUM} text-ink-2`, cell: (p) => p.potentialRange ?? p.potential ?? '–' },
    { sort: 'age', label: 'Yaş', align: 'right', cellClassName: `${NUM} text-ink-2`, cell: (p) => p.age ?? '–' },
    { sort: 'position', label: 'Mevki', cellClassName: 'font-[var(--font-num)] text-xs text-ink-2', cell: (p) => p.positions.join(' ') },
    { sort: 'club', label: 'Kulüp', cellClassName: 'max-w-[160px] truncate text-ink-2', cell: (p) => p.club ?? '–' },
    { sort: 'value', label: 'Değer', align: 'right', cellClassName: `${NUM} whitespace-nowrap text-ink-2`, cell: (p) => (p.valueEur === undefined ? '–' : `${p.valuationEstimated ? '≈' : ''}${formatEur(p.valueEur)}`) },
    Boolean(facets?.contractData) && { label: 'Sözleşme', cellClassName: 'whitespace-nowrap text-ink-2', cell: (p) => contractText(p.contractUntil) },
    { label: 'Ulaşılabilirlik', cell: (p) => <BucketChip player={p} /> },
    role && { sort: 'role', label: 'Rol uyumu', align: 'right', cellClassName: NUM, cell: (p) => p.roleFit?.toFixed(1) ?? '–' },
    { label: <span className="sr-only">Karşılaştır</span>, align: 'right', cell: (p) => <CompareButton entry={{ id: p.id, name: p.name, overall: p.overall, position: p.positions[0] ?? '' }} compact /> },
  ]
  return cols.filter((c): c is CatalogColumn<PlayerSummary, CareerSort> => c !== false)
}

function SortSelect({ filters, set }: { filters: CareerListFilters; set: (patch: Partial<CareerListFilters>) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted">
      Sırala
      <Select value={filters.sort} onChange={(e) => set({ sort: e.target.value as CareerSort, order: TEXT_SORTS.includes(e.target.value as CareerSort) ? 'asc' : 'desc' })}>
        {SORT_LABEL.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
        {filters.role && <option value="role">Rol uyumu</option>}
      </Select>
    </label>
  )
}

/** Rol seçimi: sunucu tüm süzülmüş havuzu FitEngineV3 ile bu role göre sıralar (eski fit/roleFit uçları kullanılmaz). */
function RoleSelect({ filters, set }: { filters: CareerListFilters; set: (patch: Partial<CareerListFilters>) => void }) {
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles, staleTime: ROLES_STALE_MS })
  const sorted = useMemo(() => [...(roles.data ?? [])].sort((a, b) => `${a.positions[0]}${a.name}`.localeCompare(`${b.positions[0]}${b.name}`, 'tr')), [roles.data])
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted">
      Rol uyumu
      <Select value={filters.role ?? ''} onChange={(e) => set(e.target.value ? { role: e.target.value, sort: 'role' } : { role: undefined, sort: filters.sort === 'role' ? DEFAULT_CAREER_FILTERS.sort : filters.sort })}>
        <option value="">Rol seç</option>
        {sorted.map((r) => (
          <option key={r.id} value={r.id}>{r.positions[0]} · {r.name}</option>
        ))}
      </Select>
    </label>
  )
}

/**
 * Kariyer oyuncu listesi (v3 Katalog şablonu, kart veritabanıyla ortak parçalar): havuz kariyer kaydının oyuncuları (career=…).
 * Süzgeçler adres çubuğunda; kova (ALINABILIR/ZOR/HAYAL) öneri hattının sınıflandırıcısından, HAYAL varsayılan olarak gizlenmez.
 */
export function CareerPlayersPage({ careerId }: { careerId: number }) {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => careerFiltersFromParams(params), [params])
  const set = (patch: Partial<CareerListFilters>) => setParams(careerFiltersToParams({ ...filters, ...patch }), { replace: true })
  const mobile = useIsMobile()
  const [sheet, setSheet] = useState(false)
  const extra = activeCareerFilterCount(filters)

  const facets = useQuery({ queryKey: ['player-facets', careerId], queryFn: () => endpoints.playerFacets(careerId), staleTime: STALE_MS })
  const query = useInfiniteQuery({
    queryKey: ['career-players', careerId, params.toString(), facets.data ?? null],
    queryFn: ({ pageParam }) => endpoints.players(toCareerQuery(filters, careerId, facets.data, pageParam)),
    initialPageParam: 0,
    getNextPageParam: (last) => ((last.page + 1) * last.size < last.totalItems ? last.page + 1 : undefined),
    staleTime: STALE_MS,
    enabled: !facets.isLoading,
  })
  const total = query.data?.pages[0]?.totalItems ?? 0
  const roleSort = filters.sort === 'role' && filters.role !== undefined
  const cols = useMemo(() => columns(facets.data, roleSort), [facets.data, roleSort])

  function sortBy(key: CareerSort) {
    if (key === 'role') {
      return
    }
    set(filters.sort === key ? { order: filters.order === 'asc' ? 'desc' : 'asc' } : { sort: key, order: TEXT_SORTS.includes(key) ? 'asc' : 'desc' })
  }

  const subtitle = (
    <p className="text-sm text-ink-2">
      Kariyer kaydındaki oyuncular{budgetKnown(facets.data) ? ` · Bütçe ${formatEur(facets.data.budgetEur)}` : ''}
    </p>
  )
  const bar = (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <CatalogSearch value={filters.q} onChange={(q) => set({ q })} />
        {!mobile && <RoleSelect filters={filters} set={set} />}
        {!mobile && <SortSelect filters={filters} set={set} />}
        <Segmented label="Görünüm" value={filters.view} options={[{ id: 'grid', label: 'Izgara' }, { id: 'table', label: 'Tablo' }]} onChange={(view) => set({ view })} />
        {mobile && <CatalogFiltersButton count={extra} onOpen={() => setSheet(true)} />}
      </div>
      <PositionChips value={filters.pos} onChange={(pos) => set({ pos })} />
      {!mobile && <MoreFilters count={extra}><CareerFilterFields careerId={careerId} filters={filters} set={set} facets={facets.data} /></MoreFilters>}
    </>
  )

  return (
    <CatalogShell title="Oyuncular" subtitle={subtitle} bar={bar}>
      {mobile && sheet && (
        <MobileSheet title="Filtreler" onClose={() => setSheet(false)}>
          <div className="flex flex-col gap-3">
            <RoleSelect filters={filters} set={set} />
            <SortSelect filters={filters} set={set} />
            <CareerFilterFields careerId={careerId} filters={filters} set={set} facets={facets.data} />
            <div className="flex gap-2">
              <Button onClick={() => setParams(careerFiltersToParams({ ...DEFAULT_CAREER_FILTERS, q: filters.q, view: filters.view }), { replace: true })}>Temizle</Button>
              <Button variant="primary" onClick={() => setSheet(false)}>{total} oyuncuyu göster</Button>
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
        renderTile={(p, cardWidth) => (
          <CatalogTile key={p.id} player={p} cardWidth={cardWidth} href={playerHref(p)} extra={(
            <div className="flex w-full flex-wrap items-center justify-center gap-1.5 text-xs text-ink-2">
              <BucketChip player={p} />
              {p.valueEur !== undefined && <span className={NUM}>{p.valuationEstimated ? '≈' : ''}{formatEur(p.valueEur)}</span>}
              {roleSort && p.roleFit !== undefined && <span className="inline-flex gap-1">Rol <span className={`${NUM} text-ink`}>{p.roleFit.toFixed(1)}</span></span>}
            </div>
          )} />
        )}
        renderTable={(groups) => <CatalogTable caption="Kariyer oyuncuları" columns={cols} groups={groups} sort={filters.sort} order={filters.order} onSort={sortBy} minWidth={900} />}
      />
    </CatalogShell>
  )
}
