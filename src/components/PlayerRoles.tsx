import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { endpoints } from '../api/endpoints'
import type { PlayerRoleFit } from '../api/types'
import { useActiveCareerId } from '../state/careerStore'
import { FitMeter } from './FitMeter'
import { Card, ErrorBox, Pill, Spinner } from './ui'

const BADGE_TONE = { GREEN: 'emerald', YELLOW: 'amber', RED: 'rose' } as const

export function PlayerRoles({ playerId, listed }: { playerId: number; listed: string[] }) {
  const { authenticated } = useAuth()
  const careerId = useActiveCareerId()
  const query = useQuery({
    queryKey: ['player-roles', playerId, authenticated ? careerId : undefined],
    queryFn: () => endpoints.playerRoles(playerId, authenticated ? careerId : undefined),
    staleTime: 120_000,
  })

  const byPosition = new Map<string, PlayerRoleFit[]>()
  ;(query.data ?? []).forEach((r) => byPosition.set(r.position, [...(byPosition.get(r.position) ?? []), r]))
  const positions = listed.filter((p) => byPosition.has(p))

  return (
    <Card title="Mevkilerine göre roller ve uyum">
      {query.isLoading ? (
        <Spinner />
      ) : query.error ? (
        <ErrorBox error={query.error} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {positions.map((position, index) => {
            const roles = [...(byPosition.get(position) ?? [])].sort((a, b) => b.score - a.score)
            return (
              <section key={position} aria-label={`${position} rolleri`} className="rounded-md border border-line p-3">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  {position}
                  {index === 0 && <Pill tone="sky">Ana mevki</Pill>}
                </h3>
                <ul className="space-y-2">
                  {roles.map((r, i) => (
                    <li key={r.roleId} className={`flex items-center gap-2 rounded-md p-1.5 ${i === 0 ? 'bg-accent-soft' : ''}`}>
                      <FitMeter score={r.score} badge={r.badge} size={38} />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <b>{r.roleName}</b>
                          <Pill tone={BADGE_TONE[r.badge]}>{r.badgeText}</Pill>
                          {i === 0 && <Pill tone="emerald">En uygun</Pill>}
                        </span>
                        <span className="block text-xs text-muted">
                          Tahmini {r.projectedRating}{r.reasons[0] ? ` · ${r.reasons[0]}` : ''}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          {positions.length === 0 && <p className="text-sm text-muted">Bu oyuncu için rol bulunamadı.</p>}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">Oyuncunun listelenen mevkilerindeki tüm roller; halka rol uyumunu (%) gösterir. Sıra: uyuma göre.</p>
    </Card>
  )
}
