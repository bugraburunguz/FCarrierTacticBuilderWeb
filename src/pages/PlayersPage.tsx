import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { endpoints, type PlayerFilters } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { CompareButton } from '../components/CompareButton'
import { useActiveCareerId } from '../state/careerStore'
import { DRAG_TYPE } from '../state/compareStore'
import { Button, Card, EmptyState, ErrorBox, Field, Input, Pill, Select, Spinner } from '../components/ui'
import { ATTR_LABELS, POSITIONS } from '../lib/format'

const FILTER_ATTRS = ['Finishing', 'Vision', 'Crossing', 'Acceleration', 'SprintSpeed', 'Dribbling', 'Stamina', 'Strength', 'DefAwareness', 'Heading']
const PAGE_SIZE = 25
const RESERVED = new Set(['career', 'team', 'free_agent', 'ovr_min', 'pot_min', 'age_min', 'age_max', 'wf_min', 'sm_min', 'pot_max', 'ovr_max'])
const TEXT_SORTS = new Set(['name', 'club', 'league', 'nationality', 'position', 'accelerate'])
const GENDERS: [string, string][] = [['0', 'Erkek futbolu'], ['1', 'Kadın futbolu'], ['', 'Hepsi']]

function readFilters(params: URLSearchParams): PlayerFilters {
  const num = (key: string) => (params.get(key) ? Number(params.get(key)) : undefined)
  const attrMin: Record<string, number> = {}
  params.forEach((value, key) => {
    if (key.endsWith('_min') && !RESERVED.has(key) && value !== '' && Number.isFinite(Number(value))) {
      attrMin[key.slice(0, -4)] = Number(value)
    }
  })
  return {
    q: params.get('q') ?? undefined,
    pos: params.getAll('pos'),
    gender: params.has('gender') ? num('gender') : 0,
    league: num('league'),
    career: num('career'),
    team: num('team'),
    free_agent: params.get('free_agent') === '1' ? true : undefined,
    nat: num('nat'),
    ovr_min: num('ovr_min'),
    pot_min: num('pot_min'),
    age_min: num('age_min'),
    age_max: num('age_max'),
    foot: params.get('foot') ?? undefined,
    sort: params.get('sort') ?? 'overall',
    order: (params.get('order') as 'asc' | 'desc') ?? 'desc',
    page: num('page') ?? 0,
    size: PAGE_SIZE,
    attrMin,
  }
}

function SortHeader({ label, column, filters, onSort }: { label: string; column: string; filters: PlayerFilters; onSort: (column: string) => void }) {
  const active = filters.sort === column
  const arrow = !active ? '↕' : filters.order === 'asc' ? '↑' : '↓'
  return (
    <th scope="col" aria-sort={active ? (filters.order === 'asc' ? 'ascending' : 'descending') : 'none'} className="pr-2">
      <button type="button" onClick={() => onSort(column)} className={`flex items-center gap-1 uppercase transition hover:text-emerald-700 ${active ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
        {label} <span aria-hidden className={active ? '' : 'opacity-40'}>{arrow}</span>
      </button>
    </th>
  )
}

export function PlayersPage() {
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const { authenticated } = useAuth()
  const activeCareer = useActiveCareerId()
  const [teamTerm, setTeamTerm] = useState('')
  const careerTeams = useQuery({
    queryKey: ['career-teams', activeCareer, teamTerm],
    queryFn: () => endpoints.careerTeams(activeCareer!, teamTerm),
    enabled: authenticated && activeCareer !== undefined && filters.career !== undefined,
  })
  const [draftAttr, setDraftAttr] = useState({ attr: FILTER_ATTRS[0], min: '' })
  const query = useQuery({ queryKey: ['players', params.toString()], queryFn: () => endpoints.players(filters), placeholderData: keepPreviousData })
  const leagues = useQuery({ queryKey: ['leagues', filters.gender], queryFn: () => endpoints.leagues(filters.gender), staleTime: 300_000 })
  const nationalities = useQuery({ queryKey: ['nationalities'], queryFn: endpoints.nationalities, staleTime: 300_000 })

  function update(changes: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v === undefined || v === '' ? next.delete(k) : next.set(k, v)))
    if (resetPage) {
      next.delete('page')
    }
    setParams(next)
  }

  function sortBy(column: string) {
    if (filters.sort === column) {
      update({ order: filters.order === 'asc' ? 'desc' : 'asc' })
    } else {
      update({ sort: column, order: TEXT_SORTS.has(column) ? 'asc' : 'desc' })
    }
  }

  const page = filters.page ?? 0
  const total = query.data?.totalItems ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card title="Filtreler" className="h-fit">
        <div className="space-y-3">
          <Field label="Futbol">
            <Select value={params.has('gender') ? (params.get('gender') ?? '') : '0'} onChange={(e) => update({ gender: e.target.value, league: undefined, nat: undefined }, true)}>
              {GENDERS.map(([v, l]) => (
                <option key={l} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          {authenticated && activeCareer !== undefined && (
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 dark:border-slate-600 dark:bg-slate-800">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={filters.career !== undefined}
                  onChange={(e) => update({ career: e.target.checked ? String(activeCareer) : undefined, team: undefined, free_agent: undefined })}
                />
                Kariyer verisiyle göster (güncel overall/potential)
              </label>
              {filters.career !== undefined && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!filters.free_agent} onChange={(e) => update({ free_agent: e.target.checked ? '1' : undefined, team: undefined })} />
                    Sadece serbest oyuncular
                  </label>
                  <Field label="Takım">
                    <Input value={teamTerm} onChange={(e) => setTeamTerm(e.target.value)} placeholder="Takım ara…" />
                    <Select className="mt-1" value={filters.team ?? ''} onChange={(e) => update({ team: e.target.value, free_agent: undefined })}>
                      <option value="">Tüm takımlar</option>
                      {(careerTeams.data ?? []).map((t) => (
                        <option key={t.teamId} value={t.teamId}>{t.name}</option>
                      ))}
                    </Select>
                  </Field>
                  <p className="text-xs text-slate-500">Veri yoksa önce <Link to="/career/import" className="underline">içe aktar</Link>.</p>
                </>
              )}
            </div>
          )}
          <Field label="İsim">
            <Input value={filters.q ?? ''} onChange={(e) => update({ q: e.target.value })} placeholder="Oyuncu ara…" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Mevki">
              <Select value={filters.pos?.[0] ?? ''} onChange={(e) => update({ pos: e.target.value })}>
                <option value="">Hepsi</option>
                {POSITIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Ayak">
              <Select value={filters.foot ?? ''} onChange={(e) => update({ foot: e.target.value })}>
                <option value="">Hepsi</option>
                <option value="Right">Sağ</option>
                <option value="Left">Sol</option>
              </Select>
            </Field>
          </div>
          <Field label="Lig">
            <Select value={filters.league ?? ''} onChange={(e) => update({ league: e.target.value })}>
              <option value="">Tüm ligler</option>
              {(leagues.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.count})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Uyruk">
            <Select value={filters.nat ?? ''} onChange={(e) => update({ nat: e.target.value })}>
              <option value="">Tüm ülkeler</option>
              {(nationalities.data ?? []).map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Min. genel">
              <Input type="number" min={40} max={99} value={filters.ovr_min ?? ''} onChange={(e) => update({ ovr_min: e.target.value })} />
            </Field>
            <Field label="Min. POT*">
              <Input type="number" min={40} max={99} value={filters.pot_min ?? ''} onChange={(e) => update({ pot_min: e.target.value })} />
            </Field>
            <Field label="Min. yaş">
              <Input type="number" min={15} max={50} value={filters.age_min ?? ''} onChange={(e) => update({ age_min: e.target.value })} />
            </Field>
            <Field label="Maks. yaş">
              <Input type="number" min={15} max={50} value={filters.age_max ?? ''} onChange={(e) => update({ age_max: e.target.value })} />
            </Field>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Attribute alt sınırı</p>
            <div className="flex gap-1">
              <Select aria-label="Attribute" value={draftAttr.attr} onChange={(e) => setDraftAttr({ ...draftAttr, attr: e.target.value })}>
                {FILTER_ATTRS.map((a) => (
                  <option key={a} value={a}>
                    {ATTR_LABELS[a]}
                  </option>
                ))}
              </Select>
              <Input aria-label="Alt sınır" type="number" min={1} max={99} className="w-16" value={draftAttr.min} onChange={(e) => setDraftAttr({ ...draftAttr, min: e.target.value })} />
              <Button variant="secondary" disabled={!draftAttr.min} onClick={() => { update({ [`${draftAttr.attr.toLowerCase()}_min`]: draftAttr.min }); setDraftAttr({ ...draftAttr, min: '' }) }}>
                +
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(filters.attrMin ?? {}).map(([attr, value]) => (
                <button key={attr} type="button" onClick={() => update({ [`${attr}_min`]: undefined })} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 transition hover:bg-emerald-200">
                  {ATTR_LABELS[Object.keys(ATTR_LABELS).find((a) => a.toLowerCase() === attr) ?? ''] ?? attr} ≥ {value} ×
                </button>
              ))}
            </div>
          </div>
          <Button variant="ghost" onClick={() => setParams(new URLSearchParams())}>
            Temizle
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <ErrorBox error={query.error} />
        {query.isLoading ? (
          <Spinner />
        ) : query.data && query.data.items.length === 0 ? (
          <EmptyState>Bu filtrelerle oyuncu bulunamadı.</EmptyState>
        ) : (
          query.data && (
            <Card title={`${total.toLocaleString('tr-TR')} oyuncu`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <SortHeader label="Oyuncu" column="name" filters={filters} onSort={sortBy} />
                      <SortHeader label="Yaş" column="age" filters={filters} onSort={sortBy} />
                      <SortHeader label="Mevki" column="position" filters={filters} onSort={sortBy} />
                      <SortHeader label="GEN" column="overall" filters={filters} onSort={sortBy} />
                      <SortHeader label="POT*" column="potential" filters={filters} onSort={sortBy} />
                      <SortHeader label="Kulüp" column="club" filters={filters} onSort={sortBy} />
                      <SortHeader label="Uyruk" column="nationality" filters={filters} onSort={sortBy} />
                      <SortHeader label="AcceleRATE" column="accelerate" filters={filters} onSort={sortBy} />
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.items.map((p) => (
                      <tr
                        key={p.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ id: p.id, name: p.name, overall: p.overall, position: p.positions[0] ?? '' }))}
                        className="cursor-grab border-t border-slate-100 transition hover:bg-emerald-50/60 dark:border-slate-700 dark:hover:bg-slate-700/40">
                        <td className="py-1.5 pr-2 font-medium">
                          <Link to={`/players/${p.id}`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                            {p.name}
                          </Link>
                        </td>
                        <td className="pr-2">{p.age ?? '—'}</td>
                        <td className="pr-2">{p.positions.slice(0, 3).join(', ')}</td>
                        <td className="pr-2 font-semibold tabular-nums">{p.overall}</td>
                        <td className="pr-2 tabular-nums">{p.potential ?? '—'}</td>
                        <td className="pr-2">{p.club ?? '—'}</td>
                        <td className="pr-2">{p.nationality ?? '—'}</td>
                        <td>{p.accelerate ? <Pill>{p.accelerate}</Pill> : '—'}{!!p.runStyle && <Pill>Özel #{p.runStyle}</Pill>}</td>
                        <td><CompareButton compact entry={{ id: p.id, name: p.name, overall: p.overall, position: p.positions[0] ?? "" }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">* Potential modelimizin tahminidir; EA’nın gerçek değeri değildir. Başlıklara tıklayarak sıralayabilirsin.</p>
              <div className="mt-3 flex items-center justify-between">
                <Button variant="secondary" disabled={page <= 0} onClick={() => update({ page: String(page - 1) }, false)}>
                  ← Önceki
                </Button>
                <span className="text-sm text-slate-500">
                  Sayfa {page + 1} / {pages}
                </span>
                <Button variant="secondary" disabled={page + 1 >= pages} onClick={() => update({ page: String(page + 1) }, false)}>
                  Sonraki →
                </Button>
              </div>
            </Card>
          )
        )}
      </div>
    </div>
  )
}
