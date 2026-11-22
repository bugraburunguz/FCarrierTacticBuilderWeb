import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireAuth } from './RequireAuth'

const auth = { authenticated: true, loading: true }
vi.mock('./AuthContext', () => ({ useAuth: () => auth }))

const renderAt = (node: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/career/dashboard']}>
      <Routes>
        <Route path="/career/dashboard" element={node} />
        <Route path="/login" element={<p>giriş</p>} />
      </Routes>
    </MemoryRouter>,
  )

/** FCA-35 W2: oturum açıkken sayfa /me yanıtını beklemeden çizilir (sayfa parçası ve sorguları paralel başlar). */
describe('RequireAuth', () => {
  beforeEach(() => {
    auth.authenticated = true
    auth.loading = true
  })

  it('/me yüklenirken sayfa hemen çizilir', () => {
    renderAt(<RequireAuth><p>sayfa</p></RequireAuth>)
    expect(screen.getByText('sayfa')).toBeInTheDocument()
  })

  it('waitForMe: premium/kredi gösteren sayfa /me gelene kadar bekler', () => {
    renderAt(<RequireAuth waitForMe><p>sayfa</p></RequireAuth>)
    expect(screen.queryByText('sayfa')).toBeNull()
  })

  it('oturum yoksa girişe yönlenir', () => {
    auth.authenticated = false
    auth.loading = false
    renderAt(<RequireAuth><p>sayfa</p></RequireAuth>)
    expect(screen.getByText('giriş')).toBeInTheDocument()
  })
})
