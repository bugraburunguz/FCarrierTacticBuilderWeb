import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { Suspense } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { modeStore } from '../../state/modeStore'
import { utCardStore } from '../../state/utCardStore'
import { HomeRoute } from './HomeRoute'

let authenticated = true
let capture = true
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated, me: authenticated ? { subscriptionType: 'FREE' } : undefined }) }))
vi.mock('../../lib/features', async (orig) => ({ ...(await orig<typeof import('../../lib/features')>()), extensionCaptureEnabled: () => capture }))
vi.mock('../../api/endpoints', () => {
  const none = () => Promise.resolve([])
  return {
    endpoints: {
      careers: vi.fn(() => Promise.resolve([])), squad: vi.fn(), snapshots: vi.fn(),
      kbSbc: vi.fn(), kbItems: none, playerAssetNames: none, sbcVotes: vi.fn(() => Promise.resolve({ sets: [] })),
    },
  }
})

const set = (id: number, firstSeenAt: string) => ({ id, name: `Set ${id}`, category: 'Upgrades', reward: {}, status: 'CONFIRMED', challengeCount: 1, firstSeenAt, endsAt: '2099-01-01T00:00:00Z' })

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Suspense fallback={<p>yükleniyor</p>}>
          <Routes>
            <Route index element={<HomeRoute />} />
            <Route path="career/dashboard" element={<p>masa</p>} />
          </Routes>
        </Suspense>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  authenticated = true
  capture = true
  modeStore.set('career')
  vi.mocked(endpoints.kbSbc).mockResolvedValue([set(1, '2026-10-01'), set(2, '2026-10-05'), set(3, '2026-10-03'), set(4, '2026-10-09'), set(5, '2026-10-08'), set(6, '2026-10-02')] as never)
  vi.mocked(endpoints.squad).mockClear()
  vi.mocked(endpoints.snapshots).mockClear()
  utCardStore.set([])
})

describe('Ana sayfa (/)', () => {
  it('FCA-28 girişli kariyer: Masa\'ya yönlenir; eski "Kariyerine devam et" ana sayfası çizilmez, isteği atılmaz', () => {
    renderPage()
    expect(screen.getByText('masa')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Kariyerine devam et' })).toBeNull()
    expect(screen.queryByRole('heading', { level: 1, name: 'FC Assist' })).toBeNull()
    expect(endpoints.squad).not.toHaveBeenCalled()
    expect(endpoints.snapshots).not.toHaveBeenCalled()
  })

  it('FCA-26 girişsiz: Stitch karşılama sayfası (hero, saha önizlemesi, 3 özellik, Nasıl çalışır, bağımsızlık); kariyer isteği yok', async () => {
    authenticated = false
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Kariyerinde yanında.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ücretsiz başla' })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: 'Giriş yap' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Nasıl çalışır?' })).toHaveAttribute('href', '#nasil-calisir')
    // Taktik tahtası önizlemesi: kurgusal oyuncular, ortak saha bileşeni.
    const board = screen.getByRole('region', { name: 'Taktik tahtası önizlemesi' })
    expect(board.querySelector('.pitch-field')).not.toBeNull()
    const features = screen.getByRole('region', { name: 'Özellikler' })
    expect(within(features).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Kaydını yükle', 'Taktiğini kur', 'Doğru transferi bul'])
    const how = screen.getByRole('region', { name: 'Nasıl çalışır?' })
    expect(how).toHaveAttribute('id', 'nasil-calisir')
    expect(within(how).getAllByRole('listitem').map((li) => li.querySelector('h3')?.textContent)).toEqual(['Kayıt ol', 'Kaydını yükle', 'Masan hazır'])
    expect(screen.getByText(/Bağımsız hayran projesi/)).toBeInTheDocument()
    // Uydurma kullanıcı sayısı ya da sürüm iddiası yok.
    expect(document.body.textContent).not.toMatch(/15\.000|V24|aktif kullan/i)
    expect(endpoints.careers).not.toHaveBeenCalled()
    expect(screen.queryByText('masa')).toBeNull()
  })

  it('FCA-26 girişsiz UT modunda da karşılama sayfası; UT araçlarına bağlantı', async () => {
    authenticated = false
    modeStore.set('ut')
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Kariyerinde yanında.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /UT araçları/ })).toHaveAttribute('href', '/players')
    expect(endpoints.kbSbc).not.toHaveBeenCalled()
  })

  it('UT: marka + bugünün SBC\'leri (en yeni 4 aktif set), kadrom özeti (yakalanmış kulüp varsa); karşılama yok', async () => {
    modeStore.set('ut')
    utCardStore.set([{ key: 'a', source: 'club', name: 'Kart A', rating: 88 }, { key: 'b', source: 'club', name: 'Kart B', rating: 75 }] as never)
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'FC Assist' })).toBeInTheDocument()
    expect(screen.getByText('Ultimate Team', { selector: 'p' })).toBeInTheDocument()
    const sbc = await screen.findByRole('region', { name: "Bugünün SBC'leri" })
    await waitFor(() => expect(within(sbc).getAllByRole('heading').map((h) => h.textContent).filter((t) => t?.startsWith('Set '))).toEqual(['Set 4', 'Set 5', 'Set 2', 'Set 3']))
    const club = screen.getByRole('region', { name: 'Kadrom' })
    expect(club).toHaveTextContent('2 kart')
    expect(club).toHaveTextContent('en yüksek 88')
    expect(screen.queryByRole('region', { name: /İzlenen/ })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Kariyerinde yanında.' })).toBeNull()
  })

  it('UT, yakalama bayrağı kapalı: SBC ve kulüp blokları yok', async () => {
    modeStore.set('ut')
    capture = false
    utCardStore.set([{ key: 'a', source: 'club', name: 'Kart A', rating: 88 }] as never)
    renderPage()
    expect(await screen.findByText('Ultimate Team', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: "Bugünün SBC'leri" })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Kadrom' })).toBeNull()
    expect(endpoints.kbSbc).not.toHaveBeenCalled()
  })
})
