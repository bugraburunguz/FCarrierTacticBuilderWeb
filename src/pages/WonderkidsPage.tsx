import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { CompareButton } from '../components/CompareButton'
import { BadgeDot, Button, Card, EmptyState, ErrorBox, Field, Input, Select, Spinner } from '../components/ui'
import { POSITIONS } from '../lib/format'
import { useActiveCareerId } from '../state/careerStore'

const AGE_LIMITS = [17, 19, 21, 23]
const SORTS = [
  { id: 'potential', label: 'Potansiyel' },
  { id: 'gap', label: 'Gelişim payı (POT − OVR)' },
  { id: 'role', label: 'Seçili role uyum' },
  { id: 'value', label: 'Ucuz cevher (POT / değer)' },
]

interface Filters {
  gender: number
  position: string
  league: string
  maxAge: number
  minPot: number
  budgetM: string
  role: string
  sort: string
}

const DEFAULTS: Filters = { gender: 0, position: '', league: '', maxAge: 21, minPot: 70, budgetM: '', role: '', sort: 'potential' }

const PRESETS: { label: string; apply: Partial<Filters> }[] = [
  { label: 'En iyi U21 kanatlar', apply: { position: 'RW', maxAge: 21, minPot: 80, sort: 'potential' } },
  { label: 'Her mevkide en yüksek potansiyel', apply: { position: '', maxAge: 21, minPot: 85, sort: 'potential' } },
  { label: 'Ucuz cevherler', apply: { position: '', maxAge: 21, minPot: 75, sort: 'value' } },
  { label: 'En büyük gelişim payı', apply: { position: '', maxAge: 19, minPot: 78, sort: 'gap' } },
]

export function WonderkidsPage() {
  const careerId = useActiveCareerId()
  const [filters, setFilters] = useState<Filters>(DEFAULTS)
  const [useCareer, setUseCareer] = useState(false)
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }))

  const leagues = useQuery({ queryKey: ['leagues', filters.gender], queryFn: () => endpoints.leagues(filters.gender), staleTime: 600_000 })
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles, staleTime: 600_000 })
  const roleOptions = useMemo(() => {
    const list = (roles.data ?? []).filter((r) => !filters.position || r.positions.includes(filters.position))
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [roles.data, filters.position])

  const budget = filters.budgetM ? Math.round(Number(filters.budgetM) * 1_000_000) : undefined
  const kids = useQuery({
    queryKey: ['wonderkids', filters, useCareer, careerId],
    queryFn: () =>
      endpoints.wonderkids({
        gender: filters.gender,
        pos: filters.position || undefined,
        league: filters.league ? Number(filters.league) : undefined,
        maxAge: filters.maxAge,
        minPot: filters.minPot,
        budgetMax: budget,
        role: filters.role || undefined,
        sort: filters.sort,
        career: useCareer ? careerId : undefined,
        limit: 50,
      }),
    staleTime: 60_000,
  })
  const rows = kids.data ?? []
  const hasRole = Boolean(filters.role)

  return (
    <div className="space-y-4">
      <Card title="Wonderkids — en iyi genç yetenekler">
        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.label} variant="secondary" onClick={() => setFilters({ ...DEFAULTS, ...p.apply })}>
              {p.label}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Futbol">
            <Select value={filters.gender} onChange={(e) => set({ gender: Number(e.target.value), league: '' })}>
              <option value={0}>Erkek</option>
              <option value={1}>Kadın</option>
            </Select>
          </Field>
          <Field label="Mevki">
            <Select value={filters.position} onChange={(e) => set({ position: e.target.value, role: '' })}>
              <option value="">Tümü</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Rol (uyum için)">
            <Select value={filters.role} onChange={(e) => set({ role: e.target.value, sort: e.target.value ? 'role' : filters.sort })}>
              <option value="">Seçme</option>
              {roleOptions.map((r) => (
                <option key={r.id} value={r.id}>{r.name} · {r.focus}</option>
              ))}
            </Select>
          </Field>
          <Field label="Lig">
            <Select value={filters.league} onChange={(e) => set({ league: e.target.value })}>
              <option value="">Tümü</option>
              {(leagues.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="En fazla yaş">
            <Select value={filters.maxAge} onChange={(e) => set({ maxAge: Number(e.target.value) })}>
              {AGE_LIMITS.map((a) => (
                <option key={a} value={a}>U{a}</option>
              ))}
            </Select>
          </Field>
          <Field label="En az potansiyel">
            <Input type="number" min={50} max={99} value={filters.minPot} onChange={(e) => set({ minPot: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Bütçe üst sınırı (M€)">
            <Input type="number" min={0} step="0.5" placeholder="sınırsız" value={filters.budgetM} onChange={(e) => set({ budgetM: e.target.value })} />
          </Field>
          <Field label="Sıralama">
            <Select value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
              {SORTS.filter((s) => s.id !== 'role' || hasRole).map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useCareer} disabled={careerId === undefined} onChange={(e) => setUseCareer(e.target.checked)} />
          Kariyer verisiyle (güncel OVR / POT)
        </label>
        <p className="mt-2 text-xs text-muted">
          POT* model tahminidir; kariyer verisi seçilirse içe aktarılan gerçek değerler kullanılır. Rol seçilirse oyuncunun o roldeki uyumu ve potansiyeline ulaşınca tahmini uyumu gösterilir. Değer verisi yoksa ucuz cevher sıralaması boş kalır.
        </p>
      </Card>

      <Card>
        {kids.isLoading ? (
          <Spinner />
        ) : kids.error ? (
          <ErrorBox error={kids.error} />
        ) : rows.length === 0 ? (
          <EmptyState>Bu ölçütlerde genç yetenek bulunamadı.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-1 pr-2">#</th>
                  <th className="pr-2">Oyuncu</th>
                  <th className="pr-2">Yaş</th>
                  <th className="pr-2">Mevki</th>
                  <th className="pr-2 text-right">OVR → POT*</th>
                  <th className="pr-2 text-right">Pay</th>
                  {hasRole && <th className="pr-2">Rol uyumu</th>}
                  <th className="pr-2">Kulüp</th>
                  <th className="pr-2">Lig</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p, index) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-1.5 pr-2 text-muted">{index + 1}</td>
                    <td className="pr-2 font-medium">
                      <Link to={`/players/${p.id}`} className="text-accent hover:underline">{p.name}</Link>
                    </td>
                    <td className="pr-2">{p.age ?? '—'}</td>
                    <td className="pr-2">{p.positions.slice(0, 2).join(', ')}</td>
                    <td className="pr-2 text-right tabular-nums">
                      <b>{p.overall}</b> → {p.potential}
                    </td>
                    <td className="pr-2 text-right tabular-nums text-accent">+{p.gap}</td>
                    {hasRole && (
                      <td className="pr-2">
                        {p.roleScore === undefined ? '—' : (
                          <span className="inline-flex items-center gap-1.5">
                            {p.roleBadge && <BadgeDot state={p.roleBadge} />}%{Math.round(p.roleScore)}
                            {p.projectedBadge && <><span className="text-muted">→</span><BadgeDot state={p.projectedBadge} /></>}
                            <span className="text-xs text-muted">{p.rolePosition}</span>
                          </span>
                        )}
                      </td>
                    )}
                    <td className="pr-2">{p.club ?? '—'}</td>
                    <td className="pr-2 text-muted">{p.league ?? '—'}</td>
                    <td>
                      <CompareButton compact entry={{ id: p.id, name: p.name, overall: p.overall, position: p.positions[0] ?? '' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
