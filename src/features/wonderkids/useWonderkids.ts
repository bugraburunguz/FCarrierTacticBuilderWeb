import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { endpoints } from '../../api/endpoints'

export const AGE_LIMITS = [17, 19, 21, 23]
export const WONDERKID_SORTS = [
  { id: 'potential', label: 'Potansiyel' },
  { id: 'gap', label: 'Gelişim payı (POT − OVR)' },
  { id: 'role', label: 'Seçili role uyum' },
  { id: 'value', label: 'Ucuz cevher (POT / değer)' },
]
export const WONDERKID_LIMIT = 50

export interface WonderkidFilters {
  gender: number
  position: string
  league: string
  maxAge: number
  minPot: number
  budgetM: string
  role: string
  sort: string
}

export const WONDERKID_DEFAULTS: WonderkidFilters = { gender: 0, position: '', league: '', maxAge: 21, minPot: 70, budgetM: '', role: '', sort: 'potential' }

export const WONDERKID_PRESETS: { label: string; apply: Partial<WonderkidFilters> }[] = [
  { label: 'En iyi U21 kanatlar', apply: { position: 'RW', maxAge: 21, minPot: 80, sort: 'potential' } },
  { label: 'Her mevkide en yüksek potansiyel', apply: { position: '', maxAge: 21, minPot: 85, sort: 'potential' } },
  { label: 'Ucuz cevherler', apply: { position: '', maxAge: 21, minPot: 75, sort: 'value' } },
  { label: 'En büyük gelişim payı', apply: { position: '', maxAge: 19, minPot: 78, sort: 'gap' } },
]

/**
 * Genç yetenekler (V3-07c; WonderkidsPage'den): süzgeçlerle /wonderkids, lig ve rol listeleri. careerId verilirse kariyer verisiyle (güncel OVR/POT,
 * ulaşılabilirlik kovası). v2 ve v3 aynı hook.
 */
export function useWonderkids(filters: WonderkidFilters, careerId: number | undefined) {
  const leagues = useQuery({ queryKey: ['leagues', filters.gender], queryFn: () => endpoints.leagues(filters.gender), staleTime: 600_000 })
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles, staleTime: 600_000 })
  const roleOptions = useMemo(
    () => (roles.data ?? []).filter((r) => !filters.position || r.positions.includes(filters.position)).sort((a, b) => a.name.localeCompare(b.name)),
    [roles.data, filters.position],
  )
  const budget = filters.budgetM ? Math.round(Number(filters.budgetM) * 1_000_000) : undefined
  const kids = useQuery({
    queryKey: ['wonderkids', filters, careerId],
    queryFn: () =>
      endpoints.wonderkids({
        gender: filters.gender,
        pos: filters.position || undefined,
        league: filters.league ? Number(filters.league) : undefined,
        maxAge: filters.maxAge,
        minPot: filters.minPot,
        budgetMax: budget,
        role: filters.role || undefined,
        sort: filters.sort,
        career: careerId,
        limit: WONDERKID_LIMIT,
      }),
    staleTime: 60_000,
  })
  return { leagues, roleOptions, kids }
}
