import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../../api/endpoints'

export const MANAGER_PROFILE_KEY = ['manager-profile'] as const
export const CLUB_RECS_KEY = 'club-recs'

/** Menajer profili: 404 = henüz oluşturulmadı (hata değil, kalıcı; yeniden denenmez). */
export function useManagerProfile() {
  const query = useQuery({ queryKey: MANAGER_PROFILE_KEY, queryFn: endpoints.managerProfile, retry: false, staleTime: 300_000 })
  const missing = (query.error as { status?: number } | null)?.status === 404
  return { ...query, missing, failed: query.isError && !missing }
}
