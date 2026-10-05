import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tokens } from '../api/tokens'
import { AuthProvider } from '../auth/AuthContext'
import { LoginPage } from './AuthPages'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderLogin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<p>ana sayfa</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    tokens.clear()
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('stores tokens and redirects after a successful login', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/auth/login')
        ? json({ success: true, data: { accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresInSeconds: 900 } })
        : json({ success: true, data: { id: 1, email: 'a@b.com', subscriptionType: 'FREE', creditBalance: 20, dailyCreditLimit: 20, showAds: true } }),
    )
    renderLogin()

    await userEvent.type(screen.getByLabelText('E-posta'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Şifre'), 'secret-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Giriş yap' }))

    await waitFor(() => expect(screen.getByText('ana sayfa')).toBeInTheDocument())
    expect(tokens.access).toBe('a')
  })

  it('shows the server error message and stays on the page when credentials are wrong', async () => {
    fetchMock.mockResolvedValue(json({ success: false, error: [{ code: 'fc.exception.0007', message: 'E-posta veya şifre hatalı.' }] }))
    renderLogin()

    await userEvent.type(screen.getByLabelText('E-posta'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Şifre'), 'wrong-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Giriş yap' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-posta veya şifre hatalı.')
    expect(tokens.authenticated).toBe(false)
  })
})
