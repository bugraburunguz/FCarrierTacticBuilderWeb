import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Info, Search } from 'lucide-react'
import { useId, useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { FitBadge } from '../../components/card/FitBadge'
import { PlayerCard } from '../../components/card/PlayerCard'
import { CareerSelect } from '../../components/CareerSelect'
import { HelpPopover } from '../../components/ui'
import { Chip, EmptyState, Skeleton, StatTile, TabPanel, Tabs } from '../../design/components/primitives'
import { cardPlayerOfSummary } from '../../lib/cardPlayer'
import { alerts, rankActions, windowDaysLeft } from '../../lib/deskRules'
import { formatEur } from '../../lib/format'
import { useActiveCareerId } from '../../state/careerStore'
import { useTabParam } from '../player/playerPage'
import { useAutoLineup } from '../squad/useAutoLineup'
import { useCareerBinding } from '../squad/useCareerBinding'
import { needsFromFits, teamFitPct, toDeskSlots, useSlotFits } from '../squad/useSlotFits'
import { useSquadWorkspace } from '../squad/useSquadWorkspace'
import { DeskSettings } from './DeskSettings'
import { Timeline } from './Timeline'

const TABS = [
  { id: 'masa', label: 'Masa' },
  { id: 'ayarlar', label: 'Ayarlar' },
] as const
const PREFIX = 'masa'
const STALE_MS = 120_000
const WEAK_SHOWN = 3
const WEAK_CARD = 92
const KIND_LABEL = { FILL: 'Transfer', SELL: 'Satış', LOAN: 'Kiralık', DEPTH: 'Derinlik', CONTRACT: 'Sözleşme' } as const
const JOBS_SHOWN = 3

/** Türkçe liste birleştirme: "A", "A ve B", "A, B ve C". */
const joinTr = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`)

function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="glass-2 flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 id={id} className="font-display text-xl font-semibold leading-6">{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  )
}

/** Takım uyumu göstergesi: yarım daire (0–100), ortada %; anlam metinde (role="img" + etiket). */
function FitGauge({ pct }: { pct: number }) {
  const r = 80
  const length = Math.PI * r
  return (
    <figure role="img" aria-label={`Takım uyumu %${pct}`} className="flex flex-col items-center">
      <svg viewBox="0 0 200 116" className="w-full max-w-[280px]" aria-hidden="true">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--glass-3)" strokeWidth="16" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--accent)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(length * Math.max(0, Math.min(100, pct))) / 100} ${length}`} />
        <text x="100" y="92" textAnchor="middle" className="fill-[var(--ink)] font-[var(--font-num)]" fontSize="40" fontWeight="600">%{pct}</text>
      </svg>
      <figcaption aria-hidden="true" className="text-sm text-ink-2">Takım uyumu</figcaption>
    </figure>
  )
}

/**
 * Kariyer Masası v3 (V3-06d, 08 §8): üstte dönem bandı (oyun tarihine göre), kahraman takım uyumu göstergesi + en zayıf 3 halka (Transfer'e "Aday bul"),
 * sağda uyarılar, "3 iş" ve zaman çizelgesi; Ayarlar ayrı sekme. Tüm sayılar v3: rol uyumu `useSlotFits` (/fit/role v3), kurallar deskRules.
 */
export function DeskPage() {
  const careerId = useActiveCareerId()
  const { tab, setTab } = useTabParam(TABS)
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id!), enabled: id !== undefined })
  const facets = useQuery({ queryKey: ['player-facets', id], queryFn: () => endpoints.playerFacets(id!), enabled: id !== undefined, staleTime: STALE_MS })
  const { binding, playerById } = useCareerBinding(id, squad.data)
  const ws = useSquadWorkspace('career', binding)
  useAutoLineup(ws, id, squad.data?.length ?? 0)
  const { rows: fitRows, pending: fitsPending } = useSlotFits(ws, playerById)
  const diff = useQuery({ queryKey: ['snapshot-diff', id], queryFn: () => endpoints.snapshotDiff(id!), enabled: id !== undefined, retry: false })
  const snapshots = useQuery({ queryKey: ['snapshots', id], queryFn: () => endpoints.snapshots(id!), enabled: id !== undefined, retry: false })
  const tagList = useQuery({ queryKey: ['tags', id], queryFn: () => endpoints.playerTags(id!), enabled: id !== undefined, retry: false })
  const events = useQuery({ queryKey: ['events', id], queryFn: () => endpoints.events(id!), enabled: id !== undefined, retry: false })

  const players = useMemo(() => squad.data ?? [], [squad.data])
  const tags = useMemo(() => Object.fromEntries((tagList.data ?? []).map((t) => [t.playerId, t.tag])), [tagList.data])
  const slots = useMemo(() => toDeskSlots(fitRows), [fitRows])
  const gameDate = career?.gameDate ?? facets.data?.gameDate
  const notes = useMemo(() => alerts({ squad: players, slots, tags, diffRows: diff.data?.rows ?? [], windowEndsOn: career?.windowEndsOn, gameDate }),
    [players, slots, tags, diff.data, career?.windowEndsOn, gameDate])
  const weakest = useMemo(() => needsFromFits(fitRows).slice(0, WEAK_SHOWN), [fitRows])
  // V3-06e: "Zayıf halkalar"da gösterilen slotlar işlerde tekrar edilmez; liste sıradaki işlerle (kiralık, satış, sözleşme, derinlik) dolar. Kurallar deskRules'ta.
  const actions = useMemo(() => {
    const shown = new Set(weakest.map((r) => r.slotId))
    return rankActions({ squad: players, slots, tags, gameDate }).filter((a) => !(a.kind === 'FILL' && a.slotId && shown.has(a.slotId))).slice(0, JOBS_SHOWN)
  }, [weakest, players, slots, tags, gameDate])

  if (careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  if (!career) {
    return (
      <div className="mx-auto max-w-[1280px] py-2">
        <h1 className="mb-3 font-display text-[26px] font-bold leading-[30px] sm:text-[32px] sm:leading-9">Kariyer Masası</h1>
        <EmptyState action={<Link to="/career/new" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Yeni kariyer başlat</Link>}>
          Henüz kariyerin yok. Üç dakikada kulübünü seç, masan hazır olsun.
        </EmptyState>
      </div>
    )
  }

  const teamFit = teamFitPct(fitRows.map((r) => r.display))
  const budget = career.budgetEur !== undefined && career.budgetEur !== null && career.budgetEur > 0 ? career.budgetEur : undefined
  const window = windowDaysLeft(career.windowEndsOn, gameDate)
  const wageBudget = career.wageBudgetEur !== undefined && career.wageBudgetEur !== null && career.wageBudgetEur > 0 ? career.wageBudgetEur : undefined
  const wageUse = wageBudget !== undefined && facets.data?.squadWageEur !== undefined ? Math.round((facets.data.squadWageEur / wageBudget) * 100) : undefined
  const missing = [
    budget === undefined && 'bütçe',
    window === undefined && (gameDate ? 'dönem sonu' : 'oyun tarihi'),
    wageUse === undefined && 'maaş verisi',
  ].filter((m): m is string => Boolean(m))
  const lastImport = (snapshots.data ?? []).find((s) => s.source === 'IMPORT')

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 py-2">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Kariyer Masası</h1>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          {/* Kariyer seçici kendi "Yeni kariyer" düğmesini taşır (seçicinin yanında, aynı yerde oluşturur). */}
          <CareerSelect />
          {lastImport && <span className="pb-2 text-xs text-ink-2">Son içe aktarma {new Date(lastImport.takenAt).toLocaleDateString('tr-TR')}</span>}
        </div>
      </header>

      <Tabs label="Masa sekmeleri" idPrefix={PREFIX} value={tab} tabs={[...TABS]} onChange={setTab} />
      <TabPanel idPrefix={PREFIX} id="masa" active={tab === 'masa'}>
        <div className="flex flex-col gap-3">
          <section aria-label="Dönem" className="glass flex flex-col gap-2 p-3">
            {missing.length < 3 && (
              <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
                {window !== undefined && <StatTile label="Dönem bitimine" value={window < 0 ? 'Kapandı' : `${window} gün`} />}
                {budget !== undefined && <StatTile label="Transfer bütçesi" value={formatEur(budget)} />}
                {wageUse !== undefined && <StatTile label="Maaş bütçesi kullanımı" value={`%${wageUse}`} />}
              </div>
            )}
            {missing.length > 0 && (
              <p className="text-xs text-muted">
                {joinTr(missing).replace(/^./, (c) => c.toLocaleUpperCase('tr-TR'))} girilmemiş: Ayarlar sekmesinden ya da içe aktarmayla gelir.
              </p>
            )}
          </section>

          <div className="flex flex-col gap-3 min-[1024px]:flex-row min-[1024px]:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <section aria-label="Takım uyumu" className="glass flex flex-col items-center gap-2 p-4">
                {teamFit !== undefined ? <FitGauge pct={teamFit} /> : fitsPending || squad.isLoading ? <Skeleton className="h-36 w-64" /> : (
                  <EmptyState action={<Link to="/squad/builder" className="font-semibold text-accent underline-offset-2 hover:underline">Kadro kurucuya git</Link>}>
                    {players.length < 11 ? 'Takım uyumu için kadroda en az 11 oyuncu olmalı.' : 'Dizilim henüz kurulmadı.'}
                  </EmptyState>
                )}
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  Kadro kurucudaki "Kadro uyumu" ile aynı: dizilimdeki oyuncuların seviyesine göre uyumu.
                  <HelpPopover label="Takım uyumu">Her slot için v3 rol uyumu (seviyesine göre %), dizilimdeki 11 oyuncunun ortalaması.</HelpPopover>
                </p>
              </section>
              <Section title="Zayıf halkalar">
                {weakest.length === 0 ? (
                  <p className="text-sm text-ink-2">{fitsPending ? 'Hesaplanıyor…' : 'Zayıf halka yok: dizilimdeki herkes seviyesinde ya da üstünde.'}</p>
                ) : (
                  <ul className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
                    {weakest.map((r) => {
                      const player = playerById.get(r.playerId)
                      return (
                        <li key={r.slotId} className="glass-3 flex flex-col items-center gap-2 p-3 text-center">
                          {player && <PlayerCard player={cardPlayerOfSummary(player, r.position)} width={WEAK_CARD} />}
                          <span className="text-sm font-semibold">{r.playerName}</span>
                          <span className="text-xs text-ink-2">{r.position} · {r.roleName}</span>
                          <FitBadge state={r.display.state} pct={r.display.pct} />
                          <Link to={`/career/transfer?ihtiyac=slot-${r.slotId}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-3 text-sm font-semibold text-on-accent hover:opacity-90 max-sm:min-h-11">
                            <Search size={14} aria-hidden="true" />Aday bul
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Section>
            </div>

            <div className="flex min-w-0 flex-col gap-3 min-[1024px]:w-[400px] min-[1024px]:shrink-0">
              <Section title="Uyarılar">
                {notes.length === 0 ? <p className="text-sm text-ink-2">Uyarı yok.</p> : (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {notes.slice(0, 8).map((n) => (
                      <li key={`${n.kind}-${n.text}`} className="flex items-start gap-2">
                        {n.tone === 'warn' ? <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warn" /> : <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-2" />}
                        <span>{n.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title="Bu dönemin 3 işi" actions={<HelpPopover label="3 iş">Zayıf halkalar, satış değeri ve genç gelişimi kurallarından (Transfer Merkezi satış planıyla aynı kurallar); her öneri gerekçesiyle gelir.</HelpPopover>}>
                {fitsPending || squad.isLoading ? <Skeleton className="h-28" /> : actions.length === 0 ? (
                  <p className="text-sm text-ink-2">{players.length < 11 ? 'Öneri için kadroda en az 11 oyuncu olmalı.' : 'Şu an acil bir iş yok.'}</p>
                ) : (
                  <ol className="flex flex-col gap-2">
                    {actions.map((a, i) => (
                      <li key={`${a.kind}-${a.title}`} className="glass-3 flex items-start gap-3 p-2.5">
                        <span aria-hidden="true" className="font-display text-2xl font-bold leading-none text-accent">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><Chip>{KIND_LABEL[a.kind]}</Chip><b className="text-sm">{a.title}</b></div>
                          <p className="mt-1 text-xs text-ink-2">{a.reason}</p>
                        </div>
                        <Link to={a.to} className="shrink-0 text-sm font-semibold text-accent underline-offset-2 hover:underline">Gör</Link>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>
              <Section title="Zaman çizelgesi">
                <Timeline events={events.data ?? []} snapshots={snapshots.data ?? []} />
              </Section>
            </div>
          </div>
        </div>
      </TabPanel>
      <TabPanel idPrefix={PREFIX} id="ayarlar" active={tab === 'ayarlar'}>
        <DeskSettings key={career.id} career={career} />
      </TabPanel>
    </div>
  )
}
