import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { endpoints, type PlayerFilters } from '../api/endpoints'
import { Button, Card, EmptyState, ErrorBox, Field, Input, Pill, Select, Spinner } from '../components/ui'
import { ATTR_LABELS, POSITIONS, formatEur } from '../lib/format'

const SORTS: [string, string][] = [
  ['overall', 'Genel'],
  ['potential', 'Potential (tahmin)'],
  ['value', 'Değer (tahmin)'],
  ['name', 'İsim'],
  ['finishing', 'Bitiricilik'],
  ['vision', 'Vizyon'],
  ['crossing', 'Orta'],
  ['acceleration', 'Hızlanma'],
]
const FILTER_ATTRS = ['Finishing', 'Vision', 'Crossing', 'Acceleration', 'SprintSpeed', 'Dribbling', 'Stamina', 'Strength', 'DefAwareness', 'Heading']
const PAGE_SIZE = 25

function readFilters(params: URLSearchParams): PlayerFilters {
  const num = (key: string) => (params.get(key) ? Number(params.get(key)) : undefined)
  const attrMin: Record<string, number> = {}
  const RESERVED = new Set(['ovr_min', 'pot_min'])
  params.forEach((value, key) => {
    if (key.endsWith('_min') && !RESERVED.has(key) && value !== '' && Number.isFinite(Number(value))) {
      attrMin[key.slice(0, -4)] = Number(value)
    }
  })
  return {
    q: params.get('q') ?? undefined,
    pos: params.getAll('pos'),
    ovr_min: num('ovr_min'),
    sort: params.get('sort') ?? 'overall',
    order: (params.get('order') as 'asc' | 'desc') ?? 'desc',
    page: num('page') ?? 0,
    size: PAGE_SIZE,
    attrMin,
  }
}

export function PlayersPage() {
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const [draftAttr, setDraftAttr] = useState({ attr: FILTER_ATTRS[0], min: '' })
  const query = useQuery({ queryKey: ['players', params.toString()], queryFn: () => endpoints.players(filters), placeholderData: keepPreviousData })

  function update(changes: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v === undefined || v === '' ? next.delete(k) : next.set(k, v)))
    if (resetPage) {
      next.delete('page')
    }
    setParams(next)
  }

  const page = filters.page ?? 0
  const total = query.data?.totalItems ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card title="Filtreler" className="h-fit">
        <div className="space-y-3">
          <Field label="İsim">
            <Input value={filters.q ?? ''} onChange={(e) => update({ q: e.target.value })} placeholder="Oyuncu ara…" />
          </Field>
          <Field label="Mevki">
            <Select value={filters.pos?.[0] ?? ''} onChange={(e) => update({ pos: e.target.value })}>
              <option value="">Hepsi</option>
              {POSITIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Min. genel">
            <Input type="number" min={40} max={99} value={filters.ovr_min ?? ''} onChange={(e) => update({ ovr_min: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Sırala">
              <Select value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
                {SORTS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Yön">
              <Select value={filters.order} onChange={(e) => update({ order: e.target.value })}>
                <option value="desc">Yüksek → düşük</option>
                <option value="asc">Düşük → yüksek</option>
              </Select>
            </Field>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Attribute alt sınırı</p>
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
                <button key={attr} type="button" onClick={() => update({ [`${attr}_min`]: undefined })} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
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
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-1 pr-2">Oyuncu</th>
                      <th className="pr-2">Yaş</th>
                      <th className="pr-2">Mevki</th>
                      <th className="pr-2">GEN</th>
                      <th className="pr-2">POT*</th>
                      <th className="pr-2">Değer*</th>
                      <th className="pr-2">Kulüp</th>
                      <th>AcceleRATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.items.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1.5 pr-2 font-medium">
                          <Link to={`/players/${p.id}`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                            {p.name}
                          </Link>
                        </td>
                        <td className="pr-2">{p.age ?? '—'}</td>
                        <td className="pr-2">{p.positions.slice(0, 3).join(', ')}</td>
                        <td className="pr-2 font-semibold tabular-nums">{p.overall}</td>
                        <td className="pr-2 tabular-nums">{p.potential ?? '—'}</td>
                        <td className="pr-2 tabular-nums">{formatEur(p.valueEur)}</td>
                        <td className="pr-2">{p.club ?? '—'}</td>
                        <td>{p.accelerate ? <Pill>{p.accelerate}</Pill> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">* Potential ve değer modelimizin tahminidir; EA’nın gerçek değerleri değildir.</p>
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
