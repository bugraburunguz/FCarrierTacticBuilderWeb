import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CareerPlayer, Formation } from '../../../api/types'
import { CareerSelect } from '../../../components/CareerSelect'
import { Pitch } from '../../../components/pitch/Pitch'
import { SquadCards } from '../../../components/SquadCards'
import { SquadList } from '../../../components/SquadList'
import { SquadTagsView } from '../../../components/SquadTagsView'
import { TransferDialog } from '../../../components/TransferDialog'
import { ErrorBox } from '../../../components/ui'
import { Button, Chip, EmptyState, Panel, Segmented, SidePanel, Skeleton, StatTile, TabPanel, Tabs } from '../../../design/components/primitives'
import { Workspace } from '../../../design/components/Workspace'
import { formatEur } from '../../../lib/format'
import { bestSquadRating, starRating } from '../../../lib/squadRating'
import { useTabParam } from '../../player/playerPage'
import { pitchSlotsOf } from '../pitchSlots'
import { CareerSettingsPanel } from './CareerSettingsPanel'
import { DepthMap, RegionSummary } from './DepthMap'
import { MoveHistory, TransferMarket } from './MovesTab'
import { useCareerLineup } from './useCareerLineup'
import { useCareerSquad } from './useCareerSquad'

const PREFIX = 'kadro'
type View = 'list' | 'cards' | 'tags'
const VIEWS: { id: View; label: string }[] = [
  { id: 'list', label: 'Liste' },
  { id: 'cards', label: 'Kartlar' },
  { id: 'tags', label: 'Etiket & yaş' },
]

/** Kahraman: seçili taktikte ilk 11 (kadro kurucuya açılır) + yedek kulübesi; aynalama uyarısı. */
function LineupHero({ careerId, squad, formations }: { careerId: number; squad: CareerPlayer[]; formations: Formation[] }) {
  const l = useCareerLineup(careerId, squad, formations)
  if (!l.enough) {
    return <EmptyState action={<Link to="/squad?sekme=hareketler" className="font-semibold text-accent underline-offset-2 hover:underline">Transfer piyasasına git</Link>}>İlk 11’i dizebilmek için kadroda en az 11 oyuncu olmalı.</EmptyState>
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold leading-6">İlk 11 · {l.tactic.formation}</h2>
        <Link to="/squad/builder" className="text-sm font-semibold text-accent underline-offset-2 hover:underline">Kadro kurucuda düzenle</Link>
      </div>
      {l.fit?.mirrored && (
        <div role="status" className="glass-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] p-2 text-sm">
          <span className="flex flex-wrap items-center gap-1.5"><Chip tone="warn">Aynalandı</Chip> Kadronda bu görevlere sağ-sol ters daha uygun oyuncular var; taktik otomatik aynalandı.</span>
          <Button onClick={l.saveMirrored}>Aynalanmış taktiği kaydet</Button>
        </div>
      )}
      {l.lineup.isLoading && <Skeleton className="aspect-[100/130] w-full max-w-[560px] self-center" />}
      <ErrorBox error={l.lineup.error} />
      {l.fit && l.formation && (
        <>
          <Pitch slots={pitchSlotsOf(l.views)} onPickPlayer={l.openBuilder} onPickRole={l.openBuilder} onSwap={l.swap} />
          <p className="px-1 text-xs text-muted">Karta tıkla: kadro kurucuda düzenle · iki kartı yer değiştirirsen diziliş kurucuya kaydedilir.</p>
          <section aria-labelledby="kadro-bench" className="flex flex-col gap-1.5">
            <h3 id="kadro-bench" className="text-sm font-semibold">Yedek kulübesi ({l.bench.length})</h3>
            <ul aria-label="Yedek kulübesi" className="flex snap-x gap-2 overflow-x-auto pb-1">
              {l.bench.map((b) => (
                <li key={b.player.player.id} className="glass-3 flex min-w-[148px] snap-start flex-col rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm">
                  <Link to={`/players/${b.player.player.id}`} className="truncate font-medium hover:underline">{b.player.player.name}</Link>
                  <span className="text-xs text-ink-2">{b.player.player.positions[0]} · <span className="font-[var(--font-num)] tabular-nums">{b.player.player.overall}</span></span>
                  <span className="truncate text-xs text-ink-2">
                    {b.covers.length > 0 ? `Yedeği: ${b.covers.map((c) => `${c.slotId} %${c.pct}`).join(', ')}` : b.player.player.positions.includes('GK') ? 'Yedek kaleci' : 'İlk 11’e yedek değil'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

/**
 * v3 Kadro (/squad, V3-07b; 08 §3 + §14-16): kahraman saha (seçili taktikte ilk 11 + yedekler), sağda yapışkan "Kadro bilgisi";
 * Oyuncular (liste/kartlar/etiket + mevki yoğunluğu), Hareketler (geçmiş + transfer piyasası) ve Kariyer (ayarlar) `?sekme=` ile.
 * Davranış v2 SquadPage ile aynı; veri useCareerSquad, ilk 11 useCareerLineup.
 */
export function KadroPage() {
  const k = useCareerSquad()
  const [view, setView] = useState<View>('list')
  const players = k.squad.data ?? []
  const tabs = [
    { id: 'saha' as const, label: 'Saha' },
    { id: 'oyuncular' as const, label: `Oyuncular (${players.length})` },
    { id: 'hareketler' as const, label: `Hareketler (${k.events.data?.length ?? 0})` },
    { id: 'kariyer' as const, label: 'Kariyer' },
  ]
  const { tab, setTab } = useTabParam(tabs)

  if (k.careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  const career = k.career
  if (!career) {
    return (
      <div className="mx-auto max-w-[1280px] py-2">
        <h1 className="mb-3 font-display text-[26px] font-bold leading-[30px] sm:text-[32px] sm:leading-9">Kadro</h1>
        {(k.careers.data ?? []).length > 0 && <div className="mb-3"><CareerSelect /></div>}
        <EmptyState action={<Link to="/career/new" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Yeni kariyer başlat</Link>}>
          Kadronu görmek için bir kariyer seç ya da yeni kariyer başlat.
        </EmptyState>
      </div>
    )
  }

  const active = players.filter((s) => !s.loanedOut)
  const rating = players.length > 0 ? bestSquadRating(active.map((s) => s.player.overall)) : undefined

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 py-2">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Kadro</h1>
        <CareerSelect />
      </header>
      <Tabs label="Kadro sekmeleri" idPrefix={PREFIX} value={tab} tabs={tabs} onChange={setTab} />

      <TabPanel idPrefix={PREFIX} id="saha" active={tab === 'saha'}>
        <Workspace
          title="Kadro sahası"
          hero={k.squad.isLoading || k.formations.isLoading ? <Skeleton className="h-80" /> : <LineupHero careerId={career.id} squad={players} formations={k.formations.data ?? []} />}
          side={
            <SidePanel title="Kadro bilgisi">
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <StatTile label="Kadro rating'i" value={rating?.rating} suffix={rating ? `${starRating(rating.rating)} yıldız` : undefined} />
                  <StatTile label="Oyuncu" value={players.length} suffix={active.length !== players.length ? `${players.length - active.length} kiralıkta` : undefined} />
                  <StatTile label="Bütçe" value={career.budgetEur ? formatEur(career.budgetEur) : undefined} />
                  <StatTile label="Sezon" value={career.season} />
                </div>
                {rating && <p className="text-xs text-ink-2">En iyi {rating.counted} oyuncunun (11 ilk + 7 yedek) ortalaması + üstündekilere düzeltme; rehber formülüdür, oyun içi değer esastır.</p>}
                {players.length > 0 ? <RegionSummary squad={players} needs={k.needs} /> : <EmptyState>Kadro boş.</EmptyState>}
                <Button onClick={() => setTab('oyuncular')}>Oyuncular ve mevki yoğunluğu</Button>
              </div>
            </SidePanel>
          }
        />
      </TabPanel>

      <TabPanel idPrefix={PREFIX} id="oyuncular" active={tab === 'oyuncular'}>
        <div className="flex flex-col gap-4 min-[1100px]:flex-row min-[1100px]:items-start">
          <Panel title={`Oyuncular · ${players.length}`} actions={<Segmented label="Görünüm" value={view} options={VIEWS} onChange={setView} />} className="min-w-0 flex-1">
            {k.squad.isLoading ? (
              <Skeleton className="h-64" />
            ) : players.length === 0 ? (
              <EmptyState action={<Button onClick={() => setTab('hareketler')}>Transfer piyasası</Button>}>Kadro boş.</EmptyState>
            ) : view === 'tags' ? (
              <SquadTagsView careerId={career.id} squad={players} />
            ) : view === 'list' ? (
              <SquadList squad={players} positionAdvice={k.positionAdvice.data ?? []} />
            ) : (
              <SquadCards squad={players} busy={k.move.isPending} needs={k.needs} positionAdvice={k.positionAdvice.data ?? []} onSell={(entry) => k.openMove('SELL', entry)} onLoanOut={(entry) => k.openMove('LOAN_OUT', entry)} />
            )}
          </Panel>
          {players.length > 0 && (
            <Panel title="Mevki yoğunluğu" className="min-[1100px]:sticky min-[1100px]:top-24 min-[1100px]:w-[420px] min-[1100px]:shrink-0">
              <DepthMap squad={players} needs={k.needs} formation={k.formation} />
            </Panel>
          )}
        </div>
      </TabPanel>

      <TabPanel idPrefix={PREFIX} id="hareketler" active={tab === 'hareketler'}>
        <div className="flex flex-col gap-4">
          <MoveHistory careerId={career.id} events={k.events.data ?? []} />
          <TransferMarket career={career} squadIds={k.squadIds} />
        </div>
      </TabPanel>

      <TabPanel idPrefix={PREFIX} id="kariyer" active={tab === 'kariyer'}>
        <CareerSettingsPanel key={career.id} career={career} />
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
