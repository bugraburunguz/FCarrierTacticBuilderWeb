import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { developmentPlan, playableRoles, type Difficulty } from '../lib/development'
import { ATTR_LABELS } from '../lib/format'
import { useActiveCareerId } from '../state/careerStore'
import { Card, ErrorBox, Pill, Spinner } from './ui'

const DIFFICULTY: Record<Difficulty, { label: string; tone: 'emerald' | 'amber' | 'rose' }> = {
  easy: { label: 'Kolay', tone: 'emerald' },
  medium: { label: 'Orta', tone: 'amber' },
  hard: { label: 'Zor', tone: 'rose' },
}

interface Props {
  playerId: number
  overall: number
  potential?: number
}

export function DevelopmentPlan({ playerId, overall, potential }: Props) {
  const { authenticated } = useAuth()
  const careerId = useActiveCareerId()
  const query = useQuery({
    queryKey: ['player-roles', playerId, authenticated ? careerId : undefined],
    queryFn: () => endpoints.playerRoles(playerId, authenticated ? careerId : undefined),
    staleTime: 120_000,
  })
  const headroom = Math.max(0, (potential ?? overall) - overall)
  const roles = query.data ?? []
  const plan = developmentPlan(roles, headroom)
  const playable = playableRoles(roles)

  return (
    <Card title="Gelişim planı — hangi rolü açabilir?">
      {query.isLoading ? (
        <Spinner />
      ) : query.error ? (
        <ErrorBox error={query.error} />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Gelişim payı: <b>{headroom}</b> puan (potansiyel* {potential ?? '—'} − overall {overall}). Şu an tam oynayabildiği rol: <b>{playable.length}</b>
            {playable.length > 0 && <span className="text-slate-500"> ({playable.slice(0, 4).map((r) => r.roleName).join(', ')}{playable.length > 4 ? '…' : ''})</span>}.
          </p>
          {plan.length === 0 ? (
            <p className="text-sm text-slate-500">Tüm rolleri zaten oynayabiliyor ya da gelişim açığı hesaplanamadı.</p>
          ) : (
            <ul className="space-y-2">
              {plan.map(({ role, totalGap, difficulty }) => (
                <li key={role.roleId} className="rounded-xl border border-slate-200 p-2.5 text-sm dark:border-slate-600">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {role.roleName} <span className="text-xs text-slate-500">· {role.position}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Pill tone={DIFFICULTY[difficulty].tone}>{DIFFICULTY[difficulty].label}</Pill>
                      <span className="text-xs text-slate-500">toplam +{totalGap} · şu an %{Math.round(role.score)}</span>
                    </span>
                  </div>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {role.gaps.map((g) => (
                      <li key={g.attr} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-700">
                        {ATTR_LABELS[g.attr] ?? g.attr}: {g.value} → <b>{g.needed}</b> <span className="text-emerald-700 dark:text-emerald-400">(+{g.needed - g.value})</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Rolün "alt sınır" değerlerine göre hesaplanır (PlayStyle+ telafisi dahil). Zorluk, toplam eksik puana ve gelişim payına göre yaklaşık bir tahmindir; gerçek gelişim antrenman/oynama süresine bağlıdır.
          </p>
        </>
      )}
    </Card>
  )
}
