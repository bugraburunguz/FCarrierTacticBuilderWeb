import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CareerSelect } from '../../components/CareerSelect'
import { SquadCards } from '../../components/SquadCards'
import { SquadList } from '../../components/SquadList'
import { SquadTagsView } from '../../components/SquadTagsView'
import { TransferDialog } from '../../components/TransferDialog'
import { Button, EmptyState, Panel, Segmented, Skeleton, StatTile, TabPanel, Tabs, type DataSource } from '../../design/components/primitives'
import { GROUP_LABEL, type PositionGroup } from '../../lib/deskRules'
import { endpoints } from '../../api/endpoints'
import { StarterTacticPanel } from '../career/StarterTacticPanel'
import { useTabParam } from '../player/playerPage'
import { MoveHistory, TransferMarket } from '../squad/kadro/MovesTab'
import { SaveMoves } from '../squad/kadro/SaveMoves'
import { careerMovesQuery } from '../squad/kadro/saveMovesQuery'
import { squadStats } from './careerSquadRules'
import { DepthTab } from './DepthTab'
import { useCareerSquadData } from './useCareerSquadData'

const PREFIX = 'kadro'
type View = 'list' | 'cards' | 'tags'
const VIEWS: { id: View; label: string }[] = [
  { id: 'list', label: 'Liste' },
  { id: 'cards', label: 'Kartlar' },
  { id: 'tags', label: 'Etiket & yaş' },
]
const decimal = (value?: number) => (value === undefined ? undefined : value.toLocaleString('tr-TR', { maximumFractionDigits: 1 }))

/**
 * Kadro Analizi (/career/squad, KARIYER-UX FAZ 3, 15 §4.2): "Elimde ne var?". Düzenleme yok; kararlar yalnız hamleler ve geri alma.
 * Diziliş: ana taktik (yoksa başlangıç önerisi) salt okunur piyon sahada, piyon oyuncu sayfasını açar. Liste, Derinlik, Hareketler `?sekme=`.
 * Katman 1-2; Lab taslağı ve eski tek kopya taktik deposu okunmaz (kariyerUxGates).
 */
export function CareerSquadPage() {
  const k = useCareerSquadData()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('list')
  const players = useMemo(() => k.squad.data ?? [], [k.squad.data])
  const saveMoves = useQuery({ ...careerMovesQuery(k.career?.id ?? 0), enabled: k.career !== undefined })
  const snapshots = useQuery({ queryKey: ['snapshots', k.career?.id], queryFn: () => endpoints.snapshots(k.career!.id), enabled: k.career !== undefined, retry: false })
  const tabs = [
    { id: 'dizilis' as const, label: 'Diziliş' },
    { id: 'liste' as const, label: `Liste (${players.length})` },
    { id: 'derinlik' as const, label: 'Derinlik' },
    { id: 'hareketler' as const, label: `Hareketler (${(saveMoves.data?.length ?? 0) + (k.events.data?.length ?? 0)})` },
  ]
  const { tab, setTab, params } = useTabParam(tabs)
  const wanted = params.get('grup') as PositionGroup | null
  const fitsBySlot = useMemo(() => new Map(k.fits.rows.map((r) => [r.slotId, r.display])), [k.fits.rows])

  if (k.careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  const career = k.career
  if (!career) {
    return (
      <div className="mx-auto max-w-[1280px] py-2">
        <h1 className="mb-3 font-display text-[26px] font-bold leading-[30px] sm:text-[32px] sm:leading-9">Kadro</h1>
        <EmptyState action={<Link to="/career/new" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Yeni kariyer başlat</Link>}>
          Kadronu görmek için bir kariyer seç ya da yeni kariyer başlat.
        </EmptyState>
      </div>
    )
  }

  const stats = squadStats(players)
  const lastImport = (snapshots.data ?? []).find((s) => s.source === 'IMPORT')
  const record: DataSource | undefined = lastImport ? { kind: 'record', at: lastImport.takenAt } : undefined
  const gameDate = career.gameDate

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 py-2">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Kadro</h1>
        <CareerSelect />
      </header>
      <Tabs label="Kadro sekmeleri" idPrefix={PREFIX} value={tab} tabs={tabs} onChange={setTab} />

      <TabPanel idPrefix={PREFIX} id="dizilis" active={tab === 'dizilis'}>
        <div className="flex flex-col gap-3 min-[1100px]:flex-row min-[1100px]:items-start">
          <div className="min-w-0 flex-1">
            {k.squad.isLoading ? <Skeleton className="h-80" /> : (
              <StarterTacticPanel careerId={career.id} fits={fitsBySlot} onPickPlayer={(id) => navigate(`/players/${id}`)}
                onOpenLab={() => navigate('/career/tactics-lab?sekme=kurucu')}
                title={k.fits.main.active?.main?.name ? `${k.fits.main.active.main.name}` : undefined} />
            )}
          </div>
          <Panel title="Kadro özeti" label="Kadro özeti" source={record} className="min-[1100px]:sticky min-[1100px]:top-24 min-[1100px]:w-[320px] min-[1100px]:shrink-0">
            <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3 min-[1100px]:grid-cols-1">
              <StatTile label="Ortalama reyting" value={decimal(stats.avgOverall)} />
              <StatTile label="Oyuncu" value={stats.count} suffix={stats.loanedOut ? `${stats.loanedOut} kiralıkta` : undefined} />
              <StatTile label="Ortalama yaş" value={decimal(stats.avgAge)} />
            </div>
          </Panel>
        </div>
      </TabPanel>

      <TabPanel idPrefix={PREFIX} id="liste" active={tab === 'liste'}>
        <Panel title={`Oyuncular · ${players.length}`} source={record} actions={<Segmented label="Görünüm" value={view} options={VIEWS} onChange={setView} />}>
          {k.squad.isLoading ? (
            <Skeleton className="h-64" />
          ) : players.length === 0 ? (
            <EmptyState action={<Button onClick={() => setTab('hareketler')}>Transfer piyasası</Button>}>Kadro boş.</EmptyState>
          ) : view === 'tags' ? (
            <SquadTagsView careerId={career.id} squad={players} />
          ) : view === 'list' ? (
            <SquadList squad={players} positionAdvice={k.positionAdvice.data ?? []} recordColumns />
          ) : (
            <SquadCards squad={players} busy={k.move.isPending} needs={k.needs} positionAdvice={k.positionAdvice.data ?? []} onSell={(entry) => k.openMove('SELL', entry)} onLoanOut={(entry) => k.openMove('LOAN_OUT', entry)} />
          )}
        </Panel>
      </TabPanel>

      <TabPanel idPrefix={PREFIX} id="derinlik" active={tab === 'derinlik'}>
        <DepthTab squad={players} needs={k.needs} formation={k.formation} gameDate={gameDate} record={record}
          wanted={wanted && wanted in GROUP_LABEL ? wanted : undefined} />
      </TabPanel>

      <TabPanel idPrefix={PREFIX} id="hareketler" active={tab === 'hareketler'}>
        <div className="flex flex-col gap-4">
          <SaveMoves careerId={career.id} />
          <MoveHistory careerId={career.id} events={k.events.data ?? []} />
          <TransferMarket career={career} squadIds={k.squadIds} />
        </div>
      </TabPanel>

      {k.dialog && (
        <TransferDialog
          mode={k.dialog.mode}
          entry={k.dialog.entry}
          gender={career.gender}
          pending={k.move.isPending}
          error={k.move.error}
          onClose={() => k.setDialog(null)}
          onSubmit={k.submitMove}
        />
      )}
    </div>
  )
}
