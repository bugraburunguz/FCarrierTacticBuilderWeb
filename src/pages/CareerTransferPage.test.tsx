import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import { CareerTransferPage } from './CareerTransferPage'

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: 'FREE', creditBalance: 17, dailyCreditLimit: 20 } }) }))

vi.mock('../api/endpoints', () => ({
  endpoints: {
    careers: vi.fn(() => Promise.resolve([{ id: 1, clubName: 'Crewe', budgetEur: 5_000_000 }])),
    squad: vi.fn(() => Promise.resolve([])),
    lineup: vi.fn(() => Promise.resolve({ slots: [] })),
    shortlist: vi.fn(() => Promise.resolve([])),
    playerTags: vi.fn(() => Promise.resolve([])),
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

  it('bütçesi girilmemiş kariyerde dönem sonu bütçe uydurma bir sayı değil "—" gösterir (ENG-02)', async () => {
    vi.mocked(endpoints.careers).mockResolvedValueOnce([{ id: 1, clubName: 'Crewe' } as never])
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><CareerTransferPage /></MemoryRouter>
      </QueryClientProvider>,
    )

    const stat = (await screen.findByText('Dönem sonu bütçe')).parentElement as HTMLElement
    expect(stat).toHaveTextContent('—')
  })
})
