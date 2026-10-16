import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import { tokens } from '../../api/tokens'
import { ProfilePage } from './ProfilePage'

const logout = vi.fn()
const refreshMe = vi.fn()
let me: object = { id: 7, email: 'oyuncu@example.test', subscriptionType: 'FREE', creditBalance: 12, dailyCreditLimit: 20, showAds: true, emailVerified: true }
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me, logout, refreshMe }) }))
vi.mock('../../api/endpoints', () => ({ endpoints: { changePassword: vi.fn(), subscribe: vi.fn() } }))

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/profile']}>
        <Routes><Route path="/profile" element={<ProfilePage />} /><Route path="/login" element={<p>giriş sayfası</p>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  logout.mockReset().mockResolvedValue(undefined)
  vi.mocked(endpoints.changePassword).mockReset()
  me = { id: 7, email: 'oyuncu@example.test', subscriptionType: 'FREE', creditBalance: 12, dailyCreditLimit: 20, showAds: true, emailVerified: true }
})

describe('Profil (v3 Pano)', () => {
  it('hesap bilgisi ve kredi bakiyesi', () => {
    renderPage()
    const account = screen.getByRole('region', { name: 'Hesap' })
    expect(within(account).getByText('oyuncu@example.test')).toBeInTheDocument()
    expect(within(account).getByText('FREE')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Kredi' })).getByText('12 / 20')).toBeInTheDocument()
  })

  it('şifre değiştir: mevcut + yeni (autocomplete), başarıda yeni oturum token\'ları saklanır', async () => {
    vi.mocked(endpoints.changePassword).mockResolvedValue({ accessToken: 'yeni-access', refreshToken: 'yeni-refresh' } as never)
    const set = vi.spyOn(tokens, 'set')
    renderPage()
    const box = screen.getByRole('region', { name: 'Şifre değiştir' })
    const current = within(box).getByLabelText('Mevcut şifre')
    const next = within(box).getByLabelText('Yeni şifre (en az 8 karakter)')
    expect(current).toHaveAttribute('autocomplete', 'current-password')
    expect(next).toHaveAttribute('autocomplete', 'new-password')
    fireEvent.change(current, { target: { value: 'eski-sifre-1' } })
    fireEvent.change(next, { target: { value: 'yeni-sifre-1' } })
    fireEvent.click(within(box).getByRole('button', { name: 'Şifreyi değiştir' }))
    await waitFor(() => expect(endpoints.changePassword).toHaveBeenCalledWith('eski-sifre-1', 'yeni-sifre-1'))
    await waitFor(() => expect(set).toHaveBeenCalledWith('yeni-access', 'yeni-refresh'))
    expect(await within(box).findByRole('status')).toHaveTextContent('Şifren değişti; diğer cihazlardaki oturumlar kapatıldı.')
  })

  it('şifre değiştir hatası (mevcut şifre yanlış) sunucu metniyle; oturum kapanmaz', async () => {
    vi.mocked(endpoints.changePassword).mockRejectedValue(new ApiError('Mevcut şifre hatalı.', 'fc.exception.0027', 422))
    renderPage()
    const box = screen.getByRole('region', { name: 'Şifre değiştir' })
    fireEvent.change(within(box).getByLabelText('Mevcut şifre'), { target: { value: 'yanlis-1' } })
    fireEvent.change(within(box).getByLabelText('Yeni şifre (en az 8 karakter)'), { target: { value: 'yeni-sifre-1' } })
    fireEvent.click(within(box).getByRole('button', { name: 'Şifreyi değiştir' }))
    expect(await within(box).findByRole('alert')).toHaveTextContent('Mevcut şifre hatalı.')
    expect(logout).not.toHaveBeenCalled()
  })

  it('oturumu kapat → giriş sayfası', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Oturumu kapat' }))
    await waitFor(() => expect(logout).toHaveBeenCalled())
    expect(await screen.findByText('giriş sayfası')).toBeInTheDocument()
  })

  it('abonelik: PREMIUM değilse ödeme yok, kısa metin; PREMIUM ise aktif', () => {
    const view = renderPage()
    expect(within(screen.getByRole('region', { name: 'Abonelik' })).getByText(/ödeme altyapısı hazırlanıyor|Geliştirme modu/)).toBeInTheDocument()
    view.unmount()
    me = { ...me, subscriptionType: 'PREMIUM' }
    renderPage()
    expect(within(screen.getByRole('region', { name: 'Abonelik' })).getByText(/PREMIUM aktif/)).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Kredi' })).getByText('Sınırsız')).toBeInTheDocument()
  })
})
