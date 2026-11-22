import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prefetchRoute } from '../../lib/routePrefetch'
import { careerStore } from '../../state/careerStore'
import { modeStore } from '../../state/modeStore'
import { AppShell } from './AppShell'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { email: 'kapi@example.test', subscriptionType: 'FREE', creditBalance: 20, role: 'USER' }, logout: vi.fn() }) }))
vi.mock('../../api/endpoints', () => ({
  endpoints: {
    appConfig: vi.fn(() => Promise.resolve({ freeBeta: true, dailyCredits: 30 })),
    careers: vi.fn(() => Promise.resolve([{ id: 7, name: 'Liman', clubId: 1, clubName: 'Kuzey Liman SK', season: 1, squadSize: 26, gameVersionId: 1 }])),
  },
}))
vi.mock('../../lib/routePrefetch', async (original) => ({ ...(await original<typeof import('../../lib/routePrefetch')>()), prefetchRoute: vi.fn(() => Promise.resolve()) }))

/** FCA-35 W9: kariyer menüsünde öğenin üzerine gelince ya da odaklanınca hedef sayfa önceden yüklenir. */
describe('AppShell önceden yükleme', () => {
  beforeEach(() => {
    modeStore.set('career')
    careerStore.set(7)
    vi.mocked(prefetchRoute).mockClear()
  })

  it('Gelişim bağlantısına gelince prefetchRoute seçili kariyerle çağrılır', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/career/dashboard']}>
          <Routes><Route element={<AppShell />}><Route path="*" element={<p>içerik</p>} /></Route></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const link = screen.getAllByRole('link').find((a) => a.getAttribute('href') === '/career/growth')!
    fireEvent.mouseEnter(link)
    fireEvent.focus(link)
    expect(prefetchRoute).toHaveBeenCalledWith('/career/growth', expect.anything(), 7)
  })
})
