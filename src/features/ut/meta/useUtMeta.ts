import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../../../api/endpoints'

export const TIER_LIMIT = 25

/** UT meta verisi (V3-07c; UtMetaPage'den): meta formasyonlar (seed) ve mevki başına tier listesi. v2 ve v3 aynı hook. */
export function useUtMeta(position: string) {
  const formations = useQuery({ queryKey: ['ut-formations'], queryFn: endpoints.utFormations, staleTime: 600_000 })
  const tier = useQuery({ queryKey: ['ut-tier', position], queryFn: () => endpoints.utTier(position, { limit: TIER_LIMIT }), staleTime: 300_000 })
  return { formations, tier }
}
