import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { careerStore } from '../../state/careerStore'
import { labStore } from '../../state/labStore'
import { modeStore } from '../../state/modeStore'
import { AppShell } from './AppShell'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { email: 'kapi@example.test', subscriptionType: 'FREE', creditBalance: 20 }, logout: vi.fn() }) }))

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route element={<AppShell />}><Route path="*" element={<p>içerik</p>} /></Route></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => modeStore.set('career'))

describe('v3 kabuk: kariyer menüsü tek (V3-06d)', () => {
  it.each([
    ['/career/dashboard', 'Masa'], ['/career/transfer', 'Transfer'], ['/career/growth', 'Gelişim'], ['/players', 'Oyuncular'],
    ['/career/squad', 'Kadro'], ['/career/tactics-lab', 'Taktik Lab'], ['/tactics/wizard', 'Taktik Lab'], ['/teams', 'Takımlar'], ['/career/import', 'İçe aktar'],
  ])('%s: sol menüde %s aria-current="page"; üstte Masa/Transfer/Gelişim sekmeleri yok', (path, label) => {
    renderAt(path)
    const rail = screen.getByRole('navigation', { name: 'Ana menü' })
    const current = within(rail).getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')
    expect(current.map((a) => a.textContent)).toEqual([label])
    expect(screen.queryByRole('navigation', { name: /Masa sekmeleri|Menajer masası sekmeleri/ })).toBeNull()
  })

  it('Taktik Lab öğesinde kaydedilmemiş taslak noktası ve erişilebilir adı (FAZ 4a); taslak yoksa nokta yok', () => {
    careerStore.set(7)
    localStorage.clear()
    labStore.reload()
    const { unmount } = renderAt('/career/dashboard')
    const rail = () => screen.getByRole('navigation', { name: 'Ana menü' })
    expect(within(rail()).getByRole('link', { name: 'Taktik Lab' }).querySelector('[data-unsaved-dot]')).toBeNull()
    unmount()
    labStore.create(7, { name: 'Deneme', origin: { kind: 'blank' }, tactic: { formation: '4-4-2', slots: {} }, lineup: {} })
    renderAt('/career/dashboard')
    const lab = within(rail()).getByRole('link', { name: 'Taktik Lab · kaydedilmemiş taslak var' })
    expect(lab.querySelector('[data-unsaved-dot]')).not.toBeNull()
    expect(within(screen.getByRole('navigation', { name: 'Mobil menü' })).getByRole('link', { name: 'Lab · kaydedilmemiş taslak var' })).toBeInTheDocument()
  })

  it('mobil alt çubuk: Masa, Kadro, Lab, Transfer, Oyuncular, Daha fazla; sheet Gelişim, Takımlar, İçe aktar, Yeni kariyer', () => {
    renderAt('/career/growth')
    const bar = screen.getByRole('navigation', { name: 'Mobil menü' })
    expect(within(bar).getAllByRole('link').map((a) => a.textContent)).toEqual(['Masa', 'Kadro', 'Lab', 'Transfer', 'Oyuncu'])
    const more = within(bar).getByRole('button', { name: 'Daha fazla' })
    // Aktif öğe sheet'teyse "Daha fazla" aktif görünür.
    expect(more).toHaveAttribute('aria-current', 'page')
    fireEvent.click(more)
    const sheet = screen.getByRole('dialog', { name: 'Daha fazla' })
    expect(within(sheet).getAllByRole('link').map((a) => a.textContent)).toEqual(['Gelişim', 'Takımlar', 'İçe aktar', 'Yeni kariyer'])
    expect(within(sheet).getByRole('link', { name: 'Gelişim' })).toHaveAttribute('aria-current', 'page')
  })

  it('Oyuncular alt sekmeleri sayfa içi kalır (Oyuncu ara / Wonderkids / Karşılaştır)', () => {
    renderAt('/wonderkids')
    const tabs = screen.getByRole('navigation', { name: 'Oyuncular sekmeleri' })
    expect(within(tabs).getAllByRole('link').map((a) => a.textContent)).toEqual(['Oyuncu ara', 'Wonderkids', 'Karşılaştır'])
    expect(tabs.closest('main')).not.toBeNull()
  })

  it('UT menüsü değişmez: mobilde ilk 5 öğe, Daha fazla yok', () => {
    modeStore.set('ut')
    renderAt('/ut/squad')
    const bar = screen.getByRole('navigation', { name: 'Mobil menü' })
    expect(within(bar).getAllByRole('link')).toHaveLength(5)
    expect(within(bar).queryByRole('button', { name: 'Daha fazla' })).toBeNull()
  })
})
