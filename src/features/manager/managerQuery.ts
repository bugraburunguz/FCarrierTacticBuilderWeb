import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../../api/endpoints'

export const MANAGER_PROFILE_KEY = ['manager-profile'] as const
export const CLUB_RECS_KEY = 'club-recs'

/** Menajer profili: henüz oluşturulmadıysa sunucu 200 + data null döner (hata değil). */
export function useManagerProfile() {
  const query = useQuery({ queryKey: MANAGER_PROFILE_KEY, queryFn: endpoints.managerProfile, retry: false, staleTime: 300_000 })
  return { ...query, missing: query.isSuccess && query.data === null, failed: query.isError }
}
