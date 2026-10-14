import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import { lineupStore } from '../state/lineupStore'
import { CareerTransferPage } from './CareerTransferPage'

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: 'FREE', creditBalance: 17, dailyCreditLimit: 20 } }) }))

vi.mock('../api/endpoints', () => ({
  endpoints: {
    careers: vi.fn(() => Promise.resolve([{ id: 1, clubName: 'Crewe', budgetEur: 5_000_000 }])),
    squad: vi.fn(() => Promise.resolve([])),
    lineup: vi.fn(() => Promise.resolve({ slots: [] })),
    shortlist: vi.fn(() => Promise.resolve([])),
    playerTags: vi.fn(() => Promise.resolve([])),
    formations: vi.fn(() => Promise.resolve([])),
    roles: vi.fn(() => Promise.resolve([])),
    eaRoles: vi.fn(() => Promise.resolve([])),
    resolveTactic: vi.fn(() => Promise.resolve({ formation: '4-3-3', slots: [] })),
    fitRole: vi.fn(),
    careerRecommendations: vi.fn(),
    creditCosts: vi.fn(() => Promise.resolve({ recommend: 3, squadFit: 5, advisor: 8 })),
    me: vi.fn(() => Promise.resolve({ subscriptionType: 'FREE' })),
  },
}))

describe('CareerTransferPage', () => {
  it('ücretli öneri açılışta çağrılmaz; ihtiyaç seçilince kredi bedeli düğmede yazar', async () => {
    vi.mocked(endpoints.lineup).mockResolvedValueOnce({ slots: [{ slotId: 'ST', position: 'ST', roleId: 'poacher_attack', roleName: 'Poacher', playerName: 'X', roleFit: { score: 40 } }] } as never)
    vi.mocked(endpoints.squad).mockResolvedValueOnce(Array.from({ length: 11 }, (_, i) => ({ player: { id: i, name: `P${i}`, positions: ['ST'], overall: 60 } })) as never)
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><CareerTransferPage /></MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('button', { name: /Önerileri getir/ })).toBeInTheDocument()
    expect(endpoints.careerRecommendations).not.toHaveBeenCalled()
  })


  it('İhtiyaçlar sahadaki rozetle aynı kaynaktan: yalnız sarı/kırmızı, seviyesine göre artan; "Tüm kadro" hepsini açar', async () => {
    const slot = (slotId: string) => ({ slotId, position: 'CM', defaultRole: 'box_to_box_balanced', x: 0.5, y: 0.5 })
    vi.mocked(endpoints.formations).mockResolvedValue([{ id: '4-3-3', name: '4-3-3', slots: [slot('CM1'), slot('CM2'), slot('CM3')] }] as never)
    const squad = [1, 2, 3].map((id) => ({ player: { id, name: `Oyuncu ${id}`, positions: ['CM'], overall: 60 + id } }))
    vi.mocked(endpoints.squad).mockResolvedValue(squad as never)
    lineupStore.set(1, { CM1: 1, CM2: 2, CM3: 3 })
    const fits: Record<number, object> = {
      1: { levelFit: 38.4, score: 65.2, fitLabel: 'WEAK' },
      2: { levelFit: 12.0, score: 40, fitLabel: 'WRONG_ROLE' },
      3: { levelFit: 80, score: 90, fitLabel: 'GOOD' },
    }
    vi.mocked(endpoints.fitRole).mockImplementation(((b: { playerId: number }) => Promise.resolve({ roleFit: { playerId: b.playerId, playerName: `Oyuncu ${b.playerId}`, roleId: 'box_to_box_balanced', roleName: 'Box-to-Box (Balanced)', projectedRating: 70, outOfPosition: false, reasons: [], weaponChecks: [], ...fits[b.playerId] } })) as never)
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><CareerTransferPage /></MemoryRouter>
      </QueryClientProvider>,
    )
    const weak = await screen.findByRole('button', { name: /Oyuncu 2 · Seviyesine göre %12/ })
    expect(weak).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Oyuncu 1 · Seviyesine göre %38/ })).toBeInTheDocument()
    expect(screen.queryByText(/Seviyesine göre %80/)).not.toBeInTheDocument()
    const order = screen.getAllByRole('button').map((b) => b.textContent ?? '').filter((t) => t.includes('Seviyesine göre'))
    expect(order[0]).toContain('%12')
    expect(order[1]).toContain('%38')
    fireEvent.click(screen.getByRole('button', { name: 'Tüm kadro' }))
    expect(await screen.findByText(/Oyuncu 3 · Seviyesine göre %80/)).toBeInTheDocument()
  })

  it('bütçesi girilmemiş kariyerde dönem sonu bütçe uydurma bir sayı değil "—" gösterir (ENG-02)', async () => {
    vi.mocked(endpoints.careers).mockResolvedValueOnce([{ id: 1, clubName: 'Crewe' } as never])
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><CareerTransferPage /></MemoryRouter>
      </QueryClientProvider>,
    )

    const stat = (await screen.findByText('Dönem sonu bütçe')).parentElement as HTMLElement
    expect(stat).toHaveTextContent('—')
    expect((screen.getByText('Kısa liste tavanı').parentElement as HTMLElement)).toHaveTextContent('—')
    expect((screen.getByText('Kısa liste tavanı').parentElement as HTMLElement)).not.toHaveTextContent('€0')
  })
})
