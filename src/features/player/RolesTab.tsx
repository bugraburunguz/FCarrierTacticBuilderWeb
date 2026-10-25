import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { PlayerRoleFit } from '../../api/types'
import { FitBadge } from '../../components/card/FitBadge'
import { FitNarrativeView } from '../../components/FitNarrativeView'
import { HelpPopover } from '../../components/ui'
import { Button, Chip, EmptyState, ErrorState, Skeleton } from '../../design/components/primitives'
import { CAREER_ROLES_HELP, fitDisplay, fitTitle, ROLES_HELP, rolePointsText, strengthText, TAILORED_TEXT } from '../../lib/fitLabels'
import { sortRoles } from '../cards/utPlayer'
import { RoleBasedAdvice } from './RoleBasedAdvice'

const STALE_MS = 120_000
const ROLES_SHOWN = 5

/** Yüzde yalnız rozette (seviyesine göre); rol puanı ayrı sayıdır ve yalnız seviye değeri varken yazılır (yoksa rozetteki sayı odur). */
function RoleRow({ role, tailored, career = false }: { role: PlayerRoleFit; tailored: boolean; career?: boolean }) {
  const d = fitDisplay({ levelFit: role.levelFit, currentFit: role.currentFit, score: role.score, fitLabel: role.fitLabel ?? null, badge: role.badge })
  return (
    <li className="glass-3 flex flex-col gap-1 p-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* <480px: ad tam satırda (kısaltılmaz), çip + rozet + rol puanı alt satıra iner (V3-06c/0b). */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium max-[479px]:basis-full max-[479px]:whitespace-normal max-[479px]:break-words" title={role.roleName}>{role.roleName}</span>
        {tailored && <Chip tone="good">{TAILORED_TEXT}</Chip>}
        {/* FIT-1: kariyerde iki metrik adıyla (rozet: Rol oturması, yanında Güç); UT eski adlarla. */}
        <FitBadge state={d.state} pct={d.pct} metric={career ? d.metric : undefined} title={career ? fitTitle(d) : undefined} />
        {role.levelFit !== undefined && role.levelFit !== null && <span className="text-xs text-muted">{career ? strengthText(d.strength) : rolePointsText(d.rolePoints)}</span>}
      </div>
      {role.narrative && (
        <details className="text-xs">
          <summary className="min-h-8 cursor-pointer font-semibold text-accent max-sm:min-h-11">Neden?</summary>
          <FitNarrativeView narrative={role.narrative} showTailored={false} />
        </details>
      )}
    </li>
  )
}

/**
 * Roller: v3 uyum (rozet = seviyesine göre %, yanında rol puanı), mevki başına en uygun roller; "Neden?" altında anlatım.
 * "Biçilmiş kaftan" mevki başına yalnız en iyi role, sunucu `tailored` derse. Sözlük `fitLabels` (tek kaynak).
 * careerId (V3-06b): kariyer kaydının verisiyle, kariyer motoru v3; seviye referansı her yerde oyuncunun kendi OVR bandı (V3-06c kararı).
 */
export function RolesTab({ playerId, positions, careerId }: { playerId: number; positions: string[]; careerId?: number }) {
  const query = useQuery({ queryKey: ['player-roles-v3', playerId, careerId], queryFn: () => endpoints.playerRoles(playerId, careerId, 'v3'), staleTime: STALE_MS })
  const [open, setOpen] = useState<Record<string, boolean>>({})
  // FIT-1: kariyer kaydıyla açılan sayfa kariyer adlarını kullanır (UT oyuncu sayfası careerId vermez, değişmez).
  const career = careerId !== undefined
  const help = career ? CAREER_ROLES_HELP : ROLES_HELP
  if (query.isLoading) {
    return <div aria-busy="true" aria-label="Yükleniyor" className="flex flex-col gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
  }
  if (query.isError || !query.data) {
    return <ErrorState message="Roller yüklenemedi." onRetry={() => query.refetch()} />
  }
  const byPosition = new Map<string, PlayerRoleFit[]>()
  query.data.forEach((r) => byPosition.set(r.position, [...(byPosition.get(r.position) ?? []), r]))
  const shownPositions = positions.filter((p) => byPosition.has(p))
  if (shownPositions.length === 0) {
    return <EmptyState>Bu oyuncu için rol bulunamadı.</EmptyState>
  }
  return (
    <div className="flex flex-col gap-4">
      {careerId !== undefined && <RoleBasedAdvice playerId={playerId} careerId={careerId} />}
      <div className="flex items-center gap-2 text-xs text-muted">
        Uygunluk nasıl okunur?
        <HelpPopover label="Rozet ve rol puanı">
          <p>{help.badge}</p>
          <p className="mt-1">{help.rolePoints}</p>
        </HelpPopover>
      </div>
      {shownPositions.map((position, index) => {
        const roles = sortRoles(byPosition.get(position) ?? [])
        const all = open[position]
        return (
          <section key={position} aria-label={`${position} rolleri`} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold leading-6">
              {position}
              {index === 0 && <Chip>Ana mevki</Chip>}
            </h2>
            <ul className="flex flex-col gap-1.5">
              {(all ? roles : roles.slice(0, ROLES_SHOWN)).map((r, i) => (
                <RoleRow key={r.roleId} role={r} career={career} tailored={i === 0 && r.narrative?.tailored === true} />
              ))}
            </ul>
            {roles.length > ROLES_SHOWN && (
              <div><Button variant="ghost" onClick={() => setOpen((cur) => ({ ...cur, [position]: !all }))}>{all ? 'Daha az göster' : `Tüm roller (${roles.length})`}</Button></div>
            )}
          </section>
        )
      })}
    </div>
  )
}
