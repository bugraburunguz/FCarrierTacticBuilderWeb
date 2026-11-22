import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Me } from '../api/types'
import { AdminUtPage } from './AdminUtPage'

const state = vi.hoisted(() => ({ auth: { authenticated: true, me: undefined } as { authenticated: boolean; me: unknown } }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => state.auth }))
vi.mock('../api/client', () => ({ request: vi.fn(() => Promise.resolve([])), requestText: vi.fn(), api: { get: vi.fn(() => Promise.resolve([])) }, ApiError: class extends Error {} }))

const me = (role: 'USER' | 'ADMIN'): Me => ({ id: 1, email: 'a@b.com', subscriptionType: 'FREE', dailyCreditLimit: 20, showAds: false, role })
function LocationProbe() {
  const { search } = useLocation()
  return <output data-testid="search">{search}</output>
}

const renderPage = (path = '/admin/ut') => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={[path]}>
      <AdminUtPage />
      <LocationProbe />
    </MemoryRouter>
  </QueryClientProvider>,
)

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

  it('GTR-b: "Gelişim ölçümü" bölümü kariyer ve tarih alanlarını açar', () => {
    state.auth = { authenticated: true, me: me('ADMIN') }
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Gelişim ölçümü' }))
    expect(screen.getByLabelText('Kariyer kimliği')).toBeInTheDocument()
    expect(screen.getByLabelText('Başlangıç (oyun tarihi)')).toHaveAttribute('type', 'date')
  })

  it('FCA-32 AC-1: ?sekme=kadro "Kadro yükle" sekmesini doğrudan açar', async () => {
    state.auth = { authenticated: true, me: me('ADMIN') }
    renderPage('/admin/ut?sekme=kadro')
    expect(screen.getByRole('tab', { name: 'Kadro yükle' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Log dosyası')).toBeInTheDocument()
    expect(await screen.findByText('Henüz kadro sürümü yok.')).toBeInTheDocument()
  })

  it('FCA-32 AC-1: sekme değişince URL\'e yazılır; bilinmeyen sekme varsayılana düşer', () => {
    state.auth = { authenticated: true, me: me('ADMIN') }
    renderPage('/admin/ut?sekme=yok')
    expect(screen.getByRole('tab', { name: 'Onay kuyruğu' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: 'Kadro yükle' }))
    expect(screen.getByTestId('search')).toHaveTextContent('?sekme=kadro')
    expect(screen.getByLabelText('Log dosyası')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Bakım' }))
    expect(screen.getByTestId('search')).toHaveTextContent('?sekme=maintenance')
  })

  it('FCA-32 AC-1: ADMIN olmayan ?sekme=kadro ile de 403 görür, panel açılmaz', () => {
    state.auth = { authenticated: true, me: me('USER') }
    renderPage('/admin/ut?sekme=kadro')
    expect(screen.getByText(/403/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Log dosyası')).toBeNull()
  })

  it('girişsiz kullanıcıdan giriş istenir', () => {
    state.auth = { authenticated: false, me: undefined }
    renderPage()
    expect(screen.getByText(/giriş yap/)).toBeInTheDocument()
  })
})
