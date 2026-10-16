import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import { PRIVACY_VERSION } from '../legal/privacyVersion'
import { LoginPage, RegisterPage, VerifyEmailPage } from './AuthPages'

const login = vi.fn()
const register = vi.fn()
const refreshMe = vi.fn()
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: false, login, register, refreshMe }) }))
vi.mock('../../api/endpoints', () => ({ endpoints: { verifyEmail: vi.fn() } }))

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/" element={<p>ana sayfa</p>} />
          <Route path="/career/desk" element={<p>masa</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  login.mockReset().mockResolvedValue(undefined)
  register.mockReset().mockResolvedValue(undefined)
  vi.mocked(endpoints.verifyEmail).mockReset()
})

describe('Giriş / kayıt / doğrulama (v3)', () => {
  it('giriş: tek cam kart + marka; autocomplete username/current-password; şifre göster/gizle', async () => {
    renderAt('/login')
    expect(screen.getByRole('heading', { name: 'Giriş yap' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'FC Assist' })).toBeInTheDocument()
    const email = screen.getByLabelText('E-posta')
    const password = screen.getByLabelText('Şifre')
    expect(email).toHaveAttribute('autocomplete', 'username')
    expect(password).toHaveAttribute('autocomplete', 'current-password')
    expect(password).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Şifreyi göster' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Şifreyi gizle' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('giriş: gönderince login çağrılır ve ana sayfaya döner; sunucu hatası mevcut metinle gösterilir', async () => {
    renderAt('/login')
    fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: 'a@example.test' } })
    fireEvent.change(screen.getByLabelText('Şifre'), { target: { value: 'gizli-sifre' } })
    fireEvent.click(screen.getByRole('button', { name: 'Giriş yap' }))
    await waitFor(() => expect(login).toHaveBeenCalledWith('a@example.test', 'gizli-sifre'))
    expect(await screen.findByText('ana sayfa')).toBeInTheDocument()
  })

  it('giriş hatası: sunucunun mesajı (errorMessage) alert olarak', async () => {
    login.mockRejectedValueOnce(new ApiError('E-posta veya şifre hatalı.', 'fc.exception.0007', 401))
    renderAt('/login')
    fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: 'a@example.test' } })
    fireEvent.change(screen.getByLabelText('Şifre'), { target: { value: 'yanlis-sifre' } })
    fireEvent.click(screen.getByRole('button', { name: 'Giriş yap' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-posta veya şifre hatalı.')
  })

  it('kayıt: new-password, en az 8 karakter; zorunlu, işaretsiz aydınlatma onayı; sürüm gönderilir', async () => {
    renderAt('/register')
    expect(screen.getByRole('heading', { name: 'Hesap oluştur' })).toBeInTheDocument()
    const password = screen.getByLabelText('Şifre (en az 8 karakter)')
    expect(password).toHaveAttribute('autocomplete', 'new-password')
    expect(password).toHaveAttribute('minlength', '8')
    const ack = screen.getByRole('checkbox', { name: 'Aydınlatma metnini okudum.' })
    expect(ack).not.toBeChecked()
    expect(ack).toBeRequired()
    expect(screen.getByRole('link', { name: 'Aydınlatma metnini' })).toHaveAttribute('href', '/privacy')
    expect(document.body.textContent?.toLocaleLowerCase('tr')).not.toContain('açık rıza')
    fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: 'b@example.test' } })
    fireEvent.change(password, { target: { value: 'uzun-sifre-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kayıt ol' }))
    expect(register).not.toHaveBeenCalled()
    fireEvent.click(ack)
    fireEvent.click(screen.getByRole('button', { name: 'Kayıt ol' }))
    await waitFor(() => expect(register).toHaveBeenCalledWith('b@example.test', 'uzun-sifre-1', PRIVACY_VERSION))
  })

  it('kayıt hatası (IP günlük sınırı dahil) sunucu metniyle', async () => {
    register.mockRejectedValueOnce(new ApiError('Çok fazla istek. Lütfen biraz sonra tekrar dene.', 'fc.exception.0013', 429))
    renderAt('/register')
    fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: 'b@example.test' } })
    fireEvent.change(screen.getByLabelText('Şifre (en az 8 karakter)'), { target: { value: 'uzun-sifre-1' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aydınlatma metnini okudum.' }))
    fireEvent.click(screen.getByRole('button', { name: 'Kayıt ol' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Çok fazla istek')
  })

  it('e-posta doğrulama: bağlantı eksik / başarılı / hata', async () => {
    const missing = renderAt('/verify-email')
    expect(screen.getByText(/Doğrulama bağlantısı eksik/)).toBeInTheDocument()
    missing.unmount()
    vi.mocked(endpoints.verifyEmail).mockResolvedValueOnce(undefined as never)
    const ok = renderAt('/verify-email?token=abc')
    expect(await screen.findByText(/E-postan doğrulandı/)).toBeInTheDocument()
    expect(endpoints.verifyEmail).toHaveBeenCalledWith('abc')
    ok.unmount()
    vi.mocked(endpoints.verifyEmail).mockRejectedValueOnce(new ApiError('Doğrulama bağlantısı geçersiz ya da süresi dolmuş.', 'fc.exception.0026', 400))
    renderAt('/verify-email?token=eski')
    expect(await screen.findByRole('alert')).toHaveTextContent('süresi dolmuş')
  })

})
