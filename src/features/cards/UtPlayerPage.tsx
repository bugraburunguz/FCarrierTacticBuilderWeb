import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { useMemo, type KeyboardEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { PlayerCard } from '../../components/card/PlayerCard'
import { CompareButton } from '../../components/CompareButton'
import { useIsMobile } from '../../design/components/MobileSheet'
import { Chip, ErrorState, Skeleton, TabPanel, Tabs } from '../../design/components/primitives'
import { cardPlayerOfSummary } from '../../lib/cardPlayer'
import { AcquireTab, PriceTab, RolesTab, StatsTab } from './UtPlayerTabs'
import { buildVersions, pickVersion, type CardVersion } from './utPlayer'

type TabId = 'statlar' | 'fiyat' | 'roller' | 'alinis'
const TABS: { id: TabId; label: string }[] = [
  { id: 'statlar', label: 'Statlar' },
  { id: 'fiyat', label: 'Fiyat' },
  { id: 'roller', label: 'Roller' },
  { id: 'alinis', label: 'Nasıl alınır' },
]
const STALE_MS = 300_000
const PREFIX = 'utoyuncu'
const CARD_WIDTH = 280
/** <820px: kompakt kart (en çok 200px) — sekme çubuğu 375×812'de ilk ekranda kalsın. */
const MOBILE_CARD_WIDTH = 180

/**
 * Versiyon şeridi: ←/→ ile gezilir; seçili versiyon URL'de (`?v=`). Yalnız mevcut veriyle (base + bilgi tabanındaki kartlar).
 * Satır kart bölümünün doğrudan çocuğu ve yapışkan: kart altından kayarken opak yüzey (Q5). Tek versiyonda açıklama aynı satırda.
 */
function VersionStrip({ versions, current, onPick }: { versions: CardVersion[]; current: CardVersion; onPick: (key: string) => void }) {
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = versions.findIndex((v) => v.key === current.key)
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (step !== 0) {
      e.preventDefault()
      onPick(versions[(i + step + versions.length) % versions.length].key)
    }
  }
  return (
    <div className="glass-3 glass-sticky sticky top-14 z-10 flex w-full items-center gap-2 p-1">
      <div role="radiogroup" aria-label="Kart versiyonları" onKeyDown={onKey} className={`flex gap-1 overflow-x-auto ${versions.length > 1 ? 'min-w-0 flex-1' : 'shrink-0'}`}>
        {versions.map((v) => (
          <button key={v.key} type="button" role="radio" aria-checked={v.key === current.key} tabIndex={v.key === current.key ? 0 : -1} onClick={() => onPick(v.key)}
            className={`min-h-9 whitespace-nowrap rounded-[var(--radius-sm)] px-3 text-sm font-semibold max-sm:min-h-11 ${v.key === current.key ? 'bg-[var(--glass-press)] text-ink shadow-[inset_0_-2px_0_var(--accent)]' : 'text-ink-2 hover:bg-[var(--glass-hover)]'}`}>
            {v.label}
          </button>
        ))}
      </div>
      {versions.length === 1 && <p className="pr-1 text-xs leading-tight text-muted">Bu oyuncu için başka kart versiyonu kayıtlı değil.</p>}
    </div>
  )
}

/** UT oyuncu sayfası (Detay şablonu): solda büyük kart + versiyon şeridi, sağda sekmeler (Statlar · Fiyat · Roller · Nasıl alınır). Rota `/ut/players/:assetId`. */
export function UtPlayerPage() {
  const assetId = Number(useParams().assetId)
  const [params, setParams] = useSearchParams()
  const mobile = useIsMobile()
  const tab =(TABS.find((t) => t.id === params.get('sekme'))?.id ?? 'statlar') as TabId
  const detail = useQuery({ queryKey: ['ut-player', assetId], queryFn: () => endpoints.playerByAsset(assetId), enabled: Number.isFinite(assetId), staleTime: STALE_MS, retry: false })
  const summary = detail.data?.summary
  const kb = useQuery({ queryKey: ['ut-player-kb', assetId, summary?.name], queryFn: () => endpoints.kbItems({ q: summary!.name, limit: 40 }), enabled: summary !== undefined, staleTime: STALE_MS, retry: false })
  const versions = useMemo(() => (summary ? buildVersions(summary, kb.data ?? []) : []), [summary, kb.data])
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v === undefined ? next.delete(k) : next.set(k, v)))
    setParams(next, { replace: true })
  }

  const back = (
    <Link to="/players" className="inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-accent max-sm:min-h-11">
      <ChevronLeft size={16} aria-hidden="true" />
      Kart veritabanı
    </Link>
  )
  if (detail.isError) {
    return <div className="mx-auto flex max-w-[1280px] flex-col gap-3 py-2">{back}<ErrorState message="Bu oyuncu bulunamadı." onRetry={() => detail.refetch()} /></div>
  }
  if (!detail.data || !summary) {
    return (
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 py-2" aria-busy="true" aria-label="Yükleniyor">
        {back}
        <Skeleton className="h-9 w-72" />
        <div className="flex flex-col gap-4 min-[820px]:flex-row"><Skeleton className="h-[420px] min-[820px]:w-[340px]" /><Skeleton className="h-[420px] flex-1" /></div>
      </div>
    )
  }
  const version = pickVersion(versions, params.get('v'))
  const player = { ...cardPlayerOfSummary(summary, summary.positions[0]), ...(version.base ? {} : { rarity: version.promo, cardType: undefined }) }
  const meta = [summary.club, summary.league, summary.nationality].filter(Boolean).join(' · ')
  // Mobilde başlık satırında (sekme çubuğu ilk ekranda kalsın), masaüstünde kartın altında.
  const compare = <CompareButton entry={{ id: summary.id, name: summary.name, overall: summary.overall, position: summary.positions[0] ?? '' }} />

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 py-2">
      {back}
      <header className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">{summary.name}</h1>
          {mobile && compare}
        </div>
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
          {summary.positions.map((p) => <Chip key={p}>{p}</Chip>)}
          {meta}
        </p>
      </header>
      <div className="flex flex-col gap-3 min-[820px]:flex-row min-[820px]:items-start min-[820px]:gap-4">
        <section aria-label="Kart" className="glass flex flex-col items-center gap-2 p-3 min-[820px]:sticky min-[820px]:top-16 min-[820px]:w-[340px] min-[820px]:shrink-0 min-[820px]:gap-3 min-[820px]:p-4">
          <PlayerCard player={player} width={mobile ? MOBILE_CARD_WIDTH : CARD_WIDTH} />
          <VersionStrip versions={versions} current={version} onPick={(key) => set({ v: key === versions[0].key ? undefined : key })} />
          <dl className="grid w-full grid-cols-3 gap-1.5 text-center text-xs min-[820px]:gap-2">
            {[
              ['Zayıf ayak', `${detail.data.weakFoot ?? '–'}★`],
              ['Hareket', `${detail.data.skillMoves ?? '–'}★`],
              ['Ayak', detail.data.preferredFoot === 'Left' ? 'Sol' : detail.data.preferredFoot === 'Right' ? 'Sağ' : '–'],
            ].map(([term, value]) => (
              <div key={term} className="glass-3 flex items-center justify-center gap-x-1.5 flex-wrap px-1.5 py-1 min-[360px]:flex-nowrap min-[360px]:whitespace-nowrap min-[820px]:flex-col min-[820px]:gap-0 min-[820px]:p-2">
                <dt className="text-muted">{term}</dt>
                <dd className="text-sm font-medium min-[820px]:text-base">{value}</dd>
              </div>
            ))}
          </dl>
          {!mobile && compare}
        </section>
        <section aria-label="Oyuncu bilgisi" className="glass-2 flex min-w-0 flex-1 flex-col gap-3 p-3 min-[820px]:p-4">
          <Tabs label="Oyuncu sekmeleri" idPrefix={PREFIX} value={tab} tabs={TABS} onChange={(id) => set({ sekme: id === 'statlar' ? undefined : id })} />
          <TabPanel idPrefix={PREFIX} id="statlar" active={tab === 'statlar'}><StatsTab detail={detail.data} version={version} /></TabPanel>
          <TabPanel idPrefix={PREFIX} id="fiyat" active={tab === 'fiyat'}><PriceTab version={version} /></TabPanel>
          <TabPanel idPrefix={PREFIX} id="roller" active={tab === 'roller'}><RolesTab playerId={summary.id} positions={summary.positions} /></TabPanel>
          <TabPanel idPrefix={PREFIX} id="alinis" active={tab === 'alinis'}><AcquireTab version={version} /></TabPanel>
        </section>
      </div>
    </div>
  )
}
