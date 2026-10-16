import { Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Input, Select } from '../../components/ui'
import { MobileSheet, useIsMobile } from '../../design/components/MobileSheet'
import { Button, EmptyState, ErrorState, Skeleton, TabPanel, Tabs } from '../../design/components/primitives'
import { SbcCard } from './SbcCard'
import { useActiveSbcSets, useNow } from './useActiveSbcSets'
import { categoriesOf, categoryLabel, filterSets, sbcFiltersFromParams, sbcFiltersToParams, type SbcFilters, type SbcSort, type SbcTab } from './sbcList'

const SKELETONS = 8
const PREFIX = 'sbc'
const SORTS: { id: SbcSort; label: string }[] = [
  { id: 'yeni', label: 'En yeni' },
  { id: 'bitiyor', label: 'Bitişi yakın' },
]
/** Izgara: hücre en az 15rem (ödül kartı + metin), kap daralınca tek sütun. */
const GRID_STYLE = { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 15rem), 1fr))' }


function SortSelect({ filters, set }: { filters: SbcFilters; set: (patch: Partial<SbcFilters>) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted">
      Sırala
      <Select value={filters.sort} onChange={(e) => set({ sort: e.target.value as SbcSort })}>
        {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </Select>
    </label>
  )
}

/**
 * UT SBC listesi (Katalog şablonu, 11 §Katalog, 08 §4): yapışkan opak filtre çubuğu, altında set kartı ızgarası.
 * Kaynak: bilgi tabanı (GET /ut/kb/sbc, uzantı yakalamalarından) ve oylar (oturumlu). KB boşsa uzantı senkronuna yönlendirir (V3-06a).
 * Süzgeçler adres çubuğunda; varsayılanlar yazılmaz.
 */
export function SbcListPage() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => sbcFiltersFromParams(params), [params])
  const set = (patch: Partial<SbcFilters>) => setParams(sbcFiltersToParams({ ...filters, ...patch }), { replace: true })
  const mobile = useIsMobile()
  const [sheet, setSheet] = useState(false)
  const now = useNow()
  const { sets, all, itemMap, nameMap, voteMap } = useActiveSbcSets()

  // Sekme kimlikleri HTML id'sinde güvenli olsun: kategori sekmeleri sıra numarasıyla, adres çubuğunda ham kategori adıyla.
  const categories = useMemo(() => categoriesOf(all), [all])
  const tabs = useMemo(() => [
    { id: 'tumu', label: 'Tümü', tab: 'tumu' as SbcTab },
    { id: 'yeni', label: 'Yeni', tab: 'yeni' as SbcTab },
    { id: 'bitiyor', label: 'Bitiyor', tab: 'bitiyor' as SbcTab },
    ...categories.map((c, i) => ({ id: `k${i}`, label: categoryLabel(c), tab: `kategori:${c}` as SbcTab })),
  ], [categories])
  const activeTab = tabs.find((t) => t.tab === filters.tab) ?? tabs[0]
  const shown = useMemo(() => filterSets(all, filters, now), [all, filters, now])

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 py-2">
      <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">SBC</h1>

      <div className="z-20 min-[820px]:sticky min-[820px]:top-[var(--header-h)]">
        <section aria-label="Süzgeçler" className="glass glass-sticky flex flex-col gap-3 p-3 sm:px-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="relative flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-muted">
              Ara
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 text-muted" />
              <Input type="search" value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder="Set adı" className="pl-9" />
            </label>
            {!mobile && <SortSelect filters={filters} set={set} />}
            {mobile && (
              <Button onClick={() => setSheet(true)} aria-haspopup="dialog" className="gap-2">
                <SlidersHorizontal size={16} aria-hidden="true" />
                Filtreler{filters.sort !== 'yeni' ? ' (1)' : ''}
              </Button>
            )}
          </div>
          {all.length > 0 && (
            <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4">
              <div className="w-max min-w-full">
                <Tabs label="SBC sekmeleri" idPrefix={PREFIX} value={activeTab.id} tabs={tabs.map(({ id, label }) => ({ id, label }))}
                  onChange={(id) => set({ tab: tabs.find((t) => t.id === id)?.tab ?? 'tumu' })} />
              </div>
            </div>
          )}
        </section>
      </div>

      {mobile && sheet && (
        <MobileSheet title="Filtreler" onClose={() => setSheet(false)}>
          <div className="flex flex-col gap-3">
            <SortSelect filters={filters} set={set} />
            <div className="flex gap-2">
              <Button onClick={() => set({ sort: 'yeni' })}>Temizle</Button>
              <Button variant="primary" onClick={() => setSheet(false)}>{shown.length} seti göster</Button>
            </div>
          </div>
        </MobileSheet>
      )}

      {sets.isLoading ? (
        <ul aria-busy="true" aria-label="Yükleniyor" className="grid gap-3" style={GRID_STYLE}>
          {Array.from({ length: SKELETONS }, (_, i) => <li key={i}><Skeleton className="h-[360px]" /></li>)}
        </ul>
      ) : sets.isError ? (
        <ErrorState message="SBC'ler yüklenemedi." onRetry={() => sets.refetch()} />
      ) : all.length === 0 ? (
        // V3-06a: EXT-07 sonrası uzantıyla yakalama çalışıyor; boş bilgi tabanı uzantı senkronuna yönlendirir.
        <EmptyState action={<Link to="/ut/import" className="text-sm font-semibold text-accent hover:underline">İçe aktar</Link>}>
          Aktif SBC kaydı yok. Uzantı açıkken Web App'te SBC sekmesini aç; sonra İçe aktar'dan senkronla.
        </EmptyState>
      ) : (
        <TabPanel idPrefix={PREFIX} id={activeTab.id} active>
          {shown.length === 0 ? (
            <EmptyState>Bu kategoride aktif SBC yok.</EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              <p role="status" className="text-xs text-muted">{shown.length} aktif set</p>
              <ul aria-label="SBC setleri" className="grid gap-3" style={GRID_STYLE}>
                {shown.map((s) => <SbcCard key={s.id} set={s} items={itemMap} names={nameMap} votes={voteMap.get(s.id)} now={now} />)}
              </ul>
            </div>
          )}
        </TabPanel>
      )}
    </div>
  )
}
