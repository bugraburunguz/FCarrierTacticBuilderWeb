import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../../api/endpoints'
import type { CareerPlayer } from '../../../api/types'
import { CareerPickList } from './CareerPickList'

vi.mock('../../../api/endpoints', () => ({ endpoints: { compare: vi.fn(), fitRole: vi.fn() } }))

const candidate = (id: number): CareerPlayer => ({ player: { id, name: `Oyuncu ${id}`, positions: ['CM'], overall: 90 - id } }) as unknown as CareerPlayer
const fit = (playerId: number, engineVersion = 'v3') => ({
  roleFit: { playerId, playerName: `Oyuncu ${playerId}`, roleId: 'box_to_box_balanced', roleName: 'Box-to-Box', projectedRating: 70, outOfPosition: false, reasons: [], weaponChecks: [], levelFit: 50 + playerId, score: 70, fitLabel: 'AT_LEVEL', engineVersion },
})
const candidates = Array.from({ length: 25 }, (_, i) => candidate(i + 1))

const renderList = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CareerPickList position="CM" roleId="box_to_box_balanced" tags={['press']} candidates={candidates} onPick={() => undefined} onClear={() => undefined} />
    </QueryClientProvider>,
  )

/** FCA-35 W10: slot açılınca aday başına /fit/role yerine tek toplu /players/compare (v3). */
describe('CareerPickList toplu uyum', () => {
  beforeEach(() => {
    vi.mocked(endpoints.compare).mockReset()
    vi.mocked(endpoints.fitRole).mockReset().mockImplementation(((b: { playerId: number }) => Promise.resolve(fit(b.playerId))) as never)
  })

  it('bütün adaylar tek istekte, v3 motoruyla; /fit/role çağrılmaz', async () => {
    vi.mocked(endpoints.compare).mockImplementation(((b: { ids: number[] }) => Promise.resolve(b.ids.map((id) => fit(id)))) as never)
    renderList()
    await waitFor(() => expect(endpoints.compare).toHaveBeenCalledTimes(1))
    expect(vi.mocked(endpoints.compare).mock.calls[0][0]).toEqual({ ids: candidates.map((c) => c.player.id), roleId: 'box_to_box_balanced', position: 'CM', tags: ['press'], engineVersion: 'v3' })
    expect(await screen.findAllByText(/%/)).not.toHaveLength(0)
    expect(endpoints.fitRole).not.toHaveBeenCalled()
  })

  it('eski backend (v3 dönmüyor ya da hata) → aday başına /fit/role ile aynı sonuç', async () => {
    vi.mocked(endpoints.compare).mockImplementation(((b: { ids: number[] }) => Promise.resolve(b.ids.map((id) => fit(id, 'v1')))) as never)
    renderList()
    await waitFor(() => expect(endpoints.fitRole).toHaveBeenCalledTimes(candidates.length))
    expect(vi.mocked(endpoints.fitRole).mock.calls[0][0]).toMatchObject({ engineVersion: 'v3' })
  })

  it('toplu istek hata verirse (eski backend 20 id sınırı) aday başına yola düşer', async () => {
    vi.mocked(endpoints.compare).mockRejectedValue(new Error('400'))
    renderList()
    await waitFor(() => expect(endpoints.fitRole).toHaveBeenCalledTimes(candidates.length))
  })
})
