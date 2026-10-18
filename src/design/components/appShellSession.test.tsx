import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

// Oturum anahtarı var ama /me henüz gelmedi ya da geçici hata (429) verdi.
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: undefined, logout: vi.fn() }) }))
vi.mock('../../api/endpoints', () => ({ endpoints: { appConfig: vi.fn(() => Promise.resolve({ freeBeta: false, dailyCredits: 30 })) } }))

/** Hızlı gezinmede /me 429 alınca başlık "Kayıt ol / Giriş" gösteriyordu: kullanıcı çıkış yapmış sanıyordu. */
describe('kabuk: oturum açık, profil yükleniyor', () => {
  it('Kayıt ol / Giriş göstermez; yer tutucu gösterir', () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/']}>
          <Routes><Route element={<AppShell />}><Route path="*" element={<p>içerik</p>} /></Route></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.queryByRole('link', { name: 'Kayıt ol' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Giriş' })).toBeNull()
    expect(screen.getByLabelText('Hesap yükleniyor')).toBeInTheDocument()
  })
})
