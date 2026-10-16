import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { TeamProfile, TeamSummary } from '../../api/types'
import { CareerSelect } from '../../components/CareerSelect'
import { Select } from '../../components/ui'
import { MobileSheet, useIsMobile } from '../../design/components/MobileSheet'
import { Chip, EmptyState, ErrorState, SidePanel, Skeleton, StatTile } from '../../design/components/primitives'
import { useActiveCareerId } from '../../state/careerStore'
import { CatalogSearch, CatalogShell } from '../catalog/CatalogShell'
import { usePageParams } from '../player/playerPage'
import { filterTeams, isOwnTeam, useCareerTeams, type TeamSort } from './useCareerTeams'

const SORTS: { id: TeamSort; label: string }[] = [
  { id: 'overall', label: 'Genel güç' },
  { id: 'attack', label: 'Hücum' },
  { id: 'midfield', label: 'Orta saha' },
  { id: 'defence', label: 'Savunma' },
  { id: 'name', label: 'Ad' },
]
const NUM = 'font-[var(--font-num)] tabular-nums'

function Profile({ profile }: { profile: TeamProfile }) {
  const t = profile.team
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Genel" value={t.overall} />
        <StatTile label="Hücum" value={t.attack} />
        <StatTile label="Orta saha" value={t.midfield} />
        <StatTile label="Savunma" value={t.defence} />
      </div>
      {(profile.averageAge || profile.rivalTeamName) && (
        <p className="text-xs text-ink-2">{profile.averageAge ? `İlk 18 yaş ortalaması ${profile.averageAge}` : ''}{profile.averageAge && profile.rivalTeamName ? ' · ' : ''}{profile.rivalTeamName ? `Ezeli rakip: ${profile.rivalTeamName}` : ''}</p>
      )}
      <Insights title="Güçlü yönler" items={profile.strengths} tone="good" />
      <Insights title="Zayıf yönler" items={profile.weaknesses} tone="bad" />
      <Insights title="Kulüp kültürü" items={profile.culture} tone="info" />
      <section className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">Kilit oyuncular</h3>
        <ul className="divide-y divide-[var(--glass-border)]">
          {profile.topPlayers.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
              <Link to={`/players/${p.id}`} className="min-w-0 truncate hover:underline">{p.name} <span className="text-xs text-ink-2">{p.positions[0]}{p.age ? ` · ${p.age}` : ''}</span></Link>
              <span className={NUM}><b>{p.overall}</b> <span className="text-ink-2">/ {p.potential ?? '–'}</span></span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Insights({ title, items, tone }: { title: string; items: string[]; tone: 'good' | 'bad' | 'info' }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 ? <p className="text-xs text-ink-2">Belirgin bir şey yok.</p> : (
        <ul className="flex flex-wrap gap-1.5">{items.map((item) => <li key={item}><Chip tone={tone}>{item}</Chip></li>)}</ul>
      )}
    </section>
  )
}

function TeamTable({ rows, clubName, selected, onSelect }: { rows: TeamSummary[]; clubName?: string; selected?: number; onSelect: (id: number) => void }) {
  return (
    <div className="glass overflow-x-auto p-2">
      <table aria-label="Takımlar" className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs font-medium text-ink-2">
          <tr>
            <th scope="col" className="px-2 py-1.5">Takım</th>
            <th scope="col" className="px-2">Lig</th>
            <th scope="col" className="px-2 text-right">Genel</th>
            <th scope="col" className="px-2 text-right">Hücum</th>
            <th scope="col" className="px-2 text-right">Orta saha</th>
            <th scope="col" className="px-2 text-right">Savunma</th>
            <th scope="col" className="px-2 text-right">Oyuncu</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const own = isOwnTeam(t, clubName)
            return (
              <tr key={t.teamId} aria-current={own ? 'true' : undefined} aria-selected={selected === t.teamId} className={`border-t border-[var(--glass-border)] ${own ? 'bg-[var(--accent-soft)]' : selected === t.teamId ? 'bg-[var(--glass-hover)]' : ''}`}>
                <th scope="row" className="px-2 py-1.5 font-medium">
                  <button type="button" onClick={() => onSelect(t.teamId)} className="min-h-8 text-left hover:underline max-sm:min-h-11">{t.name}</button>
                  {own && <Chip tone="info" className="ml-2">Senin kulübün</Chip>}
                </th>
                <td className="px-2 text-ink-2">{t.league ?? '–'}</td>
                <td className={`px-2 text-right font-semibold ${NUM}`}>{t.overall ?? '–'}</td>
                <td className={`px-2 text-right ${NUM}`}>{t.attack ?? '–'}</td>
                <td className={`px-2 text-right ${NUM}`}>{t.midfield ?? '–'}</td>
                <td className={`px-2 text-right ${NUM}`}>{t.defence ?? '–'}</td>
                <td className={`px-2 text-right text-ink-2 ${NUM}`}>{t.playerCount}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * v3 Takımlar (/teams, V3-07c; 11 §9 Katalog): yapışkan süzgeç (arama → sunucu, lig ve sıralama istemcide; hepsi adreste), kulüp gücü tablosu,
 * kariyerin kulübü vurgulu (adla eşleşir), seçili takımın profili sağ panelde (mobilde alttan sheet). Veri yalnız içe aktarılan kariyerden.
 */
export function TeamsV3Page() {
  const careerId = useActiveCareerId()
  const { params, set } = usePageParams()
  const term = params.get('q') ?? ''
  const league = params.get('lig') ?? undefined
  const sort = (SORTS.find((s) => s.id === params.get('sirala'))?.id ?? 'overall') as TeamSort
  const selected = params.get('takim') ? Number(params.get('takim')) : undefined
  const { teams, profile } = useCareerTeams(careerId, term, selected)
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const clubName = careers.data?.find((c) => c.id === careerId)?.clubName
  const mobile = useIsMobile()
  const all = teams.data ?? []
  const leagues = [...new Set(all.map((t) => t.league).filter((l): l is string => Boolean(l)))].sort((a, b) => a.localeCompare(b, 'tr'))
  const rows = filterTeams(all, league, sort)
  const selectedTeam = all.find((t) => t.teamId === selected)

  const bar = (
    <div className="flex flex-wrap items-end gap-3">
      <CatalogSearch value={term} onChange={(q) => set({ q: q || undefined })} placeholder="Takım adı" />
      <label className="flex min-w-[160px] flex-col gap-1 text-xs font-medium text-muted">
        Lig
        <Select value={league ?? ''} onChange={(e) => set({ lig: e.target.value || undefined })}>
          <option value="">Tüm ligler</option>
          {leagues.map((l) => <option key={l} value={l}>{l}</option>)}
        </Select>
      </label>
      <label className="flex min-w-[140px] flex-col gap-1 text-xs font-medium text-muted">
        Sırala
        <Select value={sort} onChange={(e) => set({ sirala: e.target.value === 'overall' ? undefined : e.target.value })}>
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </Select>
      </label>
    </div>
  )

  const detail = selected !== undefined && (
    profile.isLoading ? <Skeleton className="h-64" /> : profile.isError ? <ErrorState message="Takım profili yüklenemedi." onRetry={() => profile.refetch()} /> : profile.data ? <Profile profile={profile.data} /> : null
  )

  return (
    <CatalogShell title="Takımlar" subtitle={<div className="pt-1"><CareerSelect /></div>} bar={bar}>
      {careerId === undefined ? (
        <EmptyState action={<Link to="/career/new" className="font-semibold text-accent underline-offset-2 hover:underline">Yeni kariyer başlat</Link>}>Takımları görmek için bir kariyer seç.</EmptyState>
      ) : teams.isLoading ? (
        <div className="flex flex-col gap-1.5">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : teams.isError ? (
        <ErrorState message="Takımlar yüklenemedi." onRetry={() => teams.refetch()} />
      ) : all.length === 0 && !term ? (
        <EmptyState action={<Link to="/career/import" className="font-semibold text-accent underline-offset-2 hover:underline">Kariyer verisini içe aktar</Link>}>Takım verisi oyundaki kariyerinden gelir.</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>Bu süzgeçlere uyan takım yok.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4 min-[1100px]:flex-row min-[1100px]:items-start">
          <div className="min-w-0 flex-1">
            <p role="status" className="mb-2 text-xs text-muted">{rows.length} takım</p>
            <TeamTable rows={rows} clubName={clubName} selected={selected} onSelect={(id) => set({ takim: String(id) })} />
          </div>
          {selected !== undefined && !mobile && (
            <SidePanel title={selectedTeam?.name ?? profile.data?.team.name ?? 'Takım'} onClose={() => set({ takim: undefined })}>{detail}</SidePanel>
          )}
        </div>
      )}
      {selected !== undefined && mobile && (
        <MobileSheet title={selectedTeam?.name ?? profile.data?.team.name ?? 'Takım'} onClose={() => set({ takim: undefined })}>{detail}</MobileSheet>
      )}
    </CatalogShell>
  )
}
