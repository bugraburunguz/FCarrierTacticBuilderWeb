import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Me } from '../api/types'
import { AdminUtPage } from './AdminUtPage'

const state = vi.hoisted(() => ({ auth: { authenticated: true, me: undefined } as { authenticated: boolean; me: unknown } }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => state.auth }))
vi.mock('../api/client', () => ({ request: vi.fn(() => Promise.resolve([])) }))

const me = (role: 'USER' | 'ADMIN'): Me => ({ id: 1, email: 'a@b.com', subscriptionType: 'FREE', dailyCreditLimit: 20, showAds: false, role })
const renderPage = () => render(<QueryClientProvider client={new QueryClient()}><AdminUtPage /></QueryClientProvider>)

describe('AdminUtPage', () => {
  it('ADMIN olmayan hesap 403 ekranı görür, anahtar alanı yoktur', () => {
    state.auth = { authenticated: true, me: me('USER') }
    renderPage()
    expect(screen.getByText(/403/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/X-Admin-Key/)).toBeNull()
  })

  it('ADMIN bölümleri görür', () => {
    state.auth = { authenticated: true, me: me('ADMIN') }
    renderPage()
    expect(screen.getByRole('tab', { name: 'Onay kuyruğu' })).toBeInTheDocument()
  })

  it('girişsiz kullanıcıdan giriş istenir', () => {
    state.auth = { authenticated: false, me: undefined }
    renderPage()
    expect(screen.getByText(/giriş yap/)).toBeInTheDocument()
  })
})
