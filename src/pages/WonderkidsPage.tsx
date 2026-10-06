import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { CompareButton } from '../components/CompareButton'
import { Card, EmptyState, ErrorBox, Field, Select, Spinner } from '../components/ui'
import { POSITIONS } from '../lib/format'
import { useActiveCareerId } from '../state/careerStore'

const AGE_LIMITS = [18, 19, 20, 21, 23]

export function WonderkidsPage() {
  const careerId = useActiveCareerId()
  const [gender, setGender] = useState(0)
  const [position, setPosition] = useState('')
  const [league, setLeague] = useState('')
  const [ageMax, setAgeMax] = useState(21)
  const [useCareer, setUseCareer] = useState(false)

  const leagues = useQuery({ queryKey: ['leagues', gender], queryFn: () => endpoints.leagues(gender), staleTime: 600_000 })
  const kids = useQuery({
    queryKey: ['wonderkids', gender, position, league, ageMax, useCareer, careerId],
    queryFn: () =>
      endpoints.players({
        gender,
        pos: position ? [position] : undefined,
        league: league ? Number(league) : undefined,
        age_max: ageMax,
        pot_min: 70,
        sort: 'potential',
        order: 'desc',
        size: 50,
        career: useCareer ? careerId : undefined,
      }),
    staleTime: 60_000,
  })

  return (
    <div className="space-y-4">
      <Card title="Wonderkids — en iyi genç yetenekler">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Futbol">
            <Select value={gender} onChange={(e) => { setGender(Number(e.target.value)); setLeague('') }}>
              <option value={0}>Erkek</option>
              <option value={1}>Kadın</option>
            </Select>
          </Field>
          <Field label="Mevki">
            <Select value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="">Tümü</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Lig">
            <Select value={league} onChange={(e) => setLeague(e.target.value)}>
              <option value="">Tümü</option>
              {(leagues.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="En fazla yaş">
            <Select value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))}>
              {AGE_LIMITS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={useCareer} disabled={careerId === undefined} onChange={(e) => setUseCareer(e.target.checked)} />
            Kariyer verisiyle (güncel POT)
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">POT* model tahminidir; kariyer verisi seçilirse içe aktarılan gerçek değerler kullanılır. Potansiyeli 70 ve üstü oyuncular, potansiyele göre sıralı.</p>
      </Card>

      <Card>
        {kids.isLoading ? (
          <Spinner />
        ) : kids.error ? (
          <ErrorBox error={kids.error} />
        ) : (kids.data?.items ?? []).length === 0 ? (
          <EmptyState>Bu ölçütlerde genç yetenek bulunamadı.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1 pr-2">#</th>
                  <th className="pr-2">Oyuncu</th>
                  <th className="pr-2">Yaş</th>
                  <th className="pr-2">Mevki</th>
                  <th className="pr-2 text-right">OVR</th>
                  <th className="pr-2 text-right">POT*</th>
                  <th className="pr-2">Kulüp</th>
                  <th className="pr-2">Lig</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(kids.data?.items ?? []).map((p, index) => (
                  <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="py-1.5 pr-2 text-slate-400">{index + 1}</td>
                    <td className="pr-2 font-medium">
                      <Link to={`/players/${p.id}`} className="text-emerald-700 hover:underline dark:text-emerald-400">{p.name}</Link>
                    </td>
                    <td className="pr-2">{p.age ?? '—'}</td>
                    <td className="pr-2">{p.positions.slice(0, 2).join(', ')}</td>
                    <td className="pr-2 text-right font-semibold tabular-nums">{p.overall}</td>
                    <td className="pr-2 text-right tabular-nums">{p.potential ?? '—'}</td>
                    <td className="pr-2">{p.club ?? '—'}</td>
                    <td className="pr-2 text-slate-500">{p.league ?? '—'}</td>
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
