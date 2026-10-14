import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { Input, Select } from '../../components/ui'
import { MobileSheet, useIsMobile } from '../../design/components/MobileSheet'
import { Button, Chip, EmptyState, ErrorState, Skeleton } from '../../design/components/primitives'
import { ReplicaCard } from './ReplicaCard'
import { BUILD_UP_LABEL, CATEGORY_LABEL, CATEGORY_ORDER } from './labels'
import { filterReplicas, filtersFromParams, filtersToParams, sortReplicas, type ReplicaFilters } from './replicaFilter'

const STALE_MS = 600_000
const SKELETONS = 6

function FilterFields({ filters, set, formationOptions }: { filters: ReplicaFilters; set: (patch: Partial<ReplicaFilters>) => void; formationOptions: string[] }) {
  return (
    <>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Formasyon
            <Select value={filters.formation} onChange={(e) => set({ formation: e.target.value })}>
              <option value="">Hepsi</option>
              {formationOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Build-up
            <Select value={filters.buildUp} onChange={(e) => set({ buildUp: e.target.value as ReplicaFilters['buildUp'] })}>
              <option value="ALL">Hepsi</option>
              {Object.entries(BUILD_UP_LABEL).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </Select>
          </label>
          <fieldset className="flex flex-col gap-1 text-xs font-medium text-muted">
            <legend className="mb-1">Dönem (yıl)</legend>
            <div className="flex items-center gap-1.5">
              <Input type="number" inputMode="numeric" min={1950} max={2030} aria-label="Başlangıç yılı" placeholder="1990" value={filters.from ?? ''} onChange={(e) => set({ from: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-[84px]" />
              <span aria-hidden="true">–</span>
              <Input type="number" inputMode="numeric" min={1950} max={2030} aria-label="Bitiş yılı" placeholder="2025" value={filters.to ?? ''} onChange={(e) => set({ to: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-[84px]" />
            </div>
          </fieldset>
      </>
  )
}

/** Replikalar (Katalog şablonu): yapışkan cam filtre çubuğu + kart ızgarası. Süzgeçler adres çubuğunda durur. */
export function ReplicasPage() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const set = (patch: Partial<ReplicaFilters>) => setParams(filtersToParams({ ...filters, ...patch }), { replace: true })

  const replicas = useQuery({ queryKey: ['replicas'], queryFn: endpoints.replicas, staleTime: STALE_MS })
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: STALE_MS })
  const formationById = useMemo(() => new Map((formations.data ?? []).map((f) => [f.id, f])), [formations.data])
  const formationOptions = useMemo(() => [...new Set((replicas.data ?? []).map((r) => r.eaFormation))].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true })), [replicas.data])
  const shown = useMemo(() => sortReplicas(filterReplicas(replicas.data ?? [], filters)), [replicas.data, filters])
  const active = filtersToParams(filters).size > 0
  const mobile = useIsMobile()
  const [sheet, setSheet] = useState(false)
  const extraCount = [filters.formation !== '', filters.buildUp !== 'ALL', filters.from !== undefined, filters.to !== undefined].filter(Boolean).length

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-4">
      <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Replikalar</h1>

      <div className="z-20 min-[820px]:sticky min-[820px]:top-16">
      <section aria-label="Süzgeçler" className="glass flex flex-col gap-3 p-3 sm:px-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="relative flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-muted">
            Ara
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 text-muted" />
            <Input type="search" value={filters.query} onChange={(e) => set({ query: e.target.value })} placeholder="Takım, hoca ya da sezon" className="pl-9" />
          </label>
          {!mobile && <FilterFields filters={filters} set={set} formationOptions={formationOptions} />}
          {mobile && (
            <Button onClick={() => setSheet(true)} aria-haspopup="dialog" className="gap-2">
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filtreler{extraCount > 0 ? ` (${extraCount})` : ''}
            </Button>
          )}
        </div>
        <div role="group" aria-label="Kategori" className="flex gap-1.5 max-[819px]:-mx-3 max-[819px]:flex-nowrap max-[819px]:overflow-x-auto max-[819px]:px-3 max-[819px]:pb-1 min-[820px]:flex-wrap">
          <Chip pressed={filters.category === 'ALL'} onClick={() => set({ category: 'ALL' })}>Hepsi</Chip>
          {CATEGORY_ORDER.map((c) => (
            <Chip key={c} pressed={filters.category === c} onClick={() => set({ category: c })}>{CATEGORY_LABEL[c]}</Chip>
          ))}
        </div>
      </section>
      </div>

      {mobile && sheet && (
        <MobileSheet title="Filtreler" onClose={() => setSheet(false)}>
          <div className="flex flex-col gap-3">
            <FilterFields filters={filters} set={set} formationOptions={formationOptions} />
            <div className="flex gap-2">
              <Button onClick={() => set({ formation: '', buildUp: 'ALL', from: undefined, to: undefined })}>Temizle</Button>
              <Button variant="primary" onClick={() => setSheet(false)}>{shown.length} replikayı göster</Button>
            </div>
          </div>
        </MobileSheet>
      )}

      {replicas.isLoading ? (
        <ul aria-busy="true" aria-label="Yükleniyor" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: SKELETONS }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-[140px]" />
            </li>
          ))}
        </ul>
      ) : replicas.isError ? (
        <ErrorState message="Replikalar yüklenemedi." onRetry={() => replicas.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState action={active ? <Button onClick={() => setParams({}, { replace: true })}>Süzgeçleri temizle</Button> : undefined}>
          {active ? 'Bu süzgeçlere uyan replika yok.' : 'Henüz replika yok.'}
        </EmptyState>
      ) : (
        <>
          <p role="status" className="text-xs text-muted">{shown.length} replika{shown.length !== (replicas.data?.length ?? 0) ? ` / ${replicas.data?.length}` : ''}</p>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((r) => (
              <ReplicaCard key={r.id} replica={r} formation={formationById.get(r.formationId)} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

