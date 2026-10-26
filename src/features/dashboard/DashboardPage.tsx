import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRightLeft, CalendarClock, DatabaseZap, FlaskConical, HeartPulse, Info, Repeat, Search, UserRound } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { CareerSnapshot, RosterEvent } from '../../api/types'
import { CareerSelect } from '../../components/CareerSelect'
import { Chip, EmptyState, ErrorState, Panel, Skeleton, SourceTag, StatTile, TabPanel, Tabs, type DataSource, type StatDelta } from '../../design/components/primitives'
import { deskLink } from '../../lib/deskLinks'
import { CAREER_PAGE_WIDTH } from '../../design/careerPage'
import { useMediaQuery } from '../../design/useMediaQuery'
import { EVENT_LABEL } from '../../lib/deskRules'
import { formatEur } from '../../lib/format'
import { useActiveCareerId } from '../../state/careerStore'
import { droppedText } from '../career/activeTactic'
import { SeasonJobs } from '../career/SeasonJobs'
import { StarterTacticPanel } from '../career/StarterTacticPanel'
import { useMainTacticFits } from '../career/useMainTacticFits'
import { useTacticRisks } from '../lab/useTacticRisks'
import { toTacticRequest } from '../../lib/tactic'
import { useTabParam } from '../player/playerPage'
import { betterRoleText, FIT_TERMS, fitTitle, roleFitText, teamRoleFit, teamStrength } from '../../lib/fitLabels'
import { useManagerProfile } from '../manager/managerQuery'
import { CareerSettings } from './CareerSettings'
import { financeSummary, recordGaps, snapshotTimeline, upcomingEvents, urgentAlerts, weakLinks, withContracts, type RecordGap } from './dashboardRules'

const TABS = [
  { id: 'masa', label: 'Masa' },
  { id: 'ayarlar', label: 'Ayarlar' },
] as const
const PREFIX = 'masa'
const STALE_MS = 120_000
const PAST_ROWS = 6
/** FAZ 6a-C: Masa ≥1280 px'te üç sütun. */
const WIDE_QUERY = '(min-width: 1280px)'
const ALERTS_SHOWN = 6
const LINK = 'inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-sm font-semibold max-sm:min-h-11'
const PRIMARY = `${LINK} bg-accent text-on-accent hover:opacity-90`
const SECONDARY = `${LINK} glass-3 hover:bg-[var(--glass-hover)]`
const DATE = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

const signedEur = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : '±'}${formatEur(Math.abs(value))}`
const deltaOf = (value: number | undefined): StatDelta | undefined =>
  value === undefined ? undefined : { value, text: signedEur(value), label: 'önceki içe aktarmaya göre' }

/** Takım gücü göstergesi (FIT-1: Güç ortalaması): yarım daire (0–100), ortada %; anlam metinde (role="img" + etiket). */
function FitGauge({ pct }: { pct: number }) {
  const r = 80
  const length = Math.PI * r
  return (
    <figure role="img" aria-label={`${FIT_TERMS.strength.team} %${pct}`} title={FIT_TERMS.strength.help} className="flex flex-col items-center">
      <svg viewBox="0 0 200 116" className="w-full max-w-[240px]" aria-hidden="true">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--glass-3)" strokeWidth="16" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--accent)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(length * Math.max(0, Math.min(100, pct))) / 100} ${length}`} />
        <text x="100" y="92" textAnchor="middle" className="fill-[var(--ink)] font-[var(--font-num)]" fontSize="40" fontWeight="600">%{pct}</text>
      </svg>
    </figure>
  )
}

/** Ad zaten formasyonu taşıyorsa ("Ana taktik · 4-3-3") formasyon tekrar yazılmaz. */
const tacticLabel = (name: string | undefined, formation: string | undefined) => {
  const title = name ?? 'Ana taktik'
  return formation && !title.includes(formation) ? `${title} · ${formation}` : title
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
    // FAZ 6a-E: dünya oyuncu sayısı değil kadro; aynı gün içe aktarmaları tek satır.
    ...snapshotTimeline(snapshots),
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

/** MGR-b §3: küçük menajer satırı; tıklayınca profil. Profil yoksa oluşturma satırı; alınamazsa satır yok; başka etkisi yok. */
function ManagerLine() {
  const { data, missing } = useManagerProfile()
  const className = 'inline-flex min-h-10 items-center gap-1.5 self-start text-xs text-ink-2 underline-offset-2 hover:text-ink hover:underline max-sm:min-h-11'
  // Profil yoksa (sunucu: data null) aynı yerde oluşturma çağrısı: kullanıcı menajer ekranını bulamıyordu. Alınamadıysa satır yok.
  if (missing) {
    return (
      <Link to="/career/manager?sonra=masa" className={className}>
        <UserRound size={14} aria-hidden="true" />Menajer profilini oluştur → kulüp önerileri ve itibar
      </Link>
    )
  }
  if (!data) {
    return null
  }
  return (
    <Link to="/career/manager?sonra=masa" className={className}>
      <UserRound size={14} aria-hidden="true" />Menajer: {data.profile.name || '—'} · itibar {data.band}
    </Link>
  )
}

/** FAZ 6a-A: kayıt verisi eksikse tek bant: ne eksik, neyi etkiliyor, nasıl tamamlanır (boş kutular tek tek gösterilmez). */
function RecordGapsBanner({ gaps }: { gaps: RecordGap[] }) {
  return (
    <section aria-label="Kayıt verisi eksik" className="glass-2 flex flex-col gap-2 border-l-4 border-l-[var(--warn)] p-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold leading-6">
        <DatabaseZap size={18} aria-hidden="true" className="text-warn" />Kayıt verisi eksik
      </h2>
      <ul className="flex flex-col gap-1 text-sm">
        {gaps.map((g) => <li key={g.key}><b>{g.missing}</b> yok: {g.affects} hesaplanamıyor.</li>)}
      </ul>
      <p className="text-sm text-ink-2">Tamamlamak için oyunda kariyerin içindeyken export al ve içe aktar; bu kutular veri gelince kendiliğinden dolar.</p>
      <Link to="/career/import" className={`${SECONDARY} self-start`}>Kariyer içinden yeniden içe aktar</Link>
    </section>
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
  // KARIYER-UX 6: birleşik uyarılar — zayıf halka kartında yakın sözleşme bitişi, acil sözleşme uyarısında ilk 11 bilgisi.
  const weakest = useMemo(() => (isMain ? withContracts(weakLinks(rows), players, gameDate) : []), [isMain, rows, players, gameDate])
  const shownSlots = useMemo(() => new Set(weakest.map((w) => w.slotId)), [weakest])
  const starters = useMemo(() => (isMain ? new Set(rows.map((r) => r.playerId)) : undefined), [isMain, rows])
  const alerts = useMemo(() => urgentAlerts(players, gameDate, starters), [players, gameDate, starters])
  const upcoming = useMemo(() => (career ? upcomingEvents(career, players, gameDate) : []), [career, players, gameDate])
  const wide = useMediaQuery(WIDE_QUERY)
  // FIT-1 madde 5 / FIT-2 madde 7: ana taktiğin taktik riskleri (Lab ile aynı liste: kurulum + diziliş kuralları); Masa yalnız sayıyı gösterir.
  const setup = isMain ? main.active?.tactic.setup : undefined
  const assigned = useMemo(() => Object.fromEntries(rows.map((r) => [r.slotId, r.playerId])), [rows])
  const mainTactic = isMain ? main.active?.tactic : undefined
  const tacticRequest = useMemo(() => (mainTactic ? toTacticRequest(mainTactic) : undefined), [mainTactic])
  const tacticRisks = useTacticRisks({ careerId: id, setup, tactic: tacticRequest, assigned })

  if (careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  // REVIEW Y5: liste alınamadıysa "kariyerin yok" demek yanlış; hata ve tekrar dene. Eldeki veri varken başarısız yenileme sayfayı düşürmez.
  if (careers.isError && !careers.data) {
    return <ErrorState message="Kariyerler yüklenemedi." onRetry={() => careers.refetch()} />
  }
  if (!career) {
    return (
      <div className={`mx-auto ${CAREER_PAGE_WIDTH} py-2`}>
        <h1 className="mb-3 font-display text-[26px] font-bold leading-[30px] sm:text-[32px] sm:leading-9">Kariyer Masası</h1>
        <EmptyState action={<Link to="/career/new" className={PRIMARY}>Kulüp önerilerini gör</Link>}>
          Henüz kariyerin yok. Menajer profiline göre 6 kulüp önerelim; birini seç, masan hazır olsun.
        </EmptyState>
      </div>
    )
  }

  const finance = financeSummary({ career, squadWageEur: facets.data?.squadWageEur, squad: players, snapshots: snapshots.data ?? [], gameDate })
  const lastImport = (snapshots.data ?? []).find((s) => s.source === 'IMPORT')
  const record: DataSource | undefined = lastImport ? { kind: 'record', at: lastImport.takenAt } : undefined
  const decision: DataSource = { kind: 'decision' }
  // FIT-1 madde 1: iki takım değeri, iki ad — Takım gücü (Güç ortalaması) ve Rol oturması.
  const teamFit = isMain ? teamStrength(rows.map((r) => r.display)) : undefined
  const teamFitRole = isMain ? teamRoleFit(rows.map((r) => r.display)) : undefined
  const risks = tacticRisks.risks.length
  const tacticPending = main.isLoading || (isMain && (pending || squad.isLoading))
  // FAZ 6a-A: eksik kayıt verisi tek bantta; o veriye bağlı kutular katlanır, yalnız mevcut veri görünür.
  const gaps = recordGaps(gameDate, facets.data)
  const noGameDate = gaps.some((g) => g.key === 'gameDate')
  const noContracts = gaps.some((g) => g.key === 'contracts')
  const settingsLink = 'text-xs font-semibold text-accent underline-offset-2 hover:underline'

  const jobsPanel = (
    <SeasonJobs careerId={career.id} squad={players} rows={rows} tacticSource={main.source} gameDate={gameDate}
      pending={main.isLoading || pending || squad.isLoading} exclude={shownSlots} />
  )
  const financePanel = (
    <Panel title="Finansal sağlık" label="Finansal sağlık" source={record}>
      <div className={wide ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 gap-2 min-[480px]:grid-cols-3 min-[768px]:grid-cols-1'}>
        <StatTile label="Transfer bütçesi" value={finance.budget !== undefined ? formatEur(finance.budget) : undefined} delta={deltaOf(finance.budgetDelta)}>
          {finance.budget === undefined && <Link to={deskLink.settings()} className={settingsLink}>Bütçeyi gir</Link>}
        </StatTile>
        {!(noContracts && finance.wageUse === undefined) && (
          <StatTile label="Maaş bütçesi kullanımı" value={finance.wageUse !== undefined ? `%${finance.wageUse}` : undefined} delta={deltaOf(finance.wageDelta)}>
            {finance.wageUse !== undefined && (
              <span aria-hidden="true" className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[var(--glass-3)]">
                <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, finance.wageUse)}%` }} />
              </span>
            )}
            {finance.wageBudget === undefined && <Link to={deskLink.settings()} className={settingsLink}>Maaş bütçesini gir</Link>}
            {finance.unknownWages > 0 && <span className="text-xs text-muted">{finance.unknownWages} oyuncunun maaşı bilinmiyor</span>}
          </StatTile>
        )}
        {!noGameDate && (
          <StatTile label="Dönem sonuna" value={finance.daysLeft === undefined ? undefined : finance.daysLeft < 0 ? 'Kapandı' : `${finance.daysLeft} gün`}>
            {!career.windowEndsOn && <Link to={deskLink.settings()} className={settingsLink}>Dönem sonunu gir</Link>}
          </StatTile>
        )}
      </div>
    </Panel>
  )
  // Uyarıların hepsi oyun tarihine göre; oyun tarihi yoksa kutu hiç çizilmez (eksik bantta yazılı).
  const alertsPanel = noGameDate ? null : (
    <Panel title="Acil uyarılar" label="Acil uyarılar" source={record}>
      <ul className="flex flex-col gap-2 text-sm">
        {alerts.slice(0, ALERTS_SHOWN).map((a) => (
          <li key={`${a.kind}-${a.playerId}`} className="flex items-start gap-2">
            {a.kind === 'LOAN' ? <ArrowRightLeft size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warn" /> : <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warn" />}
            <Link to={a.to} className="min-w-0 underline-offset-2 hover:underline">{a.text}</Link>
          </li>
        ))}
        {alerts.length === 0 && <li className="text-ink-2">Sözleşme ya da kiralık uyarısı yok.</li>}
        <li className="flex items-center gap-2 border-t border-[var(--glass-border)] pt-2 text-ink-2">
          <HeartPulse size={16} aria-hidden="true" className="shrink-0" />
          <span>Sakatlık</span>
          <Chip>Veri yok</Chip>
        </li>
      </ul>
    </Panel>
  )
  const fitPanel = (
    <Panel title={FIT_TERMS.strength.team} label={FIT_TERMS.strength.team} source={decision} className={wide ? undefined : 'min-[768px]:col-span-2 min-[1100px]:col-span-1'}>
      {tacticPending ? <Skeleton className="mx-auto h-32 w-56" /> : !isMain ? <NoMainTactic /> : teamFit === undefined ? (
        <EmptyState>{players.length < 11 ? `${FIT_TERMS.strength.team} için kadroda en az 11 oyuncu olmalı.` : 'Ana taktikte dizilen oyuncu yok.'}</EmptyState>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <FitGauge pct={teamFit} />
          {teamFitRole !== undefined && (
            <p title={FIT_TERMS.roleFit.help} className="text-center text-sm font-semibold">{roleFitText(teamFitRole)}</p>
          )}
          <p className="text-center text-sm text-ink-2">{tacticLabel(main.active?.main?.name, main.active?.tactic.formation)}</p>
          {main.dropped > 0 && <p role="status" className="text-center text-sm text-warn">{droppedText(main)}</p>}
          {/* FIT-1 madde 5: ana taktiğin taktik riskleri (ayrıntı Lab yan panelinde). */}
          {tacticRisks.ready && (risks > 0
            ? <Link to={`${deskLink.lab()}?sekme=kurucu`} className="inline-flex items-center gap-1 text-sm text-warn underline-offset-2 hover:underline"><AlertTriangle size={14} aria-hidden="true" />{risks} taktik riski · Lab'da gör</Link>
            : <p className="text-xs text-ink-2">Belirgin taktik riski yok.</p>)}
        </div>
      )}
    </Panel>
  )
  const starterPanel = !main.mainLoading && !isMain ? (
    <StarterTacticPanel careerId={career.id} onOpenLab={() => navigate(`${deskLink.lab()}?sekme=kurucu`)} />
  ) : null
  const weakPanel = (
    <Panel title="Zayıf halkalar" label="Zayıf halkalar" source={decision} actions={(
      // FAZ 6a-G / FIT-1: kartlardaki iki sayının anlamı.
      <span title={`${FIT_TERMS.roleFit.help} ${FIT_TERMS.strength.help}`} className="inline-flex items-center gap-1 text-xs text-ink-2">
        <Info size={14} aria-hidden="true" />{FIT_TERMS.roleFit.name} ve {FIT_TERMS.strength.name}
      </span>
    )}>
      {tacticPending ? <Skeleton className="h-32" /> : !isMain ? <NoMainTactic /> : weakest.length === 0 ? (
        <p className="text-sm text-ink-2">Zayıf halka yok: dizilimdeki herkes rolüne uygun.</p>
      ) : (
        <ul className={`grid grid-cols-1 gap-2 ${wide ? '' : 'min-[768px]:grid-cols-3'}`}>
          {weakest.map((w) => (
            <li key={w.slotId} data-fit-state={w.state} className="glass-3 flex flex-col gap-2 p-3">
              {w.classText && <span className="text-sm font-semibold text-warn">{w.classText}</span>}
              <span className="text-xs font-medium text-muted">{w.position} · {w.roleName}</span>
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <b className="text-base">{w.playerName}</b>
                <span title={FIT_TERMS.roleFit.help} className="font-[var(--font-num)] text-sm tabular-nums">{fitTitle({ strength: w.strength, roleFit: w.roleFit })}</span>
              </span>
              <span className={w.classText ? 'text-xs text-ink-2' : 'text-sm font-semibold'}>{w.labelText}</span>
              {w.reason && <span className="text-sm text-ink-2">{w.reason}</span>}
              {w.primary === 'ROLE' && w.betterRole && <span className="text-sm font-medium text-info">{betterRoleText(w.betterRole)}</span>}
              {w.contractMonths !== undefined && (
                <Link to={deskLink.contract(w.playerId)} className="inline-flex items-center gap-1 text-sm text-ink underline-offset-2 hover:underline">
                  <CalendarClock size={14} aria-hidden="true" />Sözleşmesi {w.contractMonths} ay içinde bitiyor
                </Link>
              )}
              <span className="mt-auto flex flex-wrap gap-2">
                {/* WRONG_ROLE: birincil "Rolü değiştir" (Lab'da ana taktikten yeni taslak, slot seçili), ikincil aday. WEAK: birincil aday, ikincil "Lab'da dene". */}
                {w.primary === 'ROLE' && (
                  <Link to={deskLink.lab(w.slotId, w.betterRole?.roleId)} data-variant="primary" className={PRIMARY}>
                    <Repeat size={14} aria-hidden="true" />Rolü değiştir
                  </Link>
                )}
                <Link to={deskLink.candidate(w.slotId, w.position, w.roleId)} data-variant={w.primary === 'TRANSFER' ? 'primary' : 'secondary'}
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
  )
  const timelinePanel = (
    <Panel title="Zaman çizelgesi" label="Zaman çizelgesi" source={record}>
      <div className={`grid grid-cols-1 gap-4 ${noGameDate || wide ? '' : 'min-[768px]:grid-cols-2'}`}>
        {!noGameDate && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-2">Yaklaşan</h3>
            {upcoming.length === 0 ? <p className="text-sm text-ink-2">Yaklaşan tarih yok.</p> : (
              <ol className="space-y-1.5 border-l border-[var(--edge-glow,var(--glass-border))] pl-3 text-sm">
                {upcoming.map((e) => (
                  <li key={e.key}><span className="font-[var(--font-num)] text-xs tabular-nums text-muted">{DATE.format(new Date(`${e.date}T00:00:00Z`))}</span> <span>{e.text}</span></li>
                ))}
              </ol>
            )}
          </div>
        )}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink-2">Geçmiş</h3>
          <PastTimeline events={events.data ?? []} snapshots={snapshots.data ?? []} />
        </div>
      </div>
    </Panel>
  )

  return (
    <div className={`mx-auto flex w-full ${CAREER_PAGE_WIDTH} flex-col gap-3 py-2`}>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Kariyer Masası</h1>
          {record && <SourceTag source={record} />}
        </div>
        <CareerSelect />
        <ManagerLine />
      </header>
      {squad.isError && <ErrorState message="Kadro yüklenemedi." onRetry={() => squad.refetch()} />}

      <Tabs label="Masa sekmeleri" idPrefix={PREFIX} value={tab} tabs={[...TABS]} onChange={setTab} />
      <TabPanel idPrefix={PREFIX} id="masa" active={tab === 'masa'}>
        {gaps.length > 0 && <div className="mb-3"><RecordGapsBanner gaps={gaps} /></div>}
        {wide ? (
          // FAZ 6a-C: ≥1280 px üç sütun — sol: 3 iş + zayıf halkalar · orta: uyum (+ başlangıç önerisi) · sağ: finans + uyarılar + zaman çizelgesi.
          <div className="grid grid-cols-3 items-start gap-3">
            <div data-masa-col="left" className="flex min-w-0 flex-col gap-3">{jobsPanel}{weakPanel}</div>
            <div data-masa-col="middle" className="flex min-w-0 flex-col gap-3">{fitPanel}{starterPanel}</div>
            <div data-masa-col="right" className="flex min-w-0 flex-col gap-3">{financePanel}{alertsPanel}{timelinePanel}</div>
          </div>
        ) : (
          // Mobil ve orta genişlik düzeni değişmez.
          <div className="flex flex-col gap-3">
            {jobsPanel}
            <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[1100px]:grid-cols-3">
              {financePanel}{alertsPanel}{fitPanel}
            </div>
            {starterPanel}
            {weakPanel}
            {timelinePanel}
          </div>
        )}
      </TabPanel>
      <TabPanel idPrefix={PREFIX} id="ayarlar" active={tab === 'ayarlar'}>
        <CareerSettings key={career.id} career={career} />
      </TabPanel>
    </div>
  )
}

