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

/** EA'nın izin verdiği rol+odak kümesi (TAC-02): rol seçici yalnız bunları gösterir; yüklenene kadar filtre uygulanmaz. */
export function useEaRoleSet(): Set<string> | undefined {
  const query = useQuery({ queryKey: ['ea-roles'], queryFn: endpoints.eaRoles, staleTime: 3_600_000, retry: false })
  return query.data && query.data.length > 0 ? eaRoleSet(query.data) : undefined
}
