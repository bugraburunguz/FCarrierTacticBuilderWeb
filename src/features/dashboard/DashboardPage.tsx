import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRightLeft, FlaskConical, HeartPulse, Repeat, Search } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { CareerSnapshot, RosterEvent } from '../../api/types'
import { CareerSelect } from '../../components/CareerSelect'
import { Chip, EmptyState, Panel, Skeleton, SourceTag, StatTile, TabPanel, Tabs, type DataSource, type StatDelta } from '../../design/components/primitives'
import { currentRoute, deskLink } from '../../lib/deskLinks'
import { EVENT_LABEL, SNAPSHOT_LABEL } from '../../lib/deskRules'
import { formatEur } from '../../lib/format'
import { useActiveCareerId } from '../../state/careerStore'
import { droppedText } from '../career/activeTactic'
import { SeasonJobs } from '../career/SeasonJobs'
import { StarterTacticPanel } from '../career/StarterTacticPanel'
import { useMainTacticFits } from '../career/useMainTacticFits'
import { useTabParam } from '../player/playerPage'
import { teamFitPct } from '../squad/useSlotFits'
import { CareerSettings } from './CareerSettings'
import { financeSummary, upcomingEvents, urgentAlerts, weakLinks } from './dashboardRules'

const TABS = [
  { id: 'masa', label: 'Masa' },
  { id: 'ayarlar', label: 'Ayarlar' },
] as const
const PREFIX = 'masa'
const STALE_MS = 120_000
const PAST_ROWS = 6
const ALERTS_SHOWN = 6
const LINK = 'inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-sm font-semibold max-sm:min-h-11'
const PRIMARY = `${LINK} bg-accent text-on-accent hover:opacity-90`
const SECONDARY = `${LINK} glass-3 hover:bg-[var(--glass-hover)]`
const DATE = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

const signedEur = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : '±'}${formatEur(Math.abs(value))}`
const deltaOf = (value: number | undefined): StatDelta | undefined =>
  value === undefined ? undefined : { value, text: signedEur(value), label: 'önceki içe aktarmaya göre' }

/** Takım uyumu göstergesi: yarım daire (0–100), ortada %; anlam metinde (role="img" + etiket). */
function FitGauge({ pct }: { pct: number }) {
  const r = 80
  const length = Math.PI * r
  return (
    <figure role="img" aria-label={`Takım uyumu %${pct}`} className="flex flex-col items-center">
      <svg viewBox="0 0 200 116" className="w-full max-w-[240px]" aria-hidden="true">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--glass-3)" strokeWidth="16" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--accent)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(length * Math.max(0, Math.min(100, pct))) / 100} ${length}`} />
        <text x="100" y="92" textAnchor="middle" className="fill-[var(--ink)] font-[var(--font-num)]" fontSize="40" fontWeight="600">%{pct}</text>
      </svg>
    </figure>
  )
}

function NoMainTactic() {
  return (
    <EmptyState action={<Link to={deskLink.lab()} className={SECONDARY}>Lab'a git</Link>}>
      Ana taktik seçilmedi
    </EmptyState>
  )
}

function PastTimeline({ events, snapshots }: { events: RosterEvent[]; snapshots: CareerSnapshot[] }) {
  const rows = [
    ...snapshots.map((s) => ({ key: `s${s.id}`, at: s.takenAt, text: `${SNAPSHOT_LABEL[s.source] ?? 'Güncelleme'} · ${s.playerCount} oyuncu` })),
    ...events.map((e) => ({ key: `e${e.id}`, at: e.createdAt ?? '', text: `${EVENT_LABEL[e.type] ?? 'Kadro değişikliği'}${e.playerName ? ` · ${e.playerName}` : ''}${e.feeEur ? ` · ${formatEur(e.feeEur)}` : ''}` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, PAST_ROWS)
  if (rows.length === 0) {
    return <p className="text-sm text-ink-2">Henüz hamle ya da içe aktarma yok.</p>
  }
  return (
    <ol className="space-y-1.5 border-l border-[var(--glass-border)] pl-3 text-sm">
      {rows.map((r) => (
        <li key={r.key}><span className="font-[var(--font-num)] text-xs tabular-nums text-muted">{r.at ? DATE.format(new Date(r.at)) : '–'}</span> {r.text}</li>
      ))}
    </ol>
  )
}

/**
 * Kariyer Masası (KARIYER-UX FAZ 2, 15 §4.1): "Bu dönem ne yapmalıyım?" tek ekranda. Saha yok.
 * Katman 1 (kayıt: kadro, snapshot, olaylar) + katman 2 (ana taktik; yoksa ücretsiz öneri paneli). Lab taslağı (katman 3) okunmaz.
 * Ayarlar sekmesi eski Masa ayarları ile Kadro › kariyer sekmesini birleştirir.
 */
export function DashboardPage() {
  const careerId = useActiveCareerId()
  const navigate = useNavigate()
  const { tab, setTab } = useTabParam(TABS)
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id!), enabled: id !== undefined })
  const facets = useQuery({ queryKey: ['player-facets', id], queryFn: () => endpoints.playerFacets(id!), enabled: id !== undefined, staleTime: STALE_MS })
  const snapshots = useQuery({ queryKey: ['snapshots', id], queryFn: () => endpoints.snapshots(id!), enabled: id !== undefined, retry: false })
  const events = useQuery({ queryKey: ['events', id], queryFn: () => endpoints.events(id!), enabled: id !== undefined, retry: false })
  const { main, rows, pending } = useMainTacticFits(id, squad.data)

  const players = useMemo(() => squad.data ?? [], [squad.data])
  const gameDate = career?.gameDate ?? facets.data?.gameDate
  const isMain = main.source?.kind === 'decision'
  const weakest = useMemo(() => (isMain ? weakLinks(rows) : []), [isMain, rows])
  const shownSlots = useMemo(() => new Set(weakest.map((w) => w.slotId)), [weakest])
  const alerts = useMemo(() => urgentAlerts(players, gameDate), [players, gameDate])
  const upcoming = useMemo(() => (career ? upcomingEvents(career, players, gameDate) : []), [career, players, gameDate])

  if (careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  if (!career) {
    return (
      <div className="mx-auto max-w-[1280px] py-2">
        <h1 className="mb-3 font-display text-[26px] font-bold leading-[30px] sm:text-[32px] sm:leading-9">Kariyer Masası</h1>
        <EmptyState action={<Link to="/career/new" className={PRIMARY}>Yeni kariyer başlat</Link>}>
          Henüz kariyerin yok. Üç dakikada kulübünü seç, masan hazır olsun.
        </EmptyState>
      </div>
    )
  }

  const finance = financeSummary({ career, squadWageEur: facets.data?.squadWageEur, squad: players, snapshots: snapshots.data ?? [], gameDate })
  const lastImport = (snapshots.data ?? []).find((s) => s.source === 'IMPORT')
  const record: DataSource | undefined = lastImport ? { kind: 'record', at: lastImport.takenAt } : undefined
  const decision: DataSource = { kind: 'decision' }
  const teamFit = isMain ? teamFitPct(rows.map((r) => r.display)) : undefined
  const tacticPending = main.isLoading || (isMain && (pending || squad.isLoading))

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 py-2">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Kariyer Masası</h1>
          {record && <SourceTag source={record} />}
        </div>
        <CareerSelect />
      </header>

      <Tabs label="Masa sekmeleri" idPrefix={PREFIX} value={tab} tabs={[...TABS]} onChange={setTab} />
      <TabPanel idPrefix={PREFIX} id="masa" active={tab === 'masa'}>
        <div className="flex flex-col gap-3">
          <SeasonJobs careerId={career.id} squad={players} rows={rows} tacticSource={main.source} record={record} gameDate={gameDate}
            pending={main.isLoading || pending || squad.isLoading} exclude={shownSlots} />
          <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[1100px]:grid-cols-3">
            <Panel title="Finansal sağlık" label="Finansal sağlık" source={record}>
              <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3 min-[768px]:grid-cols-1">
                <StatTile label="Transfer bütçesi" value={finance.budget !== undefined ? formatEur(finance.budget) : undefined} delta={deltaOf(finance.budgetDelta)}>
                  {finance.budget === undefined && <Link to={deskLink.settings()} className="text-xs font-semibold text-accent underline-offset-2 hover:underline">Bütçeyi gir</Link>}
                </StatTile>
                <StatTile label="Maaş bütçesi kullanımı" value={finance.wageUse !== undefined ? `%${finance.wageUse}` : undefined} delta={deltaOf(finance.wageDelta)}>
                  {finance.wageUse !== undefined && (
                    <span aria-hidden="true" className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[var(--glass-3)]">
                      <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, finance.wageUse)}%` }} />
                    </span>
                  )}
                  {finance.wageBudget === undefined && <Link to={deskLink.settings()} className="text-xs font-semibold text-accent underline-offset-2 hover:underline">Maaş bütçesini gir</Link>}
                  {finance.unknownWages > 0 && <span className="text-xs text-muted">{finance.unknownWages} oyuncunun maaşı bilinmiyor</span>}
                </StatTile>
                <StatTile label="Dönem sonuna" value={finance.daysLeft === undefined ? undefined : finance.daysLeft < 0 ? 'Kapandı' : `${finance.daysLeft} gün`}>
                  {!career.windowEndsOn && <Link to={deskLink.settings()} className="text-xs font-semibold text-accent underline-offset-2 hover:underline">Dönem sonunu gir</Link>}
                  {career.windowEndsOn && !gameDate && <span className="text-xs text-muted">Oyun tarihi içe aktarmayla gelir</span>}
                </StatTile>
              </div>
            </Panel>

            <Panel title="Acil uyarılar" label="Acil uyarılar" source={record}>
              <ul className="flex flex-col gap-2 text-sm">
                {alerts.slice(0, ALERTS_SHOWN).map((a) => (
                  <li key={`${a.kind}-${a.playerId}`} className="flex items-start gap-2">
                    {a.kind === 'LOAN' ? <ArrowRightLeft size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warn" /> : <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warn" />}
                    <Link to={currentRoute(a.to)} className="min-w-0 underline-offset-2 hover:underline">{a.text}</Link>
                  </li>
                ))}
                {alerts.length === 0 && <li className="text-ink-2">{gameDate ? 'Sözleşme ya da kiralık uyarısı yok.' : 'Oyun tarihi yok: uyarılar içe aktarmadan sonra gelir.'}</li>}
                <li className="flex items-center gap-2 border-t border-[var(--glass-border)] pt-2 text-ink-2">
                  <HeartPulse size={16} aria-hidden="true" className="shrink-0" />
                  <span>Sakatlık</span>
                  <Chip>Veri yok</Chip>
                </li>
              </ul>
            </Panel>

            <Panel title="Takım uyumu" label="Takım uyumu" source={decision} className="min-[768px]:col-span-2 min-[1100px]:col-span-1">
              {tacticPending ? <Skeleton className="mx-auto h-32 w-56" /> : !isMain ? <NoMainTactic /> : teamFit === undefined ? (
                <EmptyState>{players.length < 11 ? 'Takım uyumu için kadroda en az 11 oyuncu olmalı.' : 'Ana taktikte dizilen oyuncu yok.'}</EmptyState>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FitGauge pct={teamFit} />
                  <p className="text-center text-sm text-ink-2">{main.active?.main?.name ?? 'Ana taktik'} · {main.active?.tactic.formation}</p>
                  {main.dropped > 0 && <p role="status" className="text-center text-sm text-warn">{droppedText(main)}</p>}
                </div>
              )}
            </Panel>
          </div>

          {!main.mainLoading && !isMain && (
            <StarterTacticPanel careerId={career.id} onOpenLab={() => navigate(`${deskLink.lab()}?sekme=kurucu`)} />
          )}

          <Panel title="Zayıf halkalar" label="Zayıf halkalar" source={decision}>
            {tacticPending ? <Skeleton className="h-32" /> : !isMain ? <NoMainTactic /> : weakest.length === 0 ? (
              <p className="text-sm text-ink-2">Zayıf halka yok: dizilimdeki herkes rolüne uygun.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 min-[768px]:grid-cols-3">
                {weakest.map((w) => (
                  <li key={w.slotId} data-fit-state={w.state} className="glass-3 flex flex-col gap-2 p-3">
                    <span className="text-xs font-medium text-muted">{w.position} · {w.roleName}</span>
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <b className="text-base">{w.playerName}</b>
                      <span className="font-[var(--font-num)] text-lg tabular-nums">%{w.pct}</span>
                    </span>
                    <span className="text-sm font-semibold">{w.labelText}</span>
                    {w.reason && <span className="text-sm text-ink-2">{w.reason}</span>}
                    <span className="mt-auto flex flex-wrap gap-2">
                      {/* WRONG_ROLE: birincil "Rolü değiştir" (Lab'da ana taktikten yeni taslak, slot seçili), ikincil aday. WEAK: birincil aday, ikincil "Lab'da dene". */}
                      {w.primary === 'ROLE' && (
                        <Link to={deskLink.lab(w.slotId)} data-variant="primary" className={PRIMARY}>
                          <Repeat size={14} aria-hidden="true" />Rolü değiştir
                        </Link>
                      )}
                      <Link to={currentRoute(deskLink.candidate(w.slotId, w.position, w.roleId))} data-variant={w.primary === 'TRANSFER' ? 'primary' : 'secondary'}
                        className={w.primary === 'TRANSFER' ? PRIMARY : SECONDARY}>
                        <Search size={14} aria-hidden="true" />Transferde aday bul
                      </Link>
                      {w.primary === 'TRANSFER' && (
                        <Link to={deskLink.lab(w.slotId)} data-variant="secondary" className={SECONDARY}>
                          <FlaskConical size={14} aria-hidden="true" />Lab'da dene
                        </Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Zaman çizelgesi" label="Zaman çizelgesi" source={record}>
            <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink-2">Yaklaşan</h3>
                {upcoming.length === 0 ? <p className="text-sm text-ink-2">{gameDate ? 'Yaklaşan tarih yok.' : 'Oyun tarihi yok.'}</p> : (
                  <ol className="space-y-1.5 border-l border-[var(--edge-glow,var(--glass-border))] pl-3 text-sm">
                    {upcoming.map((e) => (
                      <li key={e.key}><span className="font-[var(--font-num)] text-xs tabular-nums text-muted">{DATE.format(new Date(`${e.date}T00:00:00Z`))}</span> <span>{e.text}</span></li>
                    ))}
                  </ol>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink-2">Geçmiş</h3>
                <PastTimeline events={events.data ?? []} snapshots={snapshots.data ?? []} />
              </div>
            </div>
          </Panel>
        </div>
      </TabPanel>
      <TabPanel idPrefix={PREFIX} id="ayarlar" active={tab === 'ayarlar'}>
        <CareerSettings key={career.id} career={career} />
      </TabPanel>
    </div>
  )
}
