import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../api/endpoints'
import type { RoleDevelopment, WeaponState } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ATTR_LABELS } from '../lib/format'
import { useActiveCareerId } from '../state/careerStore'
import { Card, ErrorBox, Pill, Spinner } from './ui'

const BADGE: Record<WeaponState, { label: string; tone: 'emerald' | 'amber' | 'rose' }> = {
  GREEN: { label: 'Uygun', tone: 'emerald' },
  YELLOW: { label: 'Sınırda', tone: 'amber' },
  RED: { label: 'Eksik', tone: 'rose' },
}

interface Props {
  playerId: number
  overall: number
  potential?: number
}

export function DevelopmentPlan({ playerId }: Props) {
  const { authenticated } = useAuth()
  const careerId = useActiveCareerId()
  const activeCareer = authenticated ? careerId : undefined
  const query = useQuery({
    queryKey: ['player-development', playerId, activeCareer],
    queryFn: () => endpoints.development(playerId, { careerId: activeCareer }),
    staleTime: 120_000,
  })
  const plan = query.data

  return (
    <Card title="Gelişim planı — hangi rolü açabilir?">
      {query.isLoading ? (
        <Spinner />
      ) : query.error || !plan ? (
        <ErrorBox error={query.error} />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Gelişim payı: <b>{plan.headroom}</b> puan (potansiyel* {plan.potential ?? '—'} − overall {plan.overall}).
            {plan.bestPath && (
              <>
                {' '}En az gelişimle açılan rol: <b>{plan.bestPath.roleName}</b> <span className="text-slate-500">({plan.bestPath.position}, toplam +{plan.bestPath.totalGap})</span>.
              </>
            )}
          </p>
          {plan.perRole.length === 0 ? (
            <p className="text-sm text-slate-500">Tüm rolleri zaten oynayabiliyor ya da gelişim açığı hesaplanamadı.</p>
          ) : (
            <ul className="space-y-2">
              {plan.perRole.map((role) => (
                <RoleRow key={`${role.roleId}-${role.position}`} role={role} />
              ))}
            </ul>
          )}
          {plan.trainingPriorities.length > 0 && (
            <div className="mt-3">
              <h4 className="mb-1 text-xs font-semibold uppercase text-slate-500">Antrenman önceliği</h4>
              <ul className="flex flex-wrap gap-1.5">
                {plan.trainingPriorities.map((p) => (
                  <li key={p.attr} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-700">
                    {ATTR_LABELS[p.attr] ?? p.attr} <span className="text-slate-500">· {p.roles} rol</span>
                    {p.hardToTrain && <span className="ml-1 text-rose-600 dark:text-rose-400">zor gelişir</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Tahmindir: potansiyel tavanı model çıktısıdır. Hız/çeviklik gibi zor gelişen özellikler düşük, şut/pas/ortalama gibi özellikler yüksek gelişim payıyla sınırlanır; gerçek gelişim antrenman ve oynama süresine bağlıdır.
          </p>
        </>
      )}
    </Card>
  )
}

function RoleRow({ role }: { role: RoleDevelopment }) {
  return (
    <li className="rounded-xl border border-slate-200 p-2.5 text-sm dark:border-slate-600">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          {role.roleName} <span className="text-xs text-slate-500">· {role.position}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Pill tone={BADGE[role.currentBadge].tone}>{BADGE[role.currentBadge].label}</Pill>
          <span className="text-xs text-slate-500">→</span>
          <Pill tone={BADGE[role.projectedBadge].tone}>{role.unlocks ? 'Açılır' : BADGE[role.projectedBadge].label}</Pill>
          <span className="text-xs text-slate-500">
            %{Math.round(role.currentScore)} → %{Math.round(role.projectedScore)}
          </span>
        </span>
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {role.gaps.map((g) => (
          <li key={g.attr} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-700">
            {ATTR_LABELS[g.attr] ?? g.attr}: {g.value} → <b>{g.needed}</b>{' '}
            <span className={g.closable ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
              (+{g.gap}{g.closable ? '' : `, en fazla +${g.maxGain}`})
            </span>
          </li>
        ))}
      </ul>
    </li>
  )
}
