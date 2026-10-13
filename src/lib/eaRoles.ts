import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../api/endpoints'
import type { EaRoleOption } from '../api/types'

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/** (mevki, temel rol, odak) üçlüsünün karşılaştırma anahtarı. */
export function eaRoleKey(position: string, baseRole: string, focus: string): string {
  return `${position}|${normalize(baseRole)}|${normalize(focus)}`
}

export function eaRoleSet(options: EaRoleOption[]): Set<string> {
  return new Set(options.map((o) => eaRoleKey(o.position, o.baseRole, o.focus)))
}

export interface EaRolesState {
  allowed?: Set<string>
  status: 'loading' | 'error' | 'ready'
  retry: () => void
}

/** EA'nın izin verdiği (mevki, rol, odak) kümesi (TAC-10): rol seçici yalnız bundan beslenir; yüklenene kadar kilitli, hata olursa yeniden denenir. */
export function useEaRoles(): EaRolesState {
  const query = useQuery({ queryKey: ['ea-roles'], queryFn: endpoints.eaRoles, staleTime: 3_600_000, retry: 3 })
  const ready = query.data !== undefined && query.data.length > 0
  return {
    allowed: ready ? eaRoleSet(query.data!) : undefined,
    status: ready ? 'ready' : query.isError || query.data?.length === 0 ? 'error' : 'loading',
    retry: () => void query.refetch(),
  }
}
