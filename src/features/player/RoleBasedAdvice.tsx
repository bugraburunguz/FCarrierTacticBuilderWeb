import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { strengthText } from '../../lib/fitLabels'

const STALE_MS = 120_000

/**
 * FIT-3 madde 12-13 (oyuncu › Roller, kariyer): "en iyi mevki" EA OVR'sinden kalır; burada rol bazlı öneri — mevkilerdeki en iyi rol Güç'ü, kanat tarafı
 * gerekçesi ve dönüşüm önerisi. Plan seçenekleri (mevki/rol planı, 2 sezonluk tahmin) Gelişim sayfasında.
 */
export function RoleBasedAdvice({ playerId, careerId }: { playerId: number; careerId: number }) {
  const titleId = useId()
  const advice = useQuery({ queryKey: ['position-advice', careerId], queryFn: () => endpoints.positionAdvice(careerId), staleTime: STALE_MS, retry: false })
  const mine = advice.data?.find((a) => a.playerId === playerId)
  const top = mine?.best[0]
  if (!mine || (!top && !mine.conversion && !mine.sideReason)) {
    return null
  }
  return (
    <section aria-labelledby={titleId} className="glass-3 flex flex-col gap-1.5 rounded-[var(--radius-sm)] p-3 text-sm">
      <h2 id={titleId} className="font-display text-base font-semibold">Rol bazlı mevki önerisi</h2>
      {top && <p className="text-ink-2">Rol bazlı en iyi: {top.position} · {top.roleName} · {strengthText(top.score)}</p>}
      {mine.sideReason && <p className="text-ink-2">Taraf: {mine.sideReason}</p>}
      {mine.conversion && (
        <>
          <p className="font-medium text-ink">{mine.conversion.text}</p>
          <Link to={`/career/growth?oyuncu=${playerId}`} className="text-sm font-semibold text-accent underline-offset-2 hover:underline">Plan seçenekleri (Gelişim)</Link>
        </>
      )}
    </section>
  )
}
