import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { modeStore } from '../../state/modeStore'
import { AppShell } from './AppShell'

let authenticated = true
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ authenticated, me: authenticated ? { email: 'kapi@example.test', subscriptionType: 'FREE', creditBalance: 20 } : undefined, logout: vi.fn() }),
}))

const homeRendered = vi.fn()
function OldHome() {
  homeRendered()
  return <p>ana sayfa</p>
}

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OldHome />} />
            <Route path="career/dashboard" element={<p>masa</p>} />
            <Route path="*" element={<p>içerik</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const logo = () => screen.getAllByRole('link', { name: 'FC Assist' })[0]

beforeEach(() => {
  authenticated = true
  homeRendered.mockClear()
  modeStore.set('career')
})

describe('FCA-28 logo tıklaması', () => {
  it('girişli kariyer: logo Masa\'ya gider, ana sayfa (eski görünüm) hiç çizilmez', () => {
    renderAt('/career/transfer')
    expect(logo()).toHaveAttribute('href', '/career/dashboard')
    fireEvent.click(logo())
    expect(screen.getByText('masa')).toBeInTheDocument()
    expect(homeRendered).not.toHaveBeenCalled()
  })

  it('kariyer mod anahtarı da Masa\'ya gider', () => {
    modeStore.set('ut')
    renderAt('/ut/meta')
    fireEvent.click(screen.getByRole('radio', { name: 'Kariyer' }))
    expect(screen.getByText('masa')).toBeInTheDocument()
    expect(homeRendered).not.toHaveBeenCalled()
  })

  it('girişli UT: logo UT ana sayfasına (/)', () => {
    modeStore.set('ut')
    renderAt('/ut/meta')
    expect(logo()).toHaveAttribute('href', '/')
  })

  it('girişsiz: logo karşılama sayfasına (/)', () => {
    authenticated = false
    renderAt('/players')
    expect(logo()).toHaveAttribute('href', '/')
  })
})
