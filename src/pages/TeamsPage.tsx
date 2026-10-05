import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { CareerSelect } from '../components/CareerSelect'
import { Card, EmptyState, ErrorBox, Field, Input, Pill, Spinner } from '../components/ui'
import { useActiveCareerId } from '../state/careerStore'

export function TeamsPage() {
  const careerId = useActiveCareerId()
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState<number | undefined>()
  const teams = useQuery({
    queryKey: ['career-teams', careerId, term],
    queryFn: () => endpoints.careerTeams(careerId!, term),
    enabled: careerId !== undefined,
  })
  const profile = useQuery({
    queryKey: ['career-team', careerId, selected],
    queryFn: () => endpoints.careerTeam(careerId!, selected!),
    enabled: careerId !== undefined && selected !== undefined,
  })

  return (
    <div className="space-y-4">
      <CareerSelect />
      {teams.data && teams.data.length === 0 && !term ? (
        <EmptyState>
          Takım verisi yok. Önce <Link to="/career/import" className="text-emerald-700 underline">kariyer verisini içe aktar</Link>.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card title="Takımlar">
            <Field label="Ara">
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Takım adı…" />
            </Field>
            <ul className="mt-2 max-h-[60vh] space-y-1 overflow-y-auto text-sm">
              {(teams.data ?? []).map((t) => (
                <li key={t.teamId}>
                  <button
                    type="button"
                    onClick={() => setSelected(t.teamId)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-left transition hover:bg-emerald-50 dark:hover:bg-slate-700 ${selected === t.teamId ? 'bg-emerald-50 dark:bg-slate-700' : ''}`}
                  >
                    <span>
                      {t.name} <span className="text-xs text-slate-500">{t.league}</span>
                    </span>
                    <strong className="tabular-nums">{t.overall ?? '—'}</strong>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-4">
            {selected === undefined ? (
              <EmptyState>Soldan bir takım seç: güçlü/zayıf yönler, kulüp kültürü ve kilit oyuncular burada görünür.</EmptyState>
            ) : profile.isLoading ? (
              <Spinner />
            ) : profile.data ? (
              <>
                <Card title={profile.data.team.name} actions={<Pill>{profile.data.team.league ?? ''}</Pill>}>
                  <dl className="grid grid-cols-4 gap-3 text-center text-sm">
                    <Stat label="Genel" value={profile.data.team.overall} />
                    <Stat label="Hücum" value={profile.data.team.attack} />
                    <Stat label="Orta saha" value={profile.data.team.midfield} />
                    <Stat label="Savunma" value={profile.data.team.defence} />
                  </dl>
                  {profile.data.averageAge && <p className="mt-2 text-xs text-slate-500">İlk 18 yaş ortalaması: {profile.data.averageAge}</p>}
                  {profile.data.rivalTeamName && <p className="text-xs text-slate-500">Ezeli rakip: {profile.data.rivalTeamName}</p>}
                </Card>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card title="Güçlü yönler (kendi takımınsa avantaj / rakipse dikkat)">
                    <Bullets items={profile.data.strengths} tone="emerald" />
                  </Card>
                  <Card title="Zayıf yönler (kendi takımınsa iyileştir / rakipse sömür)">
                    <Bullets items={profile.data.weaknesses} tone="rose" />
                  </Card>
                </div>
                <Card title="Kulüp kültürü (sayısal verilerden çıkarım)">
                  <Bullets items={profile.data.culture} tone="sky" />
                </Card>
                <Card title="Kilit oyuncular">
                  <ul className="grid gap-1 text-sm sm:grid-cols-2">
                    {profile.data.topPlayers.map((p) => (
                      <li key={p.id} className="flex justify-between">
                        <Link to={`/players/${p.id}`} className="hover:underline">
                          {p.name} <span className="text-xs text-slate-500">{p.positions[0]}{p.age ? ` · ${p.age}` : ''}</span>
                        </Link>
                        <span className="tabular-nums">
                          <strong>{p.overall}</strong> <span className="text-slate-400">/ {p.potential ?? '—'}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </>
            ) : (
              <ErrorBox error={profile.error} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-2xl font-bold">{value ?? '—'}</dd>
    </div>
  )
}

function Bullets({ items, tone }: { items: string[]; tone: 'emerald' | 'rose' | 'sky' }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Belirgin bir şey yok.</p>
  }
  return (
    <ul className="space-y-1 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <Pill tone={tone}>•</Pill>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
