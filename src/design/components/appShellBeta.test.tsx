import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { AppShell } from './AppShell'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { email: 'kapi@example.test', subscriptionType: 'PREMIUM' }, logout: vi.fn() }) }))
vi.mock('../../api/endpoints', () => ({ endpoints: { appConfig: vi.fn() } }))

function renderShell() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route element={<AppShell />}><Route path="*" element={<p>içerik</p>} /></Route></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** PROD-PREP 2: beta açıkken başlıkta PREMIUM/kredi çipi yerine beta etiketi. */
describe('kabuk: ücretsiz beta etiketi', () => {
  it('beta açık: "Beta: tüm özellikler ücretsiz"; PREMIUM çipi yok', async () => {
    vi.mocked(endpoints.appConfig).mockResolvedValue({ freeBeta: true, dailyCredits: 30 })
    renderShell()
    expect(await screen.findByText('Beta: tüm özellikler ücretsiz')).toBeInTheDocument()
    expect(screen.queryByText('PREMIUM')).toBeNull()
  })

  it('beta kapalı: mevcut çip', async () => {
    vi.mocked(endpoints.appConfig).mockResolvedValue({ freeBeta: false, dailyCredits: 30 })
    renderShell()
    expect(await screen.findByText('PREMIUM')).toBeInTheDocument()
    expect(screen.queryByText(/^Beta/)).toBeNull()
  })
})
