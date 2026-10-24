import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { Wonderkid } from '../../api/types'
import { FitBadge } from '../../components/card/FitBadge'
import { CompareButton } from '../../components/CompareButton'
import { ShortlistButton } from '../../components/ShortlistButton'
import { HelpPopover, Input, Select } from '../../components/ui'
import { MobileSheet, useIsMobile } from '../../design/components/MobileSheet'
import { Button, Chip, EmptyState, ErrorState, Skeleton } from '../../design/components/primitives'
import { fitDisplay, FIT_STATE_TEXT } from '../../lib/fitLabels'
import { POSITIONS } from '../../lib/format'
import { useActiveCareerId } from '../../state/careerStore'
import { BucketChip } from '../careerPlayers/BucketChip'
import { LeagueLevelChip } from '../careerPlayers/LeagueLevelChip'
import { CatalogFiltersButton, CatalogShell, MoreFilters } from '../catalog/CatalogShell'
import { usePageParams } from '../player/playerPage'
import { AGE_LIMITS, useWonderkids, WONDERKID_DEFAULTS, WONDERKID_PRESETS, WONDERKID_SORTS, type WonderkidFilters } from './useWonderkids'

const NUM = 'font-[var(--font-num)] tabular-nums'
/** Süzgeç ↔ adres: varsayılanlar yazılmaz. */
const PARAM: Record<keyof WonderkidFilters, string> = { gender: 'cins', position: 'mevki', league: 'lig', maxAge: 'yas', minPot: 'pot', budgetM: 'butce', role: 'rol', sort: 'sirala' }

function filtersFrom(params: URLSearchParams): WonderkidFilters {
  const num = (key: string, fallback: number) => (params.get(key) !== null && !Number.isNaN(Number(params.get(key))) ? Number(params.get(key)) : fallback)
  return {
    gender: num(PARAM.gender, WONDERKID_DEFAULTS.gender),
    position: POSITIONS.includes(params.get(PARAM.position) ?? '') ? params.get(PARAM.position)! : '',
    league: params.get(PARAM.league) ?? '',
    maxAge: num(PARAM.maxAge, WONDERKID_DEFAULTS.maxAge),
    minPot: num(PARAM.minPot, WONDERKID_DEFAULTS.minPot),
    budgetM: params.get(PARAM.budgetM) ?? '',
    role: params.get(PARAM.role) ?? '',
    sort: WONDERKID_SORTS.some((s) => s.id === params.get(PARAM.sort)) ? params.get(PARAM.sort)! : WONDERKID_DEFAULTS.sort,
  }
}

function toPatch(next: WonderkidFilters): Record<string, string | undefined> {
  return Object.fromEntries((Object.keys(PARAM) as (keyof WonderkidFilters)[]).map((k) => [PARAM[k], String(next[k]) === String(WONDERKID_DEFAULTS[k]) ? undefined : String(next[k])]))
}

/** Rol uyumu: yüzde ve etiket aynı sayıdan (levelFit; V3-07c 0a); potansiyele ulaşınca beklenen etiket metinle. */
function RoleCell({ kid }: { kid: Wonderkid }) {
  if (kid.roleScore === undefined) {
    return <span className="text-ink-2">–</span>
  }
  const now = fitDisplay({ levelFit: kid.roleLevelFit, currentFit: kid.roleScore, fitLabel: kid.roleFitLabel, badge: kid.roleBadge })
  const later = kid.projectedFitLabel ? fitDisplay({ fitLabel: kid.projectedFitLabel }).state : undefined
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <FitBadge state={now.state} pct={now.pct} />
      {later && <span className="text-xs text-ink-2">→ {FIT_STATE_TEXT[later].label.replace('Rol için ', '')}</span>}
      {kid.rolePosition && <span className="text-xs text-ink-2">{kid.rolePosition}</span>}
    </span>
  )
}

function FilterFields({ f, set, leagues, roles }: { f: WonderkidFilters; set: (p: Partial<WonderkidFilters>) => void; leagues: { id: number; name: string }[]; roles: { id: string; name: string; focus: string }[] }) {
  const label = 'flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-medium text-muted'
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className={label}>Futbol<Select value={f.gender} onChange={(e) => set({ gender: Number(e.target.value), league: '' })}><option value={0}>Erkek</option><option value={1}>Kadın</option></Select></label>
      <label className={label}>Rol (uyum için)
        <Select value={f.role} onChange={(e) => set({ role: e.target.value, sort: e.target.value ? 'role' : f.sort === 'role' ? 'potential' : f.sort })}>
          <option value="">Seçme</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.focus}</option>)}
        </Select>
      </label>
      <label className={label}>Lig<Select value={f.league} onChange={(e) => set({ league: e.target.value })}><option value="">Tümü</option>{leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></label>
      <label className={label}>En fazla yaş<Select value={f.maxAge} onChange={(e) => set({ maxAge: Number(e.target.value) })}>{AGE_LIMITS.map((a) => <option key={a} value={a}>U{a}</option>)}</Select></label>
      <label className={label}>En az potansiyel<Input type="number" min={50} max={99} value={f.minPot} onChange={(e) => set({ minPot: Number(e.target.value) || 0 })} /></label>
      <label className={label}>Bütçe üst sınırı (M€)<Input type="number" min={0} step="0.5" placeholder="Sınırsız" value={f.budgetM} onChange={(e) => set({ budgetM: e.target.value })} /></label>
    </div>
  )
}

/**
 * v3 Genç yetenekler (/wonderkids, V3-07c; 11 §9 Katalog): yapışkan süzgeç (hazır seçimler, mevki çipleri, sıralama; ek süzgeçler katlanır / mobilde sheet),
 * hepsi adreste. Kariyer seçiliyse kariyer verisiyle; her satırda Lig seviyesi (kariyerin lig gücüne göre) ve ulaşılabilirlik kovası (oyuncu sayfasıyla aynı).
 */
export function WonderkidsV3Page() {
  const { params, set: setParams } = usePageParams()
  const f = filtersFrom(params)
  const set = (patch: Partial<WonderkidFilters>) => setParams(toPatch({ ...f, ...patch }))
  const careerId = useActiveCareerId()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const inCareer = careerId !== undefined && (careers.data ?? []).some((c) => c.id === careerId)
  const { leagues, roleOptions, kids } = useWonderkids(f, inCareer ? careerId : undefined)
  const facets = useQuery({ queryKey: ['player-facets', careerId], queryFn: () => endpoints.playerFacets(careerId!), enabled: inCareer, staleTime: 300_000 })
  const mobile = useIsMobile()
  const [sheet, setSheet] = useState(false)
  const rows = kids.data ?? []
  const hasRole = Boolean(f.role)
  const extra = [f.role, f.league, f.budgetM, f.gender !== 0 ? 'x' : '', f.maxAge !== WONDERKID_DEFAULTS.maxAge ? 'x' : '', f.minPot !== WONDERKID_DEFAULTS.minPot ? 'x' : ''].filter(Boolean).length
  const fields = <FilterFields f={f} set={set} leagues={leagues.data ?? []} roles={roleOptions} />

  const bar = (
    <>
      <div role="group" aria-label="Hazır seçimler" className="flex flex-wrap gap-1.5">
        {WONDERKID_PRESETS.map((p) => <Chip key={p.label} onClick={() => setParams(toPatch({ ...WONDERKID_DEFAULTS, ...p.apply }))}>{p.label}</Chip>)}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[180px] flex-col gap-1 text-xs font-medium text-muted">
          Sırala
          <Select value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
            {WONDERKID_SORTS.filter((s) => s.id !== 'role' || hasRole).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </label>
        {mobile && <CatalogFiltersButton count={extra} onOpen={() => setSheet(true)} />}
      </div>
      <div role="group" aria-label="Mevki" className="flex gap-1.5 max-[819px]:-mx-3 max-[819px]:overflow-x-auto max-[819px]:px-3 max-[819px]:pb-1 min-[820px]:flex-wrap">
        {POSITIONS.map((p) => <Chip key={p} pressed={f.position === p} onClick={() => set({ position: f.position === p ? '' : p, role: '' })}>{p}</Chip>)}
      </div>
      {!mobile && <MoreFilters count={extra}>{fields}</MoreFilters>}
    </>
  )

  return (
    <CatalogShell
      title="Genç yetenekler"
      subtitle={<p className="flex items-center gap-1 text-sm text-ink-2">{inCareer ? 'Kariyer verinle: güncel OVR/POT ve ulaşılabilirlik.' : 'Katalog verisiyle; kariyer seçersen güncel değerler ve ulaşılabilirlik gelir.'}<HelpPopover label="Potansiyel ve uyum">POT* model tahminidir; kariyer verisiyle içe aktarılan gerçek değerler kullanılır. Rol seçilirse oyuncunun o roldeki uyumu (kendi seviyesine göre) ve potansiyeline ulaşınca beklenen etiketi gösterilir. Değer verisi yoksa ucuz cevher sıralaması boş kalır.</HelpPopover></p>}
      bar={bar}
    >
      {mobile && sheet && (
        <MobileSheet title="Filtreler" onClose={() => setSheet(false)}>
          <div className="flex flex-col gap-3">
            {fields}
            <div className="flex gap-2">
              <Button onClick={() => setParams(toPatch(WONDERKID_DEFAULTS))}>Temizle</Button>
              <Button variant="primary" onClick={() => setSheet(false)}>{rows.length} oyuncuyu göster</Button>
            </div>
          </div>
        </MobileSheet>
      )}
      {kids.isLoading ? (
        <div className="flex flex-col gap-1.5">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : kids.isError ? (
        <ErrorState message="Genç yetenekler yüklenemedi." onRetry={() => kids.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState action={<Button onClick={() => setParams(toPatch(WONDERKID_DEFAULTS))}>Süzgeçleri sıfırla</Button>}>Bu ölçütlerde genç yetenek yok.</EmptyState>
      ) : (
        <>
          <p role="status" className="text-xs text-muted">{rows.length} oyuncu</p>
          <div className="glass overflow-x-auto p-2">
            <table aria-label="Genç yetenekler" className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs font-medium text-ink-2">
                <tr>
                  <th scope="col" className="px-2 py-1.5">#</th>
                  <th scope="col" className="px-2">Oyuncu</th>
                  <th scope="col" className="px-2 text-right">Yaş</th>
                  <th scope="col" className="px-2">Mevki</th>
                  <th scope="col" className="px-2 text-right">OVR → POT*</th>
                  <th scope="col" className="px-2 text-right">Pay</th>
                  {hasRole && <th scope="col" className="px-2">Rol uyumu</th>}
                  {inCareer && <th scope="col" className="px-2">Lig seviyesi</th>}
                  {inCareer && <th scope="col" className="px-2">Ulaşılabilirlik</th>}
                  <th scope="col" className="px-2">Kulüp</th>
                  <th scope="col" className="px-2"><span className="sr-only">Karşılaştır</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id} className="border-t border-[var(--glass-border)]">
                    <td className={`px-2 py-1.5 text-ink-2 ${NUM}`}>{i + 1}</td>
                    <td className="px-2 font-medium"><Link to={`/players/${p.id}`} className="hover:underline">{p.name}</Link></td>
                    <td className={`px-2 text-right ${NUM}`}>{p.age ?? '–'}</td>
                    <td className="px-2">{p.positions.slice(0, 2).join(', ')}</td>
                    <td className={`px-2 text-right ${NUM}`}><b>{p.overall}</b> → {p.potentialRange ?? p.potential}</td>
                    <td className={`px-2 text-right ${NUM}`}>+{p.gap}</td>
                    {hasRole && <td className="px-2"><RoleCell kid={p} /></td>}
                    {inCareer && <td className="px-2"><LeagueLevelChip overall={p.overall} leagueOvr={facets.data?.leagueOvr ?? undefined} /></td>}
                    {inCareer && <td className="px-2"><BucketChip bucket={p.feasibility} /></td>}
                    <td className="px-2 text-ink-2">{p.club ?? '–'}<span className="block text-xs">{p.league ?? ''}</span></td>
                    <td className="px-2">
                      <span className="flex items-center gap-1">
                        <CompareButton compact entry={{ id: p.id, name: p.name, overall: p.overall, position: p.positions[0] ?? '' }} />
                        {inCareer && <ShortlistButton careerId={careerId!} playerId={p.id} compact />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CatalogShell>
  )
}
