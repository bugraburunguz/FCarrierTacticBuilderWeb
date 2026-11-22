import type { QueryClient } from '@tanstack/react-query'
import { endpoints } from '../api/endpoints'

export const CAREER_ROUTE_LOADERS = {
  '/career/dashboard': () => import('../features/dashboard/DashboardPage'),
  '/career/squad': () => import('../features/careerSquad/CareerSquadPage'),
  '/career/tactics-lab': () => import('../features/lab/TacticsLabPage'),
  '/career/transfer': () => import('../features/transfer/TransferCenterPage'),
  '/career/growth': () => import('../features/growth/GrowthPage'),
  '/career/academy': () => import('../features/academy/AcademyPage'),
  '/career/match': () => import('../features/match/MatchCenterPage'),
}

type CareerRoute = keyof typeof CAREER_ROUTE_LOADERS

/** FCA-35 W9: menü öğesine gelinince sayfa parçası ve kadro önceden yüklenir (taze kadro yeniden istenmez). */
export async function prefetchRoute(to: string, client: QueryClient, careerId: number | undefined): Promise<void> {
  const path = to.split('?')[0]
  if (!(path in CAREER_ROUTE_LOADERS)) {
    return
  }
  const page = CAREER_ROUTE_LOADERS[path as CareerRoute]().catch(() => undefined)
  const squad = careerId === undefined ? undefined : client.prefetchQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId) })
  await Promise.all([page, squad])
}
