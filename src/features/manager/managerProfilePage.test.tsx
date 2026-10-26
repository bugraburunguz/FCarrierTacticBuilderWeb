import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import { ManagerProfilePage } from './ManagerProfilePage'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: 'FREE' } }) }))
vi.mock('../../api/endpoints', () => ({
  endpoints: { managerProfile: vi.fn(), saveManagerProfile: vi.fn(), formations: vi.fn(), replicas: vi.fn(), leagues: vi.fn() },
}))

function renderPage(path = '/career/manager') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/career/manager" element={<ManagerProfilePage />} />
          <Route path="/career/new" element={<p>yeni kariyer açıldı</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const summary = () => within(screen.getByRole('complementary', { name: 'Menajer özeti' }))

beforeEach(() => {
  vi.mocked(endpoints.managerProfile).mockReset().mockResolvedValue(null)
  vi.mocked(endpoints.saveManagerProfile).mockReset().mockImplementation(async (profile) => ({ profile, reputation: 46, band: 'Ulusal tanınırlık' }))
  vi.mocked(endpoints.formations).mockResolvedValue([{ id: '4-3-3', label: '4-3-3' }, { id: '4-4-2', label: '4-4-2' }] as never)
  vi.mocked(endpoints.replicas).mockResolvedValue([{ id: 'r1', club: 'Atletico', coach: 'Simeone', season: '2013/14', formationId: '4-4-2', buildUp: 'COUNTER', defensiveApproach: 'DEEP' }] as never)
  vi.mocked(endpoints.leagues).mockResolvedValue([{ id: 13, name: 'Premier League' }] as never)
})

describe('Menajer profili (MGR-b)', () => {
  it('profil yokken boş form; geçmiş ve diploma seçilmeden kaydedilemez, eksikler yazar', async () => {
    renderPage()
    const save = await screen.findByRole('button', { name: 'Profili kaydet' })
    fireEvent.click(save)
    expect(await screen.findByText('Futbolculuk geçmişini seç.')).toBeInTheDocument()
    expect(endpoints.saveManagerProfile).not.toHaveBeenCalled()
  })

  it('seçenek altında tek satır açıklama; canlı özet itibar çubuğu, bant ve beklenti satırı', async () => {
    renderPage()
    const background = await screen.findByRole('radiogroup', { name: 'Futbolculuk geçmişi' })
    expect(within(background).getByText('Az tanınır; bazı efsaneler de dipten başladı.')).toBeInTheDocument()
    expect(summary().getByText('Geçmiş ve diploma seçince itibar hesaplanır.')).toBeInTheDocument()
    fireEvent.click(within(background).getByRole('radio', { name: /Profesyonel \(bölgesel\)/ }))
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Antrenörlük diploması' })).getByRole('radio', { name: /^Ulusal A/ }))
    expect(summary().getByRole('meter', { name: 'İtibar' })).toHaveAttribute('aria-valuenow', '46')
    expect(summary().getByText('Ulusal tanınırlık')).toBeInTheDocument()
    expect(summary().getByText('Orta sınıf kulüpler ilgilenir; büyük kulüpler hâlâ temkinli.')).toBeInTheDocument()
  })

  it('öncelik en çok 2: üçüncüsü pasifleşir', async () => {
    renderPage()
    const group = await screen.findByRole('group', { name: /Öncelik/ })
    fireEvent.click(within(group).getByRole('checkbox', { name: /Gençler/ }))
    fireEvent.click(within(group).getByRole('checkbox', { name: /Hızlı başarı/ }))
    expect(within(group).getByRole('checkbox', { name: /Finansal güç/ })).toBeDisabled()
    expect(screen.getByText('En çok 2 öncelik seçilir; değiştirmek için birini kaldır.')).toBeInTheDocument()
    expect(within(group).getByRole('checkbox', { name: /Gençler/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('replika kısayolu formasyonu ve tarzı getirir; kaydedince hesaba yazılır ve Yeni kariyer\'e döner', async () => {
    renderPage('/career/manager?sonra=yeni')
    fireEvent.click(within(await screen.findByRole('radiogroup', { name: 'Futbolculuk geçmişi' })).getByRole('radio', { name: /Profesyonel \(yerel\)/ }))
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Antrenörlük diploması' })).getByRole('radio', { name: /^Yok/ }))
    await screen.findByRole('option', { name: /Atletico/ })
    fireEvent.change(screen.getByLabelText('Bir replikayı örnek al'), { target: { value: 'r1' } })
    expect(screen.getByLabelText('Formasyon')).toHaveValue('4-4-2')
    expect(within(screen.getByRole('radiogroup', { name: 'Tarz' })).getByRole('radio', { name: /Kontra/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Profili kaydet' }))
    await waitFor(() => expect(endpoints.saveManagerProfile).toHaveBeenCalledWith({
      licence: 'NONE', background: 'PRO_LOCAL', formation: '4-4-2', style: 'COUNTER', priorities: [], difficulty: 'MEDIUM',
    }))
    expect(await screen.findByText('yeni kariyer açıldı')).toBeInTheDocument()
  })

  it('kayıtlı profil forma gelir; düzenleyip kaydedince sayfada kalır ve bildirir', async () => {
    vi.mocked(endpoints.managerProfile).mockResolvedValue({
      profile: { name: 'Buğra', licence: 'PRO', background: 'WORLD_CLASS', style: 'POSSESSION', priorities: ['QUICK_SUCCESS'], difficulty: 'EASY', gender: 0 },
      reputation: 100, band: 'Dünya çapında',
    })
    renderPage()
    expect(await screen.findByLabelText('Menajer adı (isteğe bağlı)')).toHaveValue('Buğra')
    expect(summary().getByText('Dünya çapında')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Zorluk isteği' })).getByRole('radio', { name: /Zor/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Profili kaydet' }))
    await waitFor(() => expect(endpoints.saveManagerProfile).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'HARD', gender: 0, name: 'Buğra' })))
    expect(await screen.findByRole('status')).toHaveTextContent('Kaydedildi.')
  })

  it('mobilde adım adım üç bölüm: İleri ile sıradaki bölüm, son adımda kaydet', async () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({ matches: query.includes('max-width'), addEventListener: () => {}, removeEventListener: () => {} })) as never
    try {
      renderPage()
      expect(await screen.findByRole('heading', { name: 'Geçmiş ve diploma' })).toBeInTheDocument()
      expect(screen.getByText('Adım 1/3')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Oyun tarzı' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Profili kaydet' })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'İleri' }))
      expect(screen.getByRole('heading', { name: 'Oyun tarzı' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'İleri' }))
      expect(screen.getByRole('heading', { name: 'Öncelik ve zorluk' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Profili kaydet' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Geri' }))
      expect(screen.getByText('Adım 2/3')).toBeInTheDocument()
    } finally {
      window.matchMedia = original
    }
  })

  it.each([
    [false, 'smooth'],
    [true, 'auto'],
  ])('mobilde İleri yeni bölümün başına kaydırır ve odağı başlığına taşır (azaltılmış hareket %s → %s)', async (reduced, behavior) => {
    const original = window.matchMedia
    const scroll = vi.fn()
    const originalScroll = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scroll
    window.matchMedia = ((query: string) => ({
      matches: query.includes('max-width') || (reduced && query.includes('prefers-reduced-motion')), addEventListener: () => {}, removeEventListener: () => {},
    })) as never
    try {
      renderPage()
      await screen.findByRole('heading', { name: 'Geçmiş ve diploma' })
      expect(scroll).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'İleri' }))
      const heading = screen.getByRole('heading', { name: 'Oyun tarzı' })
      await waitFor(() => expect(heading).toHaveFocus())
      expect(scroll).toHaveBeenLastCalledWith({ block: 'start', behavior })
      expect(scroll.mock.contexts.at(-1)).toBe(heading.closest('section'))
      fireEvent.click(screen.getByRole('button', { name: 'Geri' }))
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Geçmiş ve diploma' })).toHaveFocus())
    } finally {
      window.matchMedia = original
      Element.prototype.scrollIntoView = originalScroll
    }
  })

  it('profil alınamazsa tekrar dene', async () => {
    vi.mocked(endpoints.managerProfile).mockRejectedValue(new ApiError('Sunucu hatası', 'server', 500))
    renderPage()
    expect(await screen.findByText('Menajer profili yüklenemedi.')).toBeInTheDocument()
  })
})
