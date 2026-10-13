import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import { CareerTransferPage } from './CareerTransferPage'

vi.mock('../api/endpoints', () => ({
  endpoints: {
    careers: vi.fn(() => Promise.resolve([{ id: 1, clubName: 'Crewe', budgetEur: 5_000_000 }])),
    squad: vi.fn(() => Promise.resolve([])),
    lineup: vi.fn(() => Promise.resolve({ slots: [] })),
    shortlist: vi.fn(() => Promise.resolve([])),
    playerTags: vi.fn(() => Promise.resolve([])),
    transferTargets: vi.fn(() => Promise.resolve({ positions: [{ targets: [] }] })),
  },
}))

describe('CareerTransferPage', () => {
  it('aday sorgusu sunucunun position başına üst sınırını (4) aşmaz', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><CareerTransferPage /></MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(endpoints.transferTargets).toHaveBeenCalled())
    const body = vi.mocked(endpoints.transferTargets).mock.calls[0][0]
    expect(body.perPosition).toBeLessThanOrEqual(4)
    expect(await screen.findByText('Bu ihtiyaç için aday bulunamadı.')).toBeInTheDocument()
  })
})
