import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { endpoints } from '../../api/endpoints'
import type { ReplicaSummary } from '../../api/types'
import { toTacticRequest } from '../../lib/tactic'
import { tacticFromReplica } from '../lab/labSources'
import { FIT_LIMIT } from './replicaFilter'

/** Kadro değişmedikçe uyum yeniden sorulmaz; aynı replika başka süzgeçle yeniden görünse de önbellekten gelir. */
const FIT_STALE_MS = 600_000

/**
 * "Kadroma uyanlar" (REP-d): görünen ilk FIT_LIMIT replikanın ana kadroya uyumu. Replika başına tek ücretsiz `/fit/lineup` isteği,
 * kilitsiz diziliş (sunucu kadrodan en iyi 11'i seçer, FAZ 4b). Sonuç `squadFit` (0–100). Anahtar 'slot-fit' ile başlar: kadro/ana taktik değişince yenilenir.
 */
export function useReplicaFits(visible: ReplicaSummary[], careerId: number | undefined, enabled: boolean) {
  const targets = useMemo(() => (enabled && careerId !== undefined ? visible.slice(0, FIT_LIMIT) : []), [visible, careerId, enabled])
  const result = useQueries({
    queries: targets.map((r) => ({
      queryKey: ['slot-fit', 'replica', careerId, r.id],
      queryFn: () => endpoints.lineup(careerId!, toTacticRequest(tacticFromReplica(r))),
      staleTime: FIT_STALE_MS,
      retry: false,
    })),
    // Yapısal paylaşım: sonuç değişmedikçe aynı nesne (bağımlı useMemo gereksiz yere yeniden hesaplanmaz).
    combine: (results) => ({
      scores: results.map((q) => (q.data ? Math.round(q.data.squadFit) : undefined)),
      pending: results.some((q) => q.isLoading),
      failed: results.some((q) => q.isError),
    }),
  })
  const fits = useMemo(() => new Map(targets.flatMap((r, i) => (result.scores[i] === undefined ? [] : [[r.id, result.scores[i]!] as const]))), [targets, result.scores])
  return { fits, pending: result.pending, failed: result.failed, computed: targets.length }
}
