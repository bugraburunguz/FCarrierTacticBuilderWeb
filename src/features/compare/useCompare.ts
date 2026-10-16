import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { endpoints } from '../../api/endpoints'
import { useAuth } from '../../auth/AuthContext'
import type { RoleSelection } from '../../components/RolePicker'
import { ATTR_GROUPS } from '../../lib/format'
import { useActiveCareerId } from '../../state/careerStore'
import { useCompareList } from '../../state/compareStore'

export type CompareCell = number | string | null

/** Satırdaki en iyi değer(ler): yalnız sayılar; herkes eşitse vurgu yok. */
export function bestIndexes(values: CompareCell[]): Set<number> {
  const nums = values.map((v) => (typeof v === 'number' ? v : null))
  const max = Math.max(...nums.map((n) => n ?? -Infinity))
  const ties = nums.filter((n) => n === max).length
  return new Set(nums.flatMap((n, i) => (n !== null && n === max && ties < nums.length ? [i] : [])))
}

/**
 * Oyuncu karşılaştırma (V3-07c; ComparePage'den): karşılaştırma listesi, arama, oyuncu detayları (girişliyse aktif kariyer bağlamında),
 * role göre uyum (POST /players/compare). v2 ve v3 aynı hook.
 */
export function useCompare(term: string, selection: RoleSelection) {
  const list = useCompareList()
  const search = useQuery({ queryKey: ['compare-search', term], queryFn: () => endpoints.players({ q: term, size: 6 }), enabled: term.trim().length >= 2 })
  const { authenticated } = useAuth()
  const activeCareer = useActiveCareerId()
  const careerId = authenticated ? activeCareer : undefined
  const details = useQueries({ queries: list.map((c) => ({ queryKey: ['player', c.id, careerId], queryFn: () => endpoints.player(c.id, careerId) })) })
  const loaded = details.map((d) => d.data).filter((d): d is NonNullable<typeof d> => !!d)
  const fit = useMutation({ mutationFn: () => endpoints.compare({ ids: list.map((c) => c.id), roleId: selection.roleId, position: selection.position, tags: selection.tags }) })
  const names = new Map(list.map((c) => [c.id, c.name]))
  const hasGoalkeeper = loaded.some((d) => d.summary.positions.includes('GK'))
  const groups = ATTR_GROUPS.filter((g) => (g.title === 'Kaleci') === hasGoalkeeper || g.title !== 'Kaleci')
  return { list, search, details, loaded, fit, names, hasGoalkeeper, groups }
}
