import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { careerStore } from '../../state/careerStore'
import { modeStore } from '../../state/modeStore'
import { AppShell } from './AppShell'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { email: 'kapi@example.test', subscriptionType: 'FREE', creditBalance: 20 }, logout: vi.fn() }) }))
vi.mock('../../api/endpoints', () => ({
  endpoints: {
    appConfig: vi.fn(() => Promise.resolve({ freeBeta: true, dailyCredits: 30 })),
    careers: vi.fn(() => Promise.resolve([
      { id: 7, name: 'Liman', clubId: 1, clubName: 'Kuzey Liman SK', season: 1, gameDate: '2027-09-19', squadSize: 26, gameVersionId: 1 },
      { id: 8, clubId: 2, clubName: 'Doğu Kartallar', season: 2026, squadSize: 24, gameVersionId: 1 },
    ])),
  },
}))

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route element={<AppShell />}><Route path="*" element={<p>içerik</p>} /></Route></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  modeStore.set('career')
  careerStore.set(7)
})

describe('FCA-3 kariyer kabuğu (Stitch, FM alışkanlığı)', () => {
  it('sol menü iki bölüm: Operasyon ve Yönetim; Menajer ve İçe aktar Yönetim\'de', () => {
    renderAt('/career/dashboard')
    const menu = screen.getByRole('navigation', { name: 'Ana menü' })
    const ops = within(menu).getByRole('group', { name: 'Operasyon' })
    const admin = within(menu).getByRole('group', { name: 'Yönetim' })
    expect(within(ops).getAllByRole('link').map((a) => a.textContent)).toEqual(['Masa', 'Kadro', 'Taktik Lab', 'Transfer', 'Altyapı', 'Oyuncular', 'Gelişim', 'Takımlar'])
    expect(within(admin).getAllByRole('link').map((a) => a.textContent)).toEqual(['Menajer', 'İçe aktar'])
    expect(within(admin).getByRole('link', { name: 'Menajer' })).toHaveAttribute('href', '/career/manager')
  })

  it('/career/manager: Menajer aktif', () => {
    renderAt('/career/manager')
    const menu = screen.getByRole('navigation', { name: 'Ana menü' })
    expect(within(menu).getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.textContent)).toEqual(['Menajer'])
  })

  it('üst bar: aktif kariyerin kulübü ve oyun tarihi; kariyer değiştirici', async () => {
    renderAt('/career/dashboard')
    const bar = screen.getByRole('region', { name: 'Aktif kariyer' })
    expect(await within(bar).findByText('Kuzey Liman SK')).toBeInTheDocument()
    expect(within(bar).getByText('19 Eylül 2027')).toBeInTheDocument()
    // season kariyerin kaçıncı sezonu (1, 2 …); yıl değil
    expect(within(bar).getByText('1. sezon')).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: /Kariyer değiştir/ })).toBeInTheDocument()
  })

  it('kariyerde tema düğmesi yok (yalnız koyu); UT\'de var', () => {
    const { unmount } = renderAt('/career/dashboard')
    expect(screen.queryByRole('button', { name: /temaya geç/ })).toBeNull()
    unmount()
    modeStore.set('ut')
    renderAt('/ut/squad')
    expect(screen.getAllByRole('button', { name: /temaya geç/ }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('region', { name: 'Aktif kariyer' })).toBeNull()
  })
})
