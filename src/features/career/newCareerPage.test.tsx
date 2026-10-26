import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { NewCareerPage } from './NewCareerPage'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: 'FREE' } }) }))
vi.mock('../../api/endpoints', () => ({
  endpoints: { clubs: vi.fn(), createCareer: vi.fn(), updateCareer: vi.fn(), careers: vi.fn(), deleteCareer: vi.fn(), managerProfile: vi.fn(), clubRecommendations: vi.fn() },
}))

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname}{location.search}</p>
}

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/career/new']}>
        <Routes>
          <Route path="/career/new" element={<NewCareerPage />} />
          <Route path="/career/dashboard" element={<p>masa açıldı</p>} />
          <Route path="/career/manager" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const PROFILE = {
  profile: { name: 'Buğra', licence: 'NATIONAL_A', background: 'PRO_REGIONAL', style: 'COUNTER', priorities: ['YOUTH'], difficulty: 'MEDIUM' },
  reputation: 46, band: 'Ulusal tanınırlık',
}
const card = (category: string, clubId: number, clubName: string, extra: object = {}) => ({
  category, clubId, clubName, leagueId: clubId, league: `Lig ${clubId}`, difficulty: 'EASY', formation: '4-3-3', style: 'COUNTER', squadFit: 70, roleFit: 60, need: 44, dream: false,
  evidence: ['Kadro gücü ligde 4. (ort. OVR 68)', 'Kulüp değeri €120 Mn · tahmini bütçe ~€12 Mn', '21 yaş altı 5 yüksek potansiyelli oyuncu'],
  expectation: 'Makul beklenti, zaman tanınır.', ...extra,
})
const CARDS = [
  card('YOUTH_PROJECT', 1, 'Brommapojkarna'), card('BEST_FIT', 2, 'Rayo Vallecano'), card('RESCUE', 3, 'Waterford', { difficulty: 'HARD' }),
  card('STRONG_BUDGET', 4, 'Southampton'), card('SAFE', 5, 'Girona FC'),
  card('DREAM', 6, 'FC Augsburg', { difficulty: 'MEDIUM', dream: true, need: 60, expectation: 'Yönetim sabırlı ama taraftar şüpheli; ilk sezon kritik.' }),
]
const recs = (extra: object = {}) => ({ reputation: 46, band: 'Ulusal tanınırlık', catalogReady: true, cards: CARDS, missing: [], ...extra })

const pickClub = async () => {
  fireEvent.change(screen.getByLabelText('Kulüp'), { target: { value: 'Crewe' } })
  fireEvent.click(await screen.findByRole('option', { name: /Crewe Alexandra/ }))
}

beforeEach(() => {
  vi.mocked(endpoints.clubs).mockResolvedValue([{ id: 9, name: 'Crewe Alexandra', league: 'EFL League Two' }] as never)
  vi.mocked(endpoints.createCareer).mockReset().mockResolvedValue({ id: 42, clubId: 9, gameVersionId: 27, squadSize: 27 } as never)
  vi.mocked(endpoints.updateCareer).mockReset().mockResolvedValue({ id: 42 } as never)
  vi.mocked(endpoints.careers).mockResolvedValue([] as never)
  // Profil yok: 200 + data null (hata değil).
  vi.mocked(endpoints.managerProfile).mockReset().mockResolvedValue(null)
  vi.mocked(endpoints.clubRecommendations).mockReset().mockResolvedValue(recs() as never)
})

describe('Kulüp önerisi (MGR-b, Yeni kariyer ilk adım)', () => {
  const section = async () => within(await screen.findByRole('region', { name: 'Kulüp önerileri' }))

  it('menajer profili yoksa önce profil oluşturmaya çağırır; öneri istenmez', async () => {
    renderPage()
    const s = await section()
    fireEvent.click(await s.findByRole('link', { name: 'Menajer profilini oluştur' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/career/manager?sonra=yeni')
    expect(endpoints.clubRecommendations).not.toHaveBeenCalled()
  })

  it('profil özeti + Düzenle; 6 kart, kulüpler tekrar etmez; kartta kategori, lig, zorluk, 3 kanıt, beklenti', async () => {
    vi.mocked(endpoints.managerProfile).mockResolvedValue(PROFILE as never)
    renderPage()
    const s = await section()
    expect(await s.findByText(/Buğra · itibar 46 · Ulusal tanınırlık/)).toBeInTheDocument()
    expect(s.getByRole('link', { name: 'Düzenle' })).toHaveAttribute('href', '/career/manager?sonra=yeni')
    const cards = await s.findAllByRole('article')
    expect(cards).toHaveLength(6)
    expect(new Set(cards.map((c) => c.getAttribute('aria-label'))).size).toBe(6)
    const youth = within(s.getByRole('article', { name: 'Gençlik projesi: Brommapojkarna' }))
    expect(youth.getByText('Lig 1')).toBeInTheDocument()
    expect(youth.getByText('Kolay')).toBeInTheDocument()
    expect(youth.getAllByRole('listitem')).toHaveLength(3)
    expect(youth.getByText('Makul beklenti, zaman tanınır.')).toBeInTheDocument()
    expect(within(s.getByRole('article', { name: 'Kurtarma görevi: Waterford' })).getByText('Zor')).toBeInTheDocument()
    expect(endpoints.clubRecommendations).toHaveBeenCalledWith({})
  })

  it('Hayal kulübü kartı işaretli: kesik kenar ve "İtibarın yetmeyebilir" notu yalnız onda', async () => {
    vi.mocked(endpoints.managerProfile).mockResolvedValue(PROFILE as never)
    renderPage()
    const s = await section()
    const dream = await s.findByRole('article', { name: 'Hayal kulübü: FC Augsburg' })
    expect(dream.className).toContain('border-dashed')
    expect(within(dream).getByText(/İtibarın yetmeyebilir/)).toBeInTheDocument()
    expect(s.getAllByText(/İtibarın yetmeyebilir/)).toHaveLength(1)
  })

  it('"Bu kulüple başla" kariyer formunu o kulüple açar; oluşturunca kulüp kimliği gider', async () => {
    vi.mocked(endpoints.managerProfile).mockResolvedValue(PROFILE as never)
    renderPage()
    const s = await section()
    fireEvent.click(await s.findByRole('button', { name: 'Bu kulüple başla: Girona FC' }))
    expect(screen.getByText(/Seçili:/)).toHaveTextContent('Girona FC')
    fireEvent.click(screen.getByRole('button', { name: 'Kariyeri oluştur' }))
    await waitFor(() => expect(endpoints.createCareer).toHaveBeenCalledWith({ clubId: 5 }))
    expect(await screen.findByText('masa açıldı')).toBeInTheDocument()
  })

  it('"Başka kulüp seç" takım aramasına götürür', async () => {
    vi.mocked(endpoints.managerProfile).mockResolvedValue(PROFILE as never)
    renderPage()
    const s = await section()
    fireEvent.click(await s.findByRole('button', { name: 'Başka kulüp seç' }))
    expect(screen.getByLabelText('Kulüp')).toHaveFocus()
  })

  it('kulüp profili verisi yoksa (katalog güncel değil) ayrı durum', async () => {
    vi.mocked(endpoints.managerProfile).mockResolvedValue(PROFILE as never)
    vi.mocked(endpoints.clubRecommendations).mockResolvedValue(recs({ catalogReady: false, cards: [] }) as never)
    renderPage()
    const s = await section()
    expect(await s.findByText(/Kulüp verisi henüz yok/)).toBeInTheDocument()
    expect(s.queryByRole('article')).not.toBeInTheDocument()
  })

  it('aday yoksa nedenler yazar; eksik kategori nedeni kartların altında', async () => {
    vi.mocked(endpoints.managerProfile).mockResolvedValue(PROFILE as never)
    vi.mocked(endpoints.clubRecommendations).mockResolvedValue(recs({ cards: [], missing: [{ category: 'DREAM', reason: 'İtibar aralığında hayal adayı yok.' }] }) as never)
    renderPage()
    const s = await section()
    expect(await s.findByText('İtibarına ve filtrelerine uyan kulüp bulunamadı.')).toBeInTheDocument()
    expect(s.getByText(/İtibar aralığında hayal adayı yok\./)).toBeInTheDocument()
  })

  it('öneri alınamazsa hata ve tekrar dene', async () => {
    vi.mocked(endpoints.managerProfile).mockResolvedValue(PROFILE as never)
    vi.mocked(endpoints.clubRecommendations).mockRejectedValue(new ApiError('Çok fazla istek', 'rate', 429))
    renderPage()
    const s = await section()
    expect(await s.findByText('Kulüp önerileri alınamadı.')).toBeInTheDocument()
    expect(s.getByRole('button', { name: /Tekrar dene/ })).toBeInTheDocument()
  })
})

describe('Yeni kariyer (v3)', () => {
  it('kulüp seçilmeden oluşturulamaz; kulüp araması Takımlar ucuyla', async () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Kariyeri oluştur' })).toBeDisabled()
    await pickClub()
    expect(endpoints.clubs).toHaveBeenCalledWith('Crewe')
    expect(screen.getByRole('button', { name: 'Kariyeri oluştur' })).toBeEnabled()
  })

  it('bütçe boşsa 0 gönderilmez (bilinmiyor, ENG-02); oluşturunca aktif kariyer olur ve Masa açılır', async () => {
    renderPage()
    await pickClub()
    fireEvent.click(screen.getByRole('button', { name: 'Kariyeri oluştur' }))
    await waitFor(() => expect(endpoints.createCareer).toHaveBeenCalled())
    const body = vi.mocked(endpoints.createCareer).mock.calls[0][0]
    expect(body).toEqual({ clubId: 9 })
    expect(body).not.toHaveProperty('budgetEur')
    expect(await screen.findByText('masa açıldı')).toBeInTheDocument()
    expect(careerStore.get()).toBe(42)
    expect(endpoints.updateCareer).not.toHaveBeenCalled()
  })

  it('bütçe, sezon ve oyun tarihi: bütçe/sezon oluşturmada, oyun tarihi ardından kariyere yazılır', async () => {
    renderPage()
    await pickClub()
    fireEvent.change(screen.getByLabelText('Transfer bütçesi'), { target: { value: '2,5' } })
    fireEvent.change(screen.getByLabelText('Sezon'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Oyun tarihi'), { target: { value: '2027-07-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kariyeri oluştur' }))
    await waitFor(() => expect(endpoints.createCareer).toHaveBeenCalledWith({ clubId: 9, budgetEur: 2_500_000, season: 2 }))
    await waitFor(() => expect(endpoints.updateCareer).toHaveBeenCalledWith(42, { gameDate: '2027-07-01' }))
    expect(await screen.findByText('masa açıldı')).toBeInTheDocument()
  })
})
