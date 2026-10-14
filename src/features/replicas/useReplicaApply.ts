import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { Career, ReplicaApplyBody, ReplicaApplyResult } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import type { UtCard } from '../../lib/utCard'
import { useActiveCareerId } from '../../state/careerStore'
import { useMode, type AppMode } from '../../state/modeStore'
import { utCardStore } from '../../state/utCardStore'

/** Sunucu bir istekte en çok 200 oyuncu kimliği alır (ReplicaApplyRequest). */
export const MAX_APPLY_IDS = 200
const STALE_MS = 60_000

export type ApplySource = 'CAREER' | 'UT' | 'SAMPLE'

export interface ApplyPlan {
  source: ApplySource
  body: ReplicaApplyBody
  /** Kaynak seçiminin kısa açıklaması (örn. neden örnek kadro). */
  note?: string
  /** UT: katalogla eşleşmediği için gönderilemeyen kulüp kartı sayısı. */
  skipped: number
}

/** Kaynak seçimi: kariyer modunda aktif kariyer; UT modunda katalogla eşleşen kulüp kartları; ikisi de yoksa katalog örneği. Saf fonksiyon (test edilir). */
export function planApply(mode: AppMode, career: Pick<Career, 'id'> | undefined, clubCards: UtCard[], extraIds: number[]): ApplyPlan {
  if (mode === 'career') {
    return career ? { source: 'CAREER', body: { careerId: career.id }, skipped: 0 } : { source: 'SAMPLE', body: {}, note: 'Kariyer seçili değil; örnek kadro gösteriliyor.', skipped: 0 }
  }
  const matched = clubCards.filter((c) => c.playerId !== undefined).sort((a, b) => b.rating - a.rating)
  const ids = [...new Set([...extraIds, ...matched.map((c) => c.playerId!)])].slice(0, MAX_APPLY_IDS)
  if (ids.length === 0) {
    return { source: 'SAMPLE', body: {}, note: 'Kulüp kartın yok; örnek kadro gösteriliyor.', skipped: clubCards.length }
  }
  return { source: 'UT', body: { playerIds: ids }, skipped: clubCards.length - matched.length }
}

/** "Kadromla uygula" verisi: kaynağı seçer, sunucudan atamayı ve oyunculu analizi alır. `addCard`: UT'de "öner" ile seçilen kartı havuza ekler. */
export function useReplicaApply(replicaId: string, enabled: boolean) {
  const mode = useMode()
  const { authenticated } = useAuth()
  const activeId = useActiveCareerId()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers, enabled: authenticated && mode === 'career' })
  const career = careers.data?.find((c) => c.id === activeId) ?? careers.data?.[0]
  const [extra, setExtra] = useState<number[]>([])
  const clubCards = useMemo(() => (utCardStore.get()?.cards ?? []).filter((c) => c.source === 'club'), [])
  const plan = useMemo(() => planApply(mode, career, clubCards, extra), [mode, career, clubCards, extra])
  const waitingForCareer = mode === 'career' && careers.isLoading
  const result = useQuery<ReplicaApplyResult>({
    queryKey: ['replica-apply', replicaId, JSON.stringify(plan.body)],
    queryFn: () => endpoints.replicaApply(replicaId, plan.body),
    enabled: enabled && authenticated && !waitingForCareer,
    staleTime: STALE_MS,
    retry: false,
  })
  const addCard = useCallback((playerId: number) => setExtra((cur) => (cur.includes(playerId) ? cur : [...cur, playerId])), [])
  return { mode, authenticated, career, plan, result, addCard, loading: waitingForCareer || result.isLoading }
}
