import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { Card, ErrorBox, Spinner } from './ui'
import { CompareButton } from './CompareButton'
import { FitMeter } from './FitMeter'

type Mode = 'all' | 'young' | 'prospect'

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'all', label: 'Benzer', hint: 'Attribute profili en yakın oyuncular (aynı mevki, benzer overall).' },
  { id: 'young', label: 'Daha genç alternatif', hint: '23 yaş ve altı, benzer profil.' },
  { id: 'prospect', label: 'Gelecek vaat eden', hint: '21 yaş ve altı, yüksek potansiyelli, benzer profil.' },
]

export function SimilarPlayers({ playerId, potential }: { playerId: number; potential?: number }) {
  const [mode, setMode] = useState<Mode>('all')
  const query = useQuery({
    queryKey: ['similar', playerId, mode],
    queryFn: () =>
      endpoints.similarPlayers(playerId, {
        ageMax: mode === 'young' ? 23 : mode === 'prospect' ? 21 : undefined,
        potentialMin: mode === 'prospect' ? Math.max(60, (potential ?? 70) - 3) : undefined,
        limit: 8,
      }),
    staleTime: 120_000,
  })

  return (
    <Card title="Benzer oyuncular">
      <div role="tablist" className="mb-3 flex flex-wrap gap-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${mode === m.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {query.isLoading ? (
        <Spinner />
      ) : query.error ? (
        <ErrorBox error={query.error} />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {(query.data ?? []).map((s) => (
            <li key={s.player.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-600">
              <span className="min-w-0">
                <Link to={`/players/${s.player.id}`} className="block truncate font-medium hover:underline">{s.player.name}</Link>
                <span className="text-xs text-slate-500">
                  {s.player.age ? `${s.player.age}y · ` : ''}{s.player.positions[0]} · {s.player.overall}/{s.player.potential ?? '—'}
                  {s.player.club ? ` · ${s.player.club}` : ''}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <FitMeter score={s.similarity} badge={s.similarity >= 80 ? 'GREEN' : s.similarity >= 65 ? 'YELLOW' : 'RED'} />
                <CompareButton compact entry={{ id: s.player.id, name: s.player.name, overall: s.player.overall, position: s.player.positions[0] ?? '' }} />
              </span>
            </li>
          ))}
          {(query.data ?? []).length === 0 && <li className="text-sm text-slate-500">Bu ölçütte benzer oyuncu bulunamadı.</li>}
        </ul>
      )}
      <p className="mt-2 text-xs text-slate-500">{MODES.find((m) => m.id === mode)?.hint} Halka: profil benzerliği (%).</p>
    </Card>
  )
}
