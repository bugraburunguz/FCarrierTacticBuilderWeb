import { useQuery } from '@tanstack/react-query'
import { useMemo, type KeyboardEvent } from 'react'
import { useParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { PlayerCard } from '../../components/card/PlayerCard'
import { CompareButton } from '../../components/CompareButton'
import { useIsMobile } from '../../design/components/MobileSheet'
import { TabPanel, Tabs } from '../../design/components/primitives'
import { cardPlayerOfSummary } from '../../lib/cardPlayer'
import { BackLink, FactGrid, PlayerDetailLayout, PlayerPageError, PlayerPageLoading } from '../player/PlayerDetailLayout'
import { CARD_WIDTH, footText, MOBILE_CARD_WIDTH, useTabParam } from '../player/playerPage'
import { RolesTab } from '../player/RolesTab'
import { StatsTab } from '../player/StatsTab'
import { AcquireTab, PriceTab } from './UtPlayerTabs'
import { buildVersions, pickVersion, type CardVersion } from './utPlayer'

const TABS = [
  { id: 'statlar', label: 'Statlar' },
  { id: 'fiyat', label: 'Fiyat' },
  { id: 'roller', label: 'Roller' },
  { id: 'alinis', label: 'Nasıl alınır' },
] as const
const STALE_MS = 300_000
const PREFIX = 'utoyuncu'

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
    <div className="glass-3 glass-sticky sticky top-[var(--header-h)] z-10 flex w-full items-center gap-2 p-1">
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
  const { tab, setTab, params, set } = useTabParam(TABS)
  const mobile = useIsMobile()
  const detail = useQuery({ queryKey: ['ut-player', assetId], queryFn: () => endpoints.playerByAsset(assetId), enabled: Number.isFinite(assetId), staleTime: STALE_MS, retry: false })
  const summary = detail.data?.summary
  const kb = useQuery({ queryKey: ['ut-player-kb', assetId, summary?.name], queryFn: () => endpoints.kbItems({ q: summary!.name, limit: 40 }), enabled: summary !== undefined, staleTime: STALE_MS, retry: false })
  const versions = useMemo(() => (summary ? buildVersions(summary, kb.data ?? []) : []), [summary, kb.data])

  const back = <BackLink to="/players">Kart veritabanı</BackLink>
  if (detail.isError) {
    return <PlayerPageError back={back} onRetry={() => detail.refetch()} />
  }
  if (!detail.data || !summary) {
    return <PlayerPageLoading back={back} />
  }
  const version = pickVersion(versions, params.get('v'))
  const player = { ...cardPlayerOfSummary(summary, summary.positions[0]), ...(version.base ? {} : { rarity: version.promo, cardType: undefined }) }
  const meta = [summary.club, summary.league, summary.nationality].filter(Boolean).join(' · ')
  // Mobilde başlık satırında (sekme çubuğu ilk ekranda kalsın), masaüstünde kartın altında.
  const compare = <CompareButton entry={{ id: summary.id, name: summary.name, overall: summary.overall, position: summary.positions[0] ?? '' }} />
  const card = (
    <>
      <PlayerCard player={player} width={mobile ? MOBILE_CARD_WIDTH : CARD_WIDTH} />
      <VersionStrip versions={versions} current={version} onPick={(key) => set({ v: key === versions[0].key ? undefined : key })} />
      <FactGrid facts={[
        ['Zayıf ayak', `${detail.data.weakFoot ?? '–'}★`],
        ['Hareket', `${detail.data.skillMoves ?? '–'}★`],
        ['Ayak', footText(detail.data.preferredFoot)],
      ]} />
      {!mobile && compare}
    </>
  )
  const statsNote = version.base ? undefined : `Bu sayfa katalogdaki base kartın değerlerini gösterir; ${version.label} kartının attribute farkları henüz kayıtlı değil.`

  return (
    <PlayerDetailLayout back={back} topAside={mobile && compare} title={summary.name} positions={summary.positions} meta={meta} card={card}>
      <Tabs label="Oyuncu sekmeleri" idPrefix={PREFIX} value={tab} tabs={[...TABS]} onChange={setTab} />
      <TabPanel idPrefix={PREFIX} id="statlar" active={tab === 'statlar'}><StatsTab detail={detail.data} note={statsNote} /></TabPanel>
      <TabPanel idPrefix={PREFIX} id="fiyat" active={tab === 'fiyat'}><PriceTab version={version} /></TabPanel>
      <TabPanel idPrefix={PREFIX} id="roller" active={tab === 'roller'}><RolesTab playerId={summary.id} positions={summary.positions} /></TabPanel>
      <TabPanel idPrefix={PREFIX} id="alinis" active={tab === 'alinis'}><AcquireTab version={version} /></TabPanel>
    </PlayerDetailLayout>
  )
}
