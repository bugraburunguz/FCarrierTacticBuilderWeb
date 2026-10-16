import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { CareerSquadBuilderPage } from './CareerSquadBuilderPage'
import { useCareerSquadBuilder } from './useCareerSquadBuilder'

const slot = (slotId: string, position: string) => ({ slotId, position, x: 50, y: 50, defaultRole: 'r', group: position })
const SLOTS = ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'RCM', 'RM', 'LST', 'RST']
const POSITIONS = ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST']
const f442 = { id: '4-4-2', label: '4-4-2', slots: SLOTS.map((s, i) => slot(s, POSITIONS[i])) }
const SQUAD = POSITIONS.map((position, i) => ({ player: { id: i + 1, name: `Oyuncu ${i + 1}`, overall: 70, positions: [position], valuationEstimated: false }, onLoan: false }))

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))
vi.mock('../../api/endpoints', () => ({
  endpoints: {
    formations: vi.fn(() => Promise.resolve([f442])),
    presets: vi.fn(() => Promise.resolve([])),
    behaviorTags: vi.fn(() => Promise.resolve([])),
    careers: vi.fn(() => Promise.resolve([{ id: 7, clubId: 1, budgetEur: 0, squadSize: 11 }])),
    squad: vi.fn(() => Promise.resolve(SQUAD)),
    roles: vi.fn(() => Promise.resolve([])),
    eaRoles: vi.fn(() => Promise.resolve([])),
    resolveTactic: vi.fn((t: { formation: string }) => Promise.resolve({ formation: t.formation, slots: [] })),
    roleFit: vi.fn(() => Promise.resolve({ slots: [] })),
    squadFit: vi.fn(() => Promise.resolve({ slots: [] })),
    lineup: vi.fn(() => Promise.resolve({ slots: SLOTS.map((slotId, i) => ({ slotId, playerId: i + 1 })) })),
    exportTacticCode: vi.fn(() => Promise.resolve({ code: 'ABCDEFGHIJKL', formation: '4-4-2', exact: true, warnings: [] })),
    importTacticCode: vi.fn(),
  },
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
)

/** V3-07b: kariyer kurucu mantığı tek hook'ta; v2 ve v3 sayfası aynı davranışı alır. */
describe('useCareerSquadBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    careerStore.set(7)
  })

  it('boş kadroyla ilk açılışta bir kez otomatik dizer; "En iyi 11\'i diz" yeniden dizer', async () => {
    const { result } = renderHook(() => useCareerSquadBuilder(), { wrapper })
    await waitFor(() => expect(Object.keys(result.current.ws.state.assigned)).toHaveLength(11))
    expect(endpoints.lineup).toHaveBeenCalledTimes(1)
    expect(vi.mocked(endpoints.lineup).mock.calls[0][0]).toBe(7)
    expect(result.current.views.filter((v) => v.player)).toHaveLength(11)
    expect(result.current.canAutoFill).toBe(true)

    act(() => result.current.autoFill.mutate())
    await waitFor(() => expect(endpoints.lineup).toHaveBeenCalledTimes(2))
  })

  it('v3 sayfası: "En iyi 11\'i diz" düğmesi dizer; taktik kodu tek bileşende', async () => {
    render(<CareerSquadBuilderPage />, { wrapper })
    const button = await screen.findByRole('button', { name: "En iyi 11'i diz" })
    await waitFor(() => expect(button).toBeEnabled())
    const before = vi.mocked(endpoints.lineup).mock.calls.length
    fireEvent.click(button)
    await waitFor(() => expect(endpoints.lineup).toHaveBeenCalledTimes(before + 1))
    expect(vi.mocked(endpoints.lineup).mock.calls[before][0]).toBe(7)
    expect(screen.getAllByText('EA Taktik Kodu')).toHaveLength(1)
  })

  it('slot seçilince kariyer slot sekmeleri gelir; davranışları sıfırla seçimi kapatır', async () => {
    const { result } = renderHook(() => useCareerSquadBuilder(), { wrapper })
    await waitFor(() => expect(result.current.ws.formation?.id).toBe('4-4-2'))
    act(() => result.current.ws.select('GK', 'card'))
    expect(result.current.slotTabs.map((t) => t.id)).toContain('card')
    act(() => result.current.resetBehaviors())
    expect(result.current.ws.selection).toBeFalsy()
  })
})
