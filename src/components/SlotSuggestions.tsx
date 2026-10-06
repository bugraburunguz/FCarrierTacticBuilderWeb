import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { Recommendation } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useActiveCareerId } from '../state/careerStore'
import { BadgeDot, Card, ErrorBox, Pill, Select, Spinner } from './ui'
import { CompareButton } from './CompareButton'

interface Props {
  roleId?: string
  position: string
  tags: string[]
  gender?: number
}

type Tab = 'SQUAD' | 'LEAGUE' | 'MARKET' | 'ALL'

const TABS: { id: Tab; label: string; hint: string; needsCareer: boolean }[] = [
  { id: 'SQUAD', label: 'Kadromda', hint: 'Takımındaki oyuncular bu slota ne kadar uyuyor.', needsCareer: true },
  { id: 'LEAGUE', label: 'Ligde', hint: 'Seçtiğin ligdeki, kadron dışındaki en uygun oyuncular.', needsCareer: true },
  { id: 'MARKET', label: 'Alınabilir', hint: 'Kariyer bütçene sığan, kadron dışındaki en uygun oyuncular.', needsCareer: true },
  { id: 'ALL', label: 'Tüm katalog', hint: 'Tüm kataloğun en uygun adayları.', needsCareer: false },
]

export function SlotSuggestions({ roleId, position, tags, gender }: Props) {
  const { authenticated } = useAuth()
  const careerId = useActiveCareerId()
  const hasCareer = authenticated && careerId !== undefined
  const [tab, setTab] = useState<Tab>(hasCareer ? 'SQUAD' : 'ALL')
  const [leagueId, setLeagueId] = useState<number | undefined>()
  const active = hasCareer || !TABS.find((t) => t.id === tab)?.needsCareer ? tab : 'ALL'

  const leagues = useQuery({ queryKey: ['leagues', gender], queryFn: () => endpoints.leagues(gender), enabled: hasCareer && active === 'LEAGUE', staleTime: 600_000 })
  const tagKey = tags.join(',')
  const suggestions = useQuery<Recommendation>({
    queryKey: ['slot-view', active, careerId, roleId, position, tagKey, gender, leagueId],
    queryFn: () =>
      active === 'ALL'
        ? endpoints.previewSlot({ roleId: roleId!, position, tags, gender, limit: 8 })
        : endpoints.slotView({ careerId: careerId!, scope: active, slot: { roleId: roleId!, position, tags, leagueId, limit: 8 } }),
    enabled: roleId !== undefined && (active !== 'LEAGUE' || leagueId !== undefined),
    staleTime: 60_000,
    retry: false,
  })

  return (
    <Card title="Bu slota en uygun oyuncular" actions={<Pill tone="emerald">Ücretsiz</Pill>}>
      <div role="tablist" aria-label="Öneri kapsamı" className="mb-3 flex flex-wrap gap-1">
        {TABS.filter((t) => hasCareer || !t.needsCareer).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${active === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {active === 'LEAGUE' && (
        <Select value={leagueId ?? ''} onChange={(e) => setLeagueId(e.target.value ? Number(e.target.value) : undefined)} className="mb-3" aria-label="Lig">
          <option value="">Lig seç…</option>
          {(leagues.data ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      )}
      {active === 'LEAGUE' && leagueId === undefined ? (
        <p className="text-sm text-slate-500">Önce bir lig seç.</p>
      ) : suggestions.isLoading ? (
        <Spinner />
      ) : suggestions.error ? (
        <ErrorBox error={suggestions.error} />
      ) : (
        <ul className="space-y-1.5 text-sm">
          {(suggestions.data?.items ?? []).map((item) =>
            item.player ? (
              <li key={item.player.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <BadgeDot state={item.roleFit.badge} />{' '}
                  <Link to={`/players/${item.player.id}`} className="font-medium hover:underline">
                    {item.player.name}
                  </Link>{' '}
                  <span className="text-xs text-slate-500">
                    {item.player.positions[0]} · {item.player.overall}
                    {item.player.club ? ` · ${item.player.club}` : ''}
                    {active === 'MARKET' && item.player.valueEur ? ` · €${Math.round(item.player.valueEur / 1000)}K` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums">%{Math.round(item.combined)}</span>
                  <CompareButton compact entry={{ id: item.player.id, name: item.player.name, overall: item.player.overall, position: item.player.positions[0] ?? '' }} />
                </span>
              </li>
            ) : null,
          )}
          {(suggestions.data?.items ?? []).length === 0 && <li className="text-slate-500">Bu kapsamda uygun oyuncu bulunamadı.</li>}
        </ul>
      )}
      <p className="mt-2 text-xs text-slate-500">{TABS.find((t) => t.id === active)?.hint}</p>
    </Card>
  )
}
