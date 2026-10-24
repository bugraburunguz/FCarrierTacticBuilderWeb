import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { Formation, ReplicaApproach, ReplicaBuildUp, ReplicaSummary } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { Input, Select } from '../../components/ui'
import { MobileSheet, useIsMobile } from '../../design/components/MobileSheet'
import { Button, Chip, EmptyState, ErrorState, Skeleton, TabPanel, Tabs } from '../../design/components/primitives'
import { useActiveCareerId } from '../../state/careerStore'
import { useMode } from '../../state/modeStore'
import { ReplicaCloneButton } from '../lab/ReplicaCloneButton'
import { ReplicaCard } from './ReplicaCard'
import { APPROACH_LABEL, BUILD_UP_LABEL, CATEGORY_LABEL, CATEGORY_ORDER, FAMILY_LABEL, FAMILY_ORDER, LEAGUE_TAB_LABEL, LEAGUE_TABS, type LeagueTab } from './labels'
import {
  FILTER_KEYS,
  FIT_KEY,
  FIT_LIMIT,
  filterReplicas,
  filtersFromParams,
  filtersToParams,
  groupByLeague,
  leagueCounts,
  rankByFit,
  sortByClubSeason,
  toggle,
  type ReplicaFilters,
} from './replicaFilter'
import { useReplicaFits } from './useReplicaFits'

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

/** Çip satırı: mobilde yatay kaydırılan tek satır, geniş ekranda sarar. */
function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1.5 max-[819px]:-mx-3 max-[819px]:flex-nowrap max-[819px]:overflow-x-auto max-[819px]:px-3 max-[819px]:pb-1 min-[820px]:flex-wrap">
      {children}
    </div>
  )
}

function CardGrid({ items, formationById, cardAction, fits }: { items: ReplicaSummary[]; formationById: Map<string, Formation>; cardAction?: (r: ReplicaSummary) => ReactNode; fits?: Map<string, number> }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((r) => (
        <ReplicaCard key={r.id} replica={r} formation={formationById.get(r.formationId)} action={cardAction?.(r)} fit={fits?.get(r.id)} />
      ))}
    </ul>
  )
}

/** "Tümü" görünümünde bir lig grubu: başlıkta lig adı ve sayı; başlık düğmesi grubu katlar. */
function LeagueGroupSection({ tab, count, open, onToggle, children }: { tab: LeagueTab; count: number; open: boolean; onToggle: () => void; children: ReactNode }) {
  const panelId = `replica-group-${tab}`
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-semibold leading-6">
        <button type="button" aria-expanded={open} aria-controls={panelId} aria-label={`${LEAGUE_TAB_LABEL[tab]} · ${count}`} onClick={onToggle} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] pr-2 text-ink hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent max-sm:min-h-11">
          <ChevronDown size={18} aria-hidden="true" className={open ? 'motion-safe:transition-transform' : '-rotate-90 motion-safe:transition-transform'} />
          <span>{LEAGUE_TAB_LABEL[tab]}</span>
          <span className="font-[var(--font-num)] text-sm font-medium tabular-nums text-muted">{count}</span>
        </button>
      </h2>
      <div id={panelId} hidden={!open}>
        {open ? children : null}
      </div>
    </section>
  )
}

/**
 * Replikalar (Katalog şablonu): yapışkan cam filtre çubuğu + kart ızgarası. Süzgeçler adres çubuğunda durur.
 * REP-d: lig sekmeleri (`?lig=`, sayılı; mobilde yatay kaydırma), "Tümü"de lige göre katlanabilir gruplar, çoklu seçimli çipler
 * (kategori, formasyon ailesi, oyun tarzı, "Doğrulandı"), kariyer modunda aktif kariyer varken "Kadroma uyanlar" (görünen ilk 12, önbellekli).
 * `embedded` (KARIYER-UX FAZ 4b, Lab › Replikalar): sayfa başlığı yok; süzgeç dışındaki adres parametreleri (Lab `sekme`) korunur; `cardAction` kart eylemi.
 */
export function ReplicasPage({ embedded = false, cardAction }: { embedded?: boolean; cardAction?: (replica: ReplicaSummary) => ReactNode } = {}) {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const withOthers = (next: URLSearchParams) => {
    if (embedded) {
      params.forEach((value, key) => {
        if (!FILTER_KEYS.includes(key) && !next.has(key)) {
          next.set(key, value)
        }
      })
    }
    return next
  }
  const mode = useMode()
  const { authenticated } = useAuth()
  const careerId = useActiveCareerId()
  // "Kadroma uyanlar" yalnız kariyer modunda ve aktif kariyer varken (UT'de sayfa aynı, bu seçenek yok).
  const fitAvailable = mode === 'career' && authenticated && careerId !== undefined
  const fitMode = fitAvailable && params.get(FIT_KEY) === '1'
  const write = (next: ReplicaFilters, fit: boolean) => {
    const out = filtersToParams(next)
    if (fit) {
      out.set(FIT_KEY, '1')
    }
    setParams(withOthers(out), { replace: true })
  }
  const set = (patch: Partial<ReplicaFilters>) => write({ ...filters, ...patch }, fitMode)

  // KARIYER-UX 6: tek başına liste kariyer modunda (oturum + seçili kariyer) Lab ile aynı "Klonla → taslak" eylemini sunar.
  const action = cardAction ?? (!embedded && mode === 'career' && authenticated && careerId !== undefined
    ? (replica: ReplicaSummary) => <ReplicaCloneButton careerId={careerId} replica={replica} />
    : undefined)
  const replicas = useQuery({ queryKey: ['replicas'], queryFn: endpoints.replicas, staleTime: STALE_MS })
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: STALE_MS })
  const formationById = useMemo(() => new Map((formations.data ?? []).map((f) => [f.id, f])), [formations.data])
  const formationOptions = useMemo(() => [...new Set((replicas.data ?? []).map((r) => r.eaFormation))].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true })), [replicas.data])
  const base = useMemo(() => sortByClubSeason(filterReplicas(replicas.data ?? [], filters)), [replicas.data, filters])
  const counts = useMemo(() => leagueCounts(replicas.data ?? [], filters), [replicas.data, filters])
  // Uyum, sıralamadan önceki görünür sıranın ilk 12'si için sorulur (sıralama sorulan kümeyi değiştirmez).
  const { fits, pending: fitPending, failed: fitFailed, computed } = useReplicaFits(base, careerId, fitMode)
  const shown = useMemo(() => (fitMode ? rankByFit(base, fits) : base), [fitMode, base, fits])
  const groups = useMemo(() => (filters.league === 'ALL' && !fitMode ? groupByLeague(base) : []), [filters.league, fitMode, base])
  const [collapsed, setCollapsed] = useState<Set<LeagueTab>>(() => new Set())
  const active = filtersToParams(filters).size > 0
  const mobile = useIsMobile()
  const [sheet, setSheet] = useState(false)
  const extraCount = [filters.formation !== '', filters.from !== undefined, filters.to !== undefined].filter(Boolean).length

  return (
    <div className={embedded ? 'flex w-full flex-col gap-4' : 'mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-4'}>
      {!embedded && <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Replikalar</h1>}

      <div className="z-20 min-[820px]:sticky min-[820px]:top-[var(--header-h)]">
      <section aria-label="Süzgeçler" className="glass glass-sticky flex flex-col gap-3 p-3 sm:px-4">
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
        <div className="max-[819px]:-mx-3 max-[819px]:overflow-x-auto max-[819px]:px-3">
          <div className="min-w-max min-[820px]:min-w-0">
            <Tabs
              label="Lig"
              idPrefix="replica-lig"
              value={filters.league}
              onChange={(league) => set({ league })}
              tabs={LEAGUE_TABS.map((t) => ({
                id: t,
                label: (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span>{LEAGUE_TAB_LABEL[t]}</span>
                    {replicas.data && <span className="font-[var(--font-num)] text-xs font-medium tabular-nums text-muted">{counts[t]}</span>}
                  </span>
                ),
              }))}
            />
          </div>
        </div>
        <ChipRow label="Kategori">
          <Chip pressed={filters.categories.length === 0} onClick={() => set({ categories: [] })}>Hepsi</Chip>
          {CATEGORY_ORDER.map((c) => (
            <Chip key={c} pressed={filters.categories.includes(c)} onClick={() => set({ categories: toggle(filters.categories, c) })}>{CATEGORY_LABEL[c]}</Chip>
          ))}
        </ChipRow>
        <div className="flex gap-x-4 gap-y-2 max-[819px]:-mx-3 max-[819px]:overflow-x-auto max-[819px]:px-3 max-[819px]:pb-1 min-[820px]:flex-wrap">
          <div role="group" aria-label="Formasyon ailesi" className="flex shrink-0 gap-1.5">
            {FAMILY_ORDER.map((f) => (
              <Chip key={f} pressed={filters.families.includes(f)} onClick={() => set({ families: toggle(filters.families, f) })}>{FAMILY_LABEL[f]}</Chip>
            ))}
          </div>
          <div role="group" aria-label="Oyun tarzı" className="flex shrink-0 gap-1.5">
            {(Object.keys(BUILD_UP_LABEL) as ReplicaBuildUp[]).map((b) => (
              <Chip key={b} pressed={filters.buildUps.includes(b)} onClick={() => set({ buildUps: toggle(filters.buildUps, b) })}>{BUILD_UP_LABEL[b]}</Chip>
            ))}
            {(Object.keys(APPROACH_LABEL) as ReplicaApproach[]).map((a) => (
              <Chip key={a} pressed={filters.approaches.includes(a)} onClick={() => set({ approaches: toggle(filters.approaches, a) })}>{APPROACH_LABEL[a]}</Chip>
            ))}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Chip pressed={filters.verified} onClick={() => set({ verified: !filters.verified })}>Doğrulandı</Chip>
            {fitAvailable && (
              <Chip pressed={fitMode} onClick={() => write(filters, !fitMode)} title={`Görünen ilk ${FIT_LIMIT} replikanın ana kadrona uyumu`}>Kadroma uyanlar</Chip>
            )}
          </div>
        </div>
      </section>
      </div>

      {mobile && sheet && (
        <MobileSheet title="Filtreler" onClose={() => setSheet(false)}>
          <div className="flex flex-col gap-3">
            <FilterFields filters={filters} set={set} formationOptions={formationOptions} />
            <div className="flex gap-2">
              <Button onClick={() => set({ formation: '', from: undefined, to: undefined })}>Temizle</Button>
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
        <EmptyState action={active ? <Button onClick={() => setParams(withOthers(new URLSearchParams()), { replace: true })}>Süzgeçleri temizle</Button> : undefined}>
          {active ? 'Bu süzgeçlere uyan replika yok.' : 'Henüz replika yok.'}
        </EmptyState>
      ) : (
        <TabPanel idPrefix="replica-lig" id={filters.league} active>
          <div className="flex flex-col gap-4">
            <p role="status" className="text-xs text-muted">
              {shown.length} replika{shown.length !== (replicas.data?.length ?? 0) ? ` / ${replicas.data?.length}` : ''}
              {fitMode && (fitPending ? ` · uyum hesaplanıyor (ilk ${computed})` : fitFailed ? ' · uyumun bir kısmı alınamadı' : ` · ilk ${computed} replika kadrona uyuma göre sıralı`)}
            </p>
            {groups.length > 0 ? (
              groups.map((g) => (
                <LeagueGroupSection
                  key={g.tab}
                  tab={g.tab}
                  count={g.items.length}
                  open={!collapsed.has(g.tab)}
                  onToggle={() => setCollapsed((cur) => new Set(toggle([...cur], g.tab)))}
                >
                  <CardGrid items={g.items} formationById={formationById} cardAction={action} />
                </LeagueGroupSection>
              ))
            ) : (
              <CardGrid items={shown} formationById={formationById} cardAction={action} fits={fitMode ? fits : undefined} />
            )}
          </div>
        </TabPanel>
      )}
    </div>
  )
}

