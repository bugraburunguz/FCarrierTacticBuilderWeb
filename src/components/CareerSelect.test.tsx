import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import { CareerSelect } from './CareerSelect'

const auth = vi.hoisted(() => ({ authenticated: false }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: auth.authenticated }) }))
vi.mock('../api/endpoints', () => ({ endpoints: { careers: vi.fn(() => Promise.resolve([])) } }))

function renderSelect() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CareerSelect />
    </QueryClientProvider>,
  )
}

describe('CareerSelect (F11)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('oturum yokken /careers istenmez (anonim sayfa yüklemesinde 401 olmamalı)', async () => {
    auth.authenticated = false
    renderSelect()

    await new Promise((r) => setTimeout(r, 30))
    expect(endpoints.careers).not.toHaveBeenCalled()
    expect(screen.queryByText(/Yeni kariyer/)).not.toBeInTheDocument()
  })

  it('oturum varken kariyerler istenir', async () => {
    auth.authenticated = true
    renderSelect()

    expect(await screen.findByText(/Henüz kariyerin yok/)).toBeInTheDocument()
    expect(endpoints.careers).toHaveBeenCalled()
  })
})
