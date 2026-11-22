import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import { applyQueryDefaults } from './careerQueries'
import { CAREER_ROUTE_LOADERS, prefetchRoute } from './routePrefetch'

vi.mock('../api/endpoints', () => ({ endpoints: { squad: vi.fn(() => Promise.resolve([])) } }))
vi.mock('../features/careerSquad/CareerSquadPage', () => ({ CareerSquadPage: () => null }))

/** FCA-35 W9: menü öğesinin üzerine gelince sayfa parçası ve kadro önceden yüklenir; taze kadro yeniden istenmez. */
describe('prefetchRoute', () => {
  beforeEach(() => vi.mocked(endpoints.squad).mockClear())

  it('kariyer rotası: sayfa parçası + kadro (sorgu dizesi yok sayılır); ikinci kez taze olduğu için istek yok', async () => {
    const client = new QueryClient()
    applyQueryDefaults(client)
    const load = vi.spyOn(CAREER_ROUTE_LOADERS, '/career/squad')
    await prefetchRoute('/career/squad?sekme=derinlik', client, 7)
    expect(load).toHaveBeenCalledTimes(1)
    expect(endpoints.squad).toHaveBeenCalledWith(7)
    await prefetchRoute('/career/squad', client, 7)
    expect(endpoints.squad).toHaveBeenCalledTimes(1)
  })

  it('kariyer seçili değilse yalnız sayfa parçası; bilinmeyen rota hiçbir şey yapmaz', async () => {
    const client = new QueryClient()
    await prefetchRoute('/career/squad', client, undefined)
    await prefetchRoute('/ut/club', client, 7)
    expect(endpoints.squad).not.toHaveBeenCalled()
  })
})
