import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlayerSummary } from '../../api/types'

const endpoints = vi.hoisted(() => ({ lineup: vi.fn(), fitRole: vi.fn() }))
vi.mock('../../api/endpoints', () => ({ endpoints }))

import { useLineupFits } from './useLineupFits'
import type { SquadWorkspaceApi } from './useSquadWorkspace'

const slots = [
  { slotId: 'GK', position: 'GK', defaultRole: 'gk', x: 50, y: 92, group: 'GK' },
  { slotId: 'LST', position: 'ST', defaultRole: 'af', x: 40, y: 15, group: 'ST' },
  { slotId: 'RST', position: 'ST', defaultRole: 'af', x: 60, y: 15, group: 'ST' },
]
const ws = (assigned: Record<string, number>) => ({
  state: { formationId: '4-4-2', roleOverride: {}, tags: {}, assigned }, slots, stale: false, roleBySlot: new Map(),
  tactic: { formation: '4-4-2', slots: [] },
}) as unknown as SquadWorkspaceApi<number>
const players = new Map([1, 9].map((id) => [id, { id, name: `Oyuncu ${id}`, overall: 70, positions: ['ST'] } as PlayerSummary]))
const roleFit = (playerId: number, levelFit: number, fitLabel: string) => ({ playerId, roleId: 'r', roleName: 'Rol', score: 60, levelFit, fitLabel, reasons: ['Finishing -4.0'], badge: null })

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>

/** KARIYER-UX FAZ 4b: dolu slotların rol uyumu tek /fit/lineup isteğiyle (dizilen oyuncular kilitli); 11 ayrı /fit/role yok. */
describe('useLineupFits', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tek istek, dolu slotlar kilitli; satırlar sunucunun etiketi, levelFit ve nedenleriyle', async () => {
    endpoints.lineup.mockResolvedValue({ slots: [
      { slotId: 'GK', position: 'GK', roleId: 'gk', roleName: 'Kaleci', tags: [], playerId: 1, roleFit: roleFit(1, 70, 'GOOD') },
      { slotId: 'LST', position: 'ST', roleId: 'af', roleName: 'Forvet', tags: [], playerId: 9, roleFit: roleFit(9, 35, 'WEAK') },
      { slotId: 'RST', position: 'ST', roleId: 'af', roleName: 'Forvet', tags: [], playerId: 77, roleFit: roleFit(77, 90, 'GOOD') },
    ] })
    const { result } = renderHook(() => useLineupFits(ws({ GK: 1, LST: 9 }), players, 7), { wrapper })
    await waitFor(() => expect(result.current.rows).toHaveLength(2))
    expect(endpoints.lineup).toHaveBeenCalledTimes(1)
    expect(endpoints.lineup).toHaveBeenCalledWith(7, { formation: '4-4-2', slots: [] }, { GK: 1, LST: 9 }, true)
    expect(endpoints.fitRole).not.toHaveBeenCalled()
    const lst = result.current.rows.find((r) => r.slotId === 'LST')!
    expect(lst).toMatchObject({ playerId: 9, playerName: 'Oyuncu 9', roleName: 'Forvet', display: { pct: 35, state: 'ok' } })
    expect(lst.fit.reasons).toEqual(['Finishing -4.0'])
    expect(result.current.fitBySlot.get('RST')).toBeUndefined()
  })

  it('FIT-2 madde 6: aynı istek rol alternatiflerini ve "daha uygun rol"ü taşır (11 ayrı çağrı yok)', async () => {
    const alts = [{ roleId: 'pf', roleName: 'Poacher', currentFit: 70, levelFit: 72 }, { roleId: 'af', roleName: 'Forvet', currentFit: 66, levelFit: 35 }]
    endpoints.lineup.mockResolvedValue({ slots: [
      { slotId: 'LST', position: 'ST', roleId: 'af', roleName: 'Forvet', tags: [], playerId: 9, roleFit: roleFit(9, 35, 'WEAK'), roleAlternatives: alts, betterRole: alts[0] },
    ] })
    const { result } = renderHook(() => useLineupFits(ws({ LST: 9 }), players, 7), { wrapper })
    await waitFor(() => expect(result.current.rows).toHaveLength(1))
    expect(endpoints.lineup).toHaveBeenCalledTimes(1)
    expect(result.current.rows[0]).toMatchObject({ roleAlternatives: alts, betterRole: alts[0] })
  })

  it('kariyer yoksa ya da dolu slot yoksa istek yok', () => {
    renderHook(() => useLineupFits(ws({}), players, 7), { wrapper })
    renderHook(() => useLineupFits(ws({ GK: 1 }), players, undefined), { wrapper })
    expect(endpoints.lineup).not.toHaveBeenCalled()
  })
})
