import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import { utSquadStore } from '../state/utSquadStore'
import { UtSquadPage } from './UtSquadPage'

const formation = { id: '4-4-2', label: '4-4-2', slots: [{ slotId: 'GK', position: 'GK', x: 50, y: 90, defaultRole: 'goalkeeper_balanced' }, { slotId: 'ST', position: 'ST', x: 50, y: 10, defaultRole: 'poacher_attack' }] }
const resolvedTactic = { formation: '4-4-2', slots: [{ slotId: 'GK', roleId: 'goalkeeper_balanced', roleName: 'Goalkeeper' }, { slotId: 'ST', roleId: 'poacher_attack', roleName: 'Poacher' }] }

vi.mock('../api/endpoints', () => ({
  endpoints: {
    formations: vi.fn(),
    roles: vi.fn(() => Promise.resolve([])),
    eaRoles: vi.fn(() => Promise.resolve([])),
    resolveTactic: vi.fn(() => Promise.resolve(resolvedTactic)),
    exportTacticCode: vi.fn(() => Promise.resolve({ code: 'ABCDEFGHIJKL', formation: '4-4-2', exact: true, warnings: [] })),
    utSquadEvaluate: vi.fn(() => Promise.resolve({ slots: [], averageMeta: 0 })),
    importTacticCode: vi.fn(),
    players: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
  },
}))

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><UtSquadPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UtSquadPage ilk yükleme (V3-00)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    utSquadStore.clear?.()
  })

  it('formasyon listesi gelmeden taktik çözme isteği gitmez (formation: undefined 400 veriyordu)', async () => {
    let release: (value: unknown) => void = () => undefined
    vi.mocked(endpoints.formations).mockReturnValue(new Promise((resolve) => { release = resolve }) as never)
    renderPage()

    await new Promise((r) => setTimeout(r, 50))
    expect(endpoints.resolveTactic).not.toHaveBeenCalled()

    release([formation])
    await waitFor(() => expect(endpoints.resolveTactic).toHaveBeenCalled())
    for (const [tactic] of vi.mocked(endpoints.resolveTactic).mock.calls) {
      expect(tactic.formation).toBeTruthy()
    }
  })

  it('aynı taktik için tek çözme isteği gider (iki bileşen aynı sorguyu açmaz)', async () => {
    vi.mocked(endpoints.formations).mockResolvedValue([formation] as never)
    renderPage()

    await waitFor(() => expect(screen.getByText('ABCDEFGHIJKL')).toBeInTheDocument())
    expect(endpoints.resolveTactic).toHaveBeenCalledTimes(1)
  })

  it('kayıtlı formasyon/rol formasyonla uyuşmuyorsa sessizce temizlenir ve not gösterilir', async () => {
    utSquadStore.set({ formationId: 'yok-formasyon', setup: { buildUp: 'Balanced', depth: 55 }, picked: {}, roleOverride: { LWB: 'x_role' }, origin: 'manual' })
    vi.mocked(endpoints.formations).mockResolvedValue([formation] as never)
    renderPage()

    expect(await screen.findByText(/güncel formasyonla uyuşmadığı için sıfırlandı/)).toBeInTheDocument()
    await waitFor(() => expect(endpoints.resolveTactic).toHaveBeenCalled())
    for (const [tactic] of vi.mocked(endpoints.resolveTactic).mock.calls) {
      expect(tactic.formation).toBe('4-4-2')
      expect(tactic.slots).toEqual([])
    }
  })
})
