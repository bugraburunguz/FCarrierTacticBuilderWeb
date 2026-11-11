import { useQuery } from '@tanstack/react-query'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { Formation, MatchPlan, OpponentReport, PlayerRef } from '../../api/types'
import { LastRatings } from '../../components/MatchRatings'
import { Pitch } from '../../components/pitch/Pitch'
import { CAREER_PAGE_WIDTH } from '../../design/careerPage'
import { CareerPageHeader } from '../../design/components/CareerPageHeader'
import { Chip, EmptyState, ErrorState, OvrBox, Skeleton } from '../../design/components/primitives'
import { formatAverageRating } from '../../lib/matchData'
import { useActiveCareerId } from '../../state/careerStore'
import { mainTacticKey } from '../career/activeTactic'
import { elevenDiff, groupOpponents, lineRows, missingText, pitchSlotsOf } from './matchCenter'

const STALE_MS = 120_000
const INPUT = 'min-h-10 w-full rounded-[var(--radius-sm)] border border-line bg-[var(--bg-base)] px-3 text-sm text-ink max-sm:min-h-11'
const LINK = 'inline-flex min-h-10 items-center font-semibold text-accent underline-offset-2 hover:underline max-sm:min-h-11'

function Section({ title, label, subtitle, children }: { title: string; label: string; subtitle?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-label={label} className="glass-2 flex min-w-0 flex-col gap-4 p-3 sm:p-4">
      <header>
        <h2 id={id} className="panel-title font-display text-xl font-semibold leading-6">{title}</h2>
        {subtitle && <p className="text-xs text-ink-2">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{title}</h3>
      {children}
    </div>
  )
}

/** missing[] kodu: bölüm yerine kısa açıklama ve içe aktarma bağlantısı. */
function MissingNote({ code }: { code: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
      <span>{missingText(code)}</span>
      <Link to="/career/import" className={LINK}>İçe aktar</Link>
    </p>
  )
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')
const ref = (p?: PlayerRef) => p?.name

/**
 * FCA-23 Maç Merkezi (Faz A): kullanıcı rakibi seçer (?rakip=<teamId>); sayfa rakip raporunu ve bizim için maç planını gösterir.
 * Fikstür yok; rakip elle seçilir. Rol kodları ham geldiği için sahada yalnız mevki. Eksik veri (missing[]) bölüm yerine açıklama; uç hatası sayfayı çökertmez.
 */
export function MatchCenterPage() {
  const careerId = useActiveCareerId()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const [params, setParams] = useSearchParams()
  const raw = Number(params.get('rakip'))
  const teamId = Number.isInteger(raw) && raw > 0 ? raw : undefined
  const [search, setSearch] = useState('')

  const opponents = useQuery({ queryKey: ['match-opponents', id], queryFn: () => endpoints.matchOpponents(id!), enabled: id !== undefined, retry: false, staleTime: STALE_MS })
  const report = useQuery({ queryKey: ['match-report', id, teamId], queryFn: () => endpoints.opponentReport(id!, teamId!), enabled: id !== undefined && teamId !== undefined, retry: false, staleTime: STALE_MS })
  const plan = useQuery({ queryKey: ['match-plan', id, teamId], queryFn: () => endpoints.matchPlan(id!, teamId!), enabled: id !== undefined && teamId !== undefined, retry: false, staleTime: STALE_MS })
  const formations = useQuery({ queryKey: ['formations'], queryFn: () => endpoints.formations(), staleTime: Infinity, enabled: teamId !== undefined })
  const groups = useMemo(() => groupOpponents(opponents.data ?? [], search), [opponents.data, search])

  const choose = (value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set('rakip', value)
    else next.delete('rakip')
    setParams(next, { replace: true })
  }

  const ids = { search: useId(), select: useId() }
  const noTeam = opponents.isSuccess && (opponents.data ?? []).length === 0
  const selectedName = opponents.data?.find((o) => o.teamId === teamId)?.name ?? report.data?.name

  return (
    <div className={`mx-auto flex w-full ${CAREER_PAGE_WIDTH} flex-col gap-3 py-2`}>
      <CareerPageHeader crumb="Maç Merkezi" title="Maç Merkezi" subtitle={selectedName ? `Rakip: ${selectedName}` : career?.clubName ?? undefined} />
      <section aria-label="Rakip seçimi" className="glass-2 flex flex-col gap-2 p-3 sm:flex-row sm:items-end sm:p-4">
        <label htmlFor={ids.search} className="flex flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
          Rakip ara
          <input id={ids.search} type="search" className={INPUT} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Takım ya da lig" />
        </label>
        <label htmlFor={ids.select} className="flex flex-[2] flex-col gap-1 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
          Rakip
          <select id={ids.select} className={INPUT} value={teamId ?? ''} onChange={(e) => choose(e.target.value)} disabled={!opponents.data}>
            <option value="">Rakip seç</option>
            {/* Seçili rakip aramada elenmiş olsa da seçici boş görünmesin. */}
            {teamId !== undefined && !groups.some((g) => g.items.some((o) => o.teamId === teamId)) && <option value={teamId}>{selectedName ?? `Takım ${teamId}`}</option>}
            {groups.map((g) => (
              <optgroup key={g.league} label={g.league}>
                {g.items.map((o) => <option key={o.teamId} value={o.teamId}>{`${o.name} · ${o.overall}`}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      </section>

      {opponents.isError && <ErrorState message="Rakip listesi alınamadı." onRetry={() => opponents.refetch()} />}
      {noTeam && <div className="glass-2 p-3 sm:p-4"><MissingNote code="USER_TEAM" /></div>}
      {teamId === undefined ? (
        !noTeam && <EmptyState>Rakibi seç: rakip raporu ve maç planı burada görünür.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[1100px]:grid-cols-2 min-[1100px]:items-start">
          <OpponentSection query={report} formations={formations.data} />
          <PlanSection query={plan} formations={formations.data} careerId={id} />
        </div>
      )}
    </div>
  )
}

function OpponentSection({ query, formations }: { query: { data?: OpponentReport; isPending: boolean; isError: boolean }; formations?: Formation[] }) {
  if (query.isError) {
    return <Section title="Rakip" label="Rakip"><ErrorState message="Rakip raporu alınamadı." /></Section>
  }
  if (query.isPending || !query.data) {
    return <Section title="Rakip" label="Rakip"><Skeleton className="h-72" /></Section>
  }
  const r = query.data
  const missing = new Set(r.missing)
  if (missing.has('USER_TEAM')) {
    return <Section title="Rakip" label="Rakip"><MissingNote code="USER_TEAM" /></Section>
  }
  const formation = formations?.find((f) => f.id === r.formation?.matchedFormationId) ?? formations?.find((f) => f.id === r.formation?.name)
  const showPitch = !missing.has('FORMATION') && !missing.has('LIKELY_ELEVEN') && r.likelyEleven.length > 0
  const sets = r.setPieces
  const setRows = sets ? ([
    ['Kaptan', ref(sets.captain)], ['Penaltı', ref(sets.penaltyTaker)], ['Serbest vuruş', ref(sets.freeKickTaker)],
    ['Sol korner', ref(sets.leftCornerTaker)], ['Sağ korner', ref(sets.rightCornerTaker)],
  ] as const).filter(([, name]) => name) : []
  return (
    <Section title={`Rakip · ${r.name}`} label="Rakip" subtitle={[r.leagueName, r.formation?.name].filter(Boolean).join(' · ') || undefined}>
      <Block title="Diziliş">
        {r.formation?.defaultFormation && <p className="text-sm text-ink-2">Varsayılan diziliş; AI maç içinde değiştirebilir</p>}
        {!showPitch ? (
          <MissingNote code={missing.has('FORMATION') ? 'FORMATION' : 'LIKELY_ELEVEN'} />
        ) : formation ? (
          <Pitch slots={pitchSlotsOf(formation.slots, r.likelyEleven)} onPickPlayer={() => undefined} readOnly field="cyber" marker="pawn" />
        ) : (
          <ul aria-label="Muhtemel ilk 11" className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {r.likelyEleven.map((p) => <li key={p.playerId} className="flex items-center gap-2"><span className="w-10 font-mono text-xs text-muted">{p.position}</span>{p.name}</li>)}
          </ul>
        )}
      </Block>
      {r.lines && (
        <Block title="Hat güçleri">
          <table aria-label="Hat güçleri" className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr><th scope="col" className="py-1 pr-2">Hat</th><th scope="col" className="pr-2 text-right">Biz</th><th scope="col" className="pr-2 text-right">Rakip</th><th scope="col" className="text-right">Fark</th></tr>
            </thead>
            <tbody>
              {lineRows(r.lines).map((row) => (
                <tr key={row.key} className="border-t border-line">
                  <th scope="row" className="py-1.5 pr-2 font-medium">{row.label}</th>
                  <td className="pr-2 text-right tabular-nums">{row.ours}</td>
                  <td className="pr-2 text-right tabular-nums">{row.opponent}</td>
                  <td className={`text-right font-semibold tabular-nums ${row.diff > 0 ? 'text-good' : row.diff < 0 ? 'text-bad' : 'text-ink-2'}`}>{signed(row.diff)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
      )}
      {(r.buildUpPlay !== undefined && r.buildUpPlay !== null) || (r.defensiveDepth !== undefined && r.defensiveDepth !== null) ? (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {r.buildUpPlay !== undefined && r.buildUpPlay !== null && <div className="glass-3 p-2"><dt className="text-xs text-muted">Oyun kurma</dt><dd className="font-semibold">{String(r.buildUpPlay)}</dd></div>}
          {r.defensiveDepth !== undefined && r.defensiveDepth !== null && <div className="glass-3 p-2"><dt className="text-xs text-muted">Savunma derinliği</dt><dd className="font-semibold tabular-nums">{r.defensiveDepth}</dd></div>}
        </dl>
      ) : null}
      <Block title="Tehlikeli oyuncular">
        {missing.has('SEASON_STATS') ? <MissingNote code="SEASON_STATS" /> : r.dangerousPlayers.length === 0 ? <p className="text-sm text-ink-2">Öne çıkan oyuncu yok.</p> : (
          <ol aria-label="Tehlikeli oyuncular" className="flex flex-col gap-1.5 text-sm">
            {r.dangerousPlayers.map((p) => (
              <li key={p.playerId} className="flex items-center gap-2">
                <OvrBox value={p.overall} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                <span className="text-ink-2 tabular-nums">{`${p.goals} G · ${p.assists} A · Ort. ${formatAverageRating(p.averageRating)}`}</span>
                <span className="text-xs text-muted tabular-nums">{`${p.appearances} maç`}</span>
              </li>
            ))}
          </ol>
        )}
      </Block>
      <Block title="Duran top ve kaptan">
        {missing.has('SET_PIECES') || setRows.length === 0 ? <MissingNote code="SET_PIECES" /> : (
          <ul aria-label="Duran top ve kaptan" className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {setRows.map(([label, name]) => <li key={label}><span className="text-ink-2">{label}:</span> {name}</li>)}
          </ul>
        )}
      </Block>
      {/* Sezon verisi yoksa kart riski de yok; açıklama Tehlikeli oyuncular'da bir kez yazılır. */}
      {!missing.has('SEASON_STATS') && <Block title="Kart riski">
        {r.cardRisk.length === 0 ? <p className="text-sm text-ink-2">Kart riski yüksek oyuncu yok.</p> : (
          <ul aria-label="Kart riski" className="flex flex-col gap-1 text-sm">
            {r.cardRisk.map((p) => (
              <li key={p.playerId} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="tabular-nums text-ink-2">{`${p.yellowCards} sarı · ${p.redCards} kırmızı`}</span>
                <span className="text-xs text-muted tabular-nums">{`${p.appearances} maç`}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>}
    </Section>
  )
}

function PlanSection({ query, formations, careerId }: { query: { data?: MatchPlan; isPending: boolean; isError: boolean }; formations?: Formation[]; careerId?: number }) {
  // Ana taktik ilk 11'i ve oyuncu adları: "öneride X yerine Y" (yalnız plan ana taktiğin dizilişiyle kurulduysa).
  const main = useQuery({ queryKey: mainTacticKey(careerId), queryFn: () => endpoints.mainTactic(careerId!), enabled: careerId !== undefined, retry: false })
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId!), enabled: careerId !== undefined, retry: false })
  const names = useMemo(() => new Map((squad.data ?? []).map((s) => [s.player.id, s.player.name])), [squad.data])

  if (query.isError) {
    return <Section title="Maç planı" label="Maç planı"><ErrorState message="Maç planı alınamadı." /></Section>
  }
  if (query.isPending || !query.data) {
    return <Section title="Maç planı" label="Maç planı"><Skeleton className="h-72" /></Section>
  }
  const p = query.data
  const missing = new Set(p.missing)
  if (missing.has('USER_TEAM')) {
    return <Section title="Maç planı" label="Maç planı"><MissingNote code="USER_TEAM" /></Section>
  }
  const formation = formations?.find((f) => f.id === p.ourFormation?.id)
  const diff = p.ourFormation?.source === 'MAIN_TACTIC' ? elevenDiff(main.data?.lineup ?? undefined, p.ourEleven, names) : []
  const source = p.ourFormation ? `${p.ourFormation.id} · ${p.ourFormation.source === 'MAIN_TACTIC' ? 'ana taktik' : 'takımın varsayılanı'}` : undefined
  const sp = p.setPieces
  const setRows = sp ? [
    ...(sp.ourAerialThreats.length ? [['Hava topu (biz)', sp.ourAerialThreats.map((t) => `${t.name} (${t.score})`).join(', ')]] : []),
    ...(sp.theirAerialThreats.length ? [['Hava topu (rakip)', sp.theirAerialThreats.map((t) => `${t.name} (${t.score})`).join(', ')]] : []),
    ...(sp.ourCornerTaker ? [['Korner (biz)', sp.ourCornerTaker.name]] : []),
    ...(sp.theirCornerTaker ? [['Korner (rakip)', sp.theirCornerTaker.name]] : []),
    ...(sp.theirFreeKickTaker ? [['Serbest vuruş (rakip)', sp.theirFreeKickTaker.name]] : []),
  ] : []
  return (
    <Section title="Maç planı" label="Maç planı" subtitle={source}>
      <Block title="Önerilen ilk 11">
        {missing.has('OUR_FORMATION') || p.ourEleven.length === 0 ? <MissingNote code="OUR_FORMATION" /> : (
          <>
            {formation && <Pitch slots={pitchSlotsOf(formation.slots, p.ourEleven)} onPickPlayer={() => undefined} readOnly field="cyber" marker="pawn" />}
            {diff.length > 0 && (
              <ul aria-label="Ana taktikten fark" className="flex flex-col gap-1 text-sm">
                {diff.map((d) => <li key={d.slotId}>{`Öneride ${d.out} yerine ${d.in}`}</li>)}
              </ul>
            )}
            <ol aria-label="Önerilen ilk 11" className="flex flex-col gap-1 text-sm">
              {p.ourEleven.map((e) => (
                <li key={e.slotId} className="flex min-h-8 items-center gap-2">
                  <span className="w-10 shrink-0 font-mono text-xs text-muted">{e.position}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
                  {e.restSuggested && <Chip tone="warn" title="Yoğun fikstür: dinlendirmeyi düşün">Dinlendir</Chip>}
                  {!missing.has('MATCH_RATINGS') && <LastRatings newestFirst={e.lastRatings} />}
                  <OvrBox value={e.overall} size="sm" />
                </li>
              ))}
            </ol>
            {missing.has('MATCH_RATINGS') && <MissingNote code="MATCH_RATINGS" />}
          </>
        )}
      </Block>
      {p.restCandidates.length > 0 && (
        <Block title="Dinlendirme adayları">
          <ul aria-label="Dinlendirme adayları" className="flex flex-col gap-1 text-sm">
            {p.restCandidates.map((c) => <li key={c.playerId}>{`${c.name} · ${c.matches} maç · ${c.minutes} dk`}</li>)}
          </ul>
          <p className="text-xs text-muted">İlk 11'den çıkarılmadı; karar senin.</p>
        </Block>
      )}
      <Block title="Taktik notları">
        {p.tacticalNotes.length === 0 ? <p className="text-sm text-ink-2">Bu maç için öne çıkan not yok.</p> : (
          <ol aria-label="Taktik notları" className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
            {p.tacticalNotes.slice(0, 5).map((n) => <li key={n.code}>{n.text}</li>)}
          </ol>
        )}
      </Block>
      {setRows.length > 0 && (
        <Block title="Duran top eşleşmesi">
          <ul aria-label="Duran top eşleşmesi" className="flex flex-col gap-1 text-sm">
            {setRows.map(([label, text]) => <li key={label}><span className="text-ink-2">{label}:</span> {text}</li>)}
          </ul>
        </Block>
      )}
    </Section>
  )
}
