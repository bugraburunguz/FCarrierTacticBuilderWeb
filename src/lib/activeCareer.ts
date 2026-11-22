import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../api/endpoints'
import type { Career } from '../api/types'
import { useActiveCareerId } from '../state/careerStore'

export function resolveActiveCareer(list: readonly Career[] | undefined, storedId: number | undefined): { career: Career | undefined; id: number | undefined } {
  if (list === undefined) {
    return { career: undefined, id: storedId }
  }
  const career = list.find((c) => c.id === storedId) ?? list[0]
  return { career, id: career?.id }
}

/** FCA-35 W1: sayfa sorguları `id` ile hemen başlar (saklı kimlik); `career` liste gelince dolar. */
export function useActiveCareer() {
  const storedId = useActiveCareerId()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  return { careers, ...resolveActiveCareer(careers.data, storedId) }
}
