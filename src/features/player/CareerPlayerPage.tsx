import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { PlayerCard } from '../../components/card/PlayerCard'
import { CompareButton } from '../../components/CompareButton'
import { useIsMobile } from '../../design/components/MobileSheet'
import { Chip, TabPanel, Tabs } from '../../design/components/primitives'
import { HelpPopover } from '../../components/ui'
import { cardPlayerOfSummary } from '../../lib/cardPlayer'
import { LEAGUE_LEVEL_HELP } from '../../lib/leagueLevel'
import { LeagueLevelChip } from '../careerPlayers/LeagueLevelChip'
import { ContractTab, DevelopmentTab } from './CareerPlayerTabs'
import { BackLink, FactGrid, PlayerDetailLayout, PlayerPageError, PlayerPageLoading } from './PlayerDetailLayout'
import { CARD_WIDTH, footText, MOBILE_CARD_WIDTH, potentialText, useTabParam } from './playerPage'
import { RolesTab } from './RolesTab'
import { StatsTab } from './StatsTab'

const TABS = [
  { id: 'statlar', label: 'Statlar' },
  { id: 'roller', label: 'Roller' },
  { id: 'gelisim', label: 'Gelişim' },
  { id: 'sozlesme', label: 'Sözleşme ve değer' },
] as const
const STALE_MS = 120_000
const PREFIX = 'kariyeroyuncu'

/**
 * Kariyer oyuncu sayfası (V3-06b, v3 Detay şablonu): veri seçili kariyerin kaydından (`?career=`), roller kariyer motoru v3 ile ve
 * seviye referansı kariyerin ligi. Sekmeler adres çubuğunda: Statlar · Roller · Gelişim · Sözleşme ve değer. Rota `/players/:id` (kariyer modu, v3).
 */
export function CareerPlayerPage({ careerId }: { careerId: number }) {
  const id = Number(useParams().id)
  const { tab, setTab } = useTabParam(TABS)
  const mobile = useIsMobile()
  const detail = useQuery({ queryKey: ['career-player', careerId, id], queryFn: () => endpoints.player(id, careerId), enabled: Number.isFinite(id), staleTime: STALE_MS, retry: false })
  const contract = useQuery({ queryKey: ['career-player-contract', careerId, id], queryFn: () => endpoints.playerContract(id, careerId), enabled: Number.isFinite(id), staleTime: STALE_MS, retry: false })
  // Liste ile aynı önbellek anahtarı: lig gücü (Lig seviyesi göstergesi) facets'ten.
  const facets = useQuery({ queryKey: ['player-facets', careerId], queryFn: () => endpoints.playerFacets(careerId), staleTime: STALE_MS })
  const summary = detail.data?.summary

  const back = <BackLink to="/players">Oyuncular</BackLink>
  if (detail.isError) {
    return <PlayerPageError back={back} onRetry={() => detail.refetch()} />
  }
  if (!detail.data || !summary) {
    return <PlayerPageLoading back={back} />
  }
  const inSquad = contract.data?.inSquad === true
  const meta = [summary.club, summary.league, summary.nationality].filter(Boolean).join(' · ')
  const compare = <CompareButton entry={{ id: summary.id, name: summary.name, overall: summary.overall, position: summary.positions[0] ?? '' }} />
  const pot = potentialText(summary)
  const card = (
    <>
      <PlayerCard player={cardPlayerOfSummary(summary, summary.positions[0])} width={mobile ? MOBILE_CARD_WIDTH : CARD_WIDTH} />
      <FactGrid facts={[
        ['OVR', summary.overall],
        ...(pot !== undefined ? [['POT', pot] as [string, string]] : []),
        ...(summary.age !== undefined ? [['Yaş', summary.age] as [string, number]] : []),
        ['Ayak', footText(detail.data.preferredFoot)],
        ['Zayıf ayak', `${detail.data.weakFoot ?? '–'}★`],
        ['Hareket', `${detail.data.skillMoves ?? '–'}★`],
      ]} />
      {/* Mobilde mevkiler başlık satırında (UT gibi kompakt; sekme çubuğu ilk ekranda kalsın). */}
      {!mobile && (
        <div aria-label="Mevkiler" role="group" className="flex flex-wrap justify-center gap-1">
          {summary.positions.map((p) => <Chip key={p}>{p}</Chip>)}
        </div>
      )}
      {!mobile && compare}
    </>
  )
  const leagueOvr = facets.data?.leagueOvr
  const badges = (
    <>
      {inSquad && <Chip><Check size={12} aria-hidden="true" className="text-good" />Kadronda</Chip>}
      {leagueOvr !== undefined && (
        <span className="inline-flex items-center gap-1">
          <LeagueLevelChip overall={summary.overall} leagueOvr={leagueOvr} />
          <HelpPopover label="Lig seviyesi"><p>{LEAGUE_LEVEL_HELP}</p></HelpPopover>
        </span>
      )}
    </>
  )

  return (
    <PlayerDetailLayout back={back} topAside={mobile && compare} title={summary.name} positions={mobile ? summary.positions : undefined} meta={meta} badges={badges} card={card}>
      <Tabs label="Oyuncu sekmeleri" idPrefix={PREFIX} value={tab} tabs={[...TABS]} onChange={setTab} />
      <TabPanel idPrefix={PREFIX} id="statlar" active={tab === 'statlar'}><StatsTab detail={detail.data} /></TabPanel>
      <TabPanel idPrefix={PREFIX} id="roller" active={tab === 'roller'}><RolesTab playerId={summary.id} positions={summary.positions} careerId={careerId} /></TabPanel>
      <TabPanel idPrefix={PREFIX} id="gelisim" active={tab === 'gelisim'}><DevelopmentTab summary={summary} inSquad={inSquad} /></TabPanel>
      <TabPanel idPrefix={PREFIX} id="sozlesme" active={tab === 'sozlesme'}><ContractTab query={contract} /></TabPanel>
    </PlayerDetailLayout>
  )
}
