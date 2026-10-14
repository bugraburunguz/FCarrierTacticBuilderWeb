import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { CareerDeskPage } from '../../pages/CareerDeskPage'
import { CareerTransferPage } from '../../pages/CareerTransferPage'
import { fitDisplay, levelText } from '../../lib/fitLabels'
import { careerStore } from '../../state/careerStore'
import { lineupStore } from '../../state/lineupStore'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: 'FREE', creditBalance: 17, dailyCreditLimit: 20 } }) }))
vi.mock('../../api/endpoints', () => {
  const none = () => Promise.resolve([])
  return {
    endpoints: {
      careers: vi.fn(), squad: vi.fn(), lineup: vi.fn(() => Promise.resolve({ slots: [] })), snapshotDiff: () => Promise.reject(new Error('yok')), snapshots: none, playerTags: none, events: none,
      shortlist: none, formations: vi.fn(), roles: none, eaRoles: none, resolveTactic: vi.fn(() => Promise.resolve({ formation: '4-3-3', slots: [] })), fitRole: vi.fn(),
      careerRecommendations: vi.fn(), creditCosts: vi.fn(() => Promise.resolve({ recommend: 3, squadFit: 5, advisor: 8 })), updateCareer: vi.fn(),
    },
  }
})

/** Aynı oyuncu, aynı RoleFit: sahadaki rozet (fitDisplay) = Masa = İhtiyaçlar. */
const FIT = { levelFit: 38.4, score: 65.2, fitLabel: 'WEAK' as const }

describe('Masa ↔ saha ↔ İhtiyaçlar aynı değer (E3-10c)', () => {
  beforeEach(() => {
    careerStore.set(1)
    vi.mocked(endpoints.careers).mockResolvedValue([{ id: 1, clubName: 'Crewe', budgetEur: 5_000_000 }] as never)
    vi.mocked(endpoints.formations).mockResolvedValue([{ id: '4-3-3', name: '4-3-3', slots: [{ slotId: 'CM1', position: 'CM', defaultRole: 'box_to_box_balanced', x: 0.5, y: 0.5 }] }] as never)
    vi.mocked(endpoints.squad).mockResolvedValue(Array.from({ length: 11 }, (_, i) => ({ player: { id: i + 1, name: `Oyuncu ${i + 1}`, positions: ['CM'], overall: 60 } })) as never)
    lineupStore.set(1, { CM1: 1 })
    vi.mocked(endpoints.fitRole).mockResolvedValue({ roleFit: { playerId: 1, playerName: 'Oyuncu 1', roleId: 'box_to_box_balanced', roleName: 'Box-to-Box (Balanced)', projectedRating: 70, outOfPosition: false, reasons: [], weaponChecks: [], ...FIT } } as never)
  })

  const wrap = (node: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)

  it('Masa: zayıf halka satırı sahadaki yüzdeyle aynı', async () => {
    wrap(<CareerDeskPage />)
    const expected = levelText(fitDisplay(FIT as never).pct)
    expect(expected).toBe('Seviyesine göre %38')
    expect(await screen.findAllByText(expected)).not.toHaveLength(0)
    expect(vi.mocked(endpoints.fitRole).mock.calls.every(([b]) => b.engineVersion === 'v3')).toBe(true)
  })

  it('İhtiyaçlar: aynı oyuncu aynı yüzde', async () => {
    wrap(<CareerTransferPage />)
    expect(await screen.findByText(/Oyuncu 1 · Seviyesine göre %38/)).toBeInTheDocument()
  })
})
