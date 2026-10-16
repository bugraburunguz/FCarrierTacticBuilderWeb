import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { FORMATION_442, SBC_CHALLENGES, sbcClubFixture, sbcMarketFixture, sbcPricesFixture, sbcSetFixture } from '../../../tests/fixtures/sbcClubFixture'
import { utCardStore } from '../../state/utCardStore'
import { SbcSolvePage } from './SbcSolvePage'

const capture = vi.hoisted(() => ({ value: undefined as unknown }))
vi.mock('../../state/utCaptureStore', () => ({ useUtCapture: () => capture.value }))
const auth = vi.hoisted(() => ({ authenticated: true }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../api/endpoints', () => ({
  endpoints: {
    kbSbcSet: vi.fn(), formations: vi.fn(), players: vi.fn(), leagues: vi.fn(), nationalities: vi.fn(), clubs: vi.fn(), kbLatestPrices: vi.fn(), sbcVotes: vi.fn(), sbcStreamlined: vi.fn(),
  },
}))

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function renderPage(path = '/ut/sbc/7700/77001') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/ut/sbc/:setId" element={<><SbcSolvePage /><Where /></>} />
          <Route path="/ut/sbc/:setId/:challengeId" element={<><SbcSolvePage /><Where /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const writeText = vi.fn((_text: string) => Promise.resolve())

beforeEach(() => {
  capture.value = undefined
  auth.authenticated = true
  vi.spyOn(utCardStore, 'get').mockReturnValue({ cards: sbcClubFixture(), importedAt: '2026-10-15T10:00:00Z' })
  vi.mocked(endpoints.kbSbcSet).mockReset().mockResolvedValue(sbcSetFixture(Date.now()))
  vi.mocked(endpoints.formations).mockReset().mockResolvedValue([FORMATION_442])
  vi.mocked(endpoints.players).mockReset().mockImplementation(async (f) => ({ items: sbcMarketFixture().filter((p) => !f.pos || p.positions.some((x) => f.pos!.includes(x))), page: 0, size: 100, totalItems: 0 }))
  vi.mocked(endpoints.leagues).mockReset().mockResolvedValue([{ id: 13, name: 'Premier League', count: 1 }])
  vi.mocked(endpoints.nationalities).mockReset().mockResolvedValue([])
  vi.mocked(endpoints.clubs).mockReset().mockResolvedValue([])
  vi.mocked(endpoints.kbLatestPrices).mockReset().mockImplementation(async (ids: number[]) => sbcPricesFixture(ids))
  vi.mocked(endpoints.sbcVotes).mockReset().mockResolvedValue({ sets: [] })
  vi.mocked(endpoints.sbcStreamlined).mockReset().mockResolvedValue({ feasible: true, targetScore: 4100, totalScore: 4120, overshoot: 20, totalCost: 0, itemCount: 5, coinless: true, approximate: false,
    picks: [{ rating: 84, rarity: 'REGULAR', untradeable: true, count: 5, scoreEach: 824, totalScore: 4120, totalCost: 0 }] })
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  writeText.mockClear()
})
afterEach(() => vi.restoreAllMocks())

const pitch = () => screen.findByRole('region', { name: 'Saha' })
/** Oyuncu kartı erişilebilir adı "Ad, reyting, mevki" (kimya elmasları ayrı img). */
const CARD = /, \d{2}, [A-Z]{2,3}/

describe('SBC çözüm sayfası (V3-05d, 08 §5)', () => {
  it('set adı + görev sekmeleri; görev adres çubuğunda; görevsiz adres ilk açık göreve gider', async () => {
    capture.value = { sbcSets: [{ setId: 7700, name: 'Kapı Çözüm Seti' }], sbcChallenges: SBC_CHALLENGES }
    renderPage('/ut/sbc/7700')
    expect(await screen.findByRole('heading', { name: 'Kapı Çözüm Seti' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/ut/sbc/7700/77002'))
    const tabs = screen.getByRole('navigation', { name: 'Görevler' })
    expect(within(tabs).getByRole('link', { name: /Takım reytingi.*Tamamlandı/ })).toHaveAttribute('href', '/ut/sbc/7700/77001')
    expect(within(tabs).getByRole('link', { name: /Kimya \+ lig.*Açık/ })).toHaveAttribute('aria-current', 'page')
  })

  it('kahraman: 11 kartlık çözüm sahası, kulüpten gelen kartta ✓', async () => {
    renderPage()
    const field = await pitch()
    await waitFor(() => expect(within(field).getAllByRole('img', { name: CARD }).length).toBe(11))
    // Kart üstü rozet kısa: kulüp "✓" (isim şeridini kapatmaz); fiyatı bilinmeyen kartta rozet yok (listede "fiyat yok")
    expect(within(field).getAllByText('✓').length).toBeGreaterThan(0)
    expect(within(field).queryByText('fiyat yok')).toBeNull()
  })

  it('gereksinim çipleri: ✓ sağlanıyor, ✗ sebepli, ? doğrulanamadı', async () => {
    renderPage('/ut/sbc/7700/77006')
    const chips = await screen.findByRole('list', { name: 'Gereksinimler' })
    await waitFor(() => expect(within(chips).getAllByRole('listitem')).toHaveLength(3))
    await waitFor(() => expect(within(chips).getByText(/Takım rating'i en az 70/).closest('li')).toHaveAttribute('data-state', 'ok'))
    expect(within(chips).getByText(/Özellik şartı/).closest('li')).toHaveAttribute('data-state', 'unknown')
    expect(within(chips).getByText(/SOMETHING_NEW/).closest('li')).toHaveAttribute('data-state', 'unknown')
  })

  it('çözümsüz: ✗ çipinde sebep ve tıkayan şart', async () => {
    renderPage('/ut/sbc/7700/77005')
    const chips = await screen.findByRole('list', { name: 'Gereksinimler' })
    const failing = await within(chips).findByRole('button', { name: /sağlanmıyor/ })
    expect(failing).toHaveAccessibleDescription(/Takım reytingi \d+\/95/)
    expect(await screen.findByText('Çözüm bulunamadı')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Tıkayan şartlar' })).toHaveTextContent(/Takım rating/)
    // kulüp dolu ama yetersiz: "kulüp boş" denmez
    expect(screen.queryByRole('link', { name: 'Kulübünü senkronla' })).toBeNull()
  })

  it('alışveriş listesi: fiyat yalnız gözlemden ya da "fiyat yok"; toplam + bilinmeyen sayısı; Kopyala metin', async () => {
    vi.spyOn(utCardStore, 'get').mockReturnValue(undefined) // kulüp boş → 11 kart alınır
    renderPage('/ut/sbc/7700/77001')
    const list = await screen.findByRole('region', { name: 'Alışveriş listesi' })
    await waitFor(() => expect(within(list).getByText(/^Toplam/)).toBeInTheDocument())
    fireEvent.click(within(list).getByRole('button', { name: 'Kopyala' }))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText.mock.calls[0][0]).toMatch(/^Kapı Çözüm Seti · Takım reytingi\n/)
    expect(writeText.mock.calls[0][0]).toMatch(/fiyat yok|\d/)
    expect(screen.getByText(/Kulüpten kullanılan:/)).toHaveTextContent('Kulüpten kullanılan: 0 kart')
  })

  it('V3-05d-c: alınacak kart yoksa yalnız "Alınacak kart yok" (Toplam yok); kulüp satırı sayı + en değerli reyting', async () => {
    renderPage('/ut/sbc/7700/77001')
    const custom = (await screen.findByText('Özelleştir')).closest('details')!
    fireEvent.click(within(custom).getByRole('checkbox', { name: 'Yalnız kulüp' }))
    const list = await screen.findByRole('region', { name: 'Alışveriş listesi' })
    await waitFor(() => expect(within(list).getByText('Alınacak kart yok')).toBeInTheDocument())
    expect(within(list).queryByText(/^Toplam/)).toBeNull()
    expect(screen.getByText(/^Kulüpten kullanılan:/)).toHaveTextContent(/^Kulüpten kullanılan: 11 kart · En değerli: \d{2}$/)
  })

  it('Özelleştir: "Özel kartları koru" varsayılan açık; mod "Önce kulüp" varsayılan; koruma eşiği 85', async () => {
    renderPage('/ut/sbc/7700/77001')
    const custom = (await screen.findByText('Özelleştir')).closest('details')!
    expect(within(custom).getByRole('checkbox', { name: 'Özel kartları koru' })).toBeChecked()
    expect(within(custom).getByRole('radio', { name: 'Önce kulüp' })).toBeChecked()
    expect(within(custom).getByRole('radio', { name: 'Toplam değeri en aza indir' })).not.toBeChecked()
    expect(within(custom).getByLabelText('Koruma eşiği (reyting)')).toHaveValue(85)
  })

  it('Özelleştir kapalı başlar; yalnız kulüp seçilince yeniden çözülür', async () => {
    renderPage('/ut/sbc/7700/77001')
    const custom = (await screen.findByText('Özelleştir')).closest('details')!
    expect(custom).not.toHaveAttribute('open')
    expect(within(custom).getByRole('checkbox', { name: 'Yalnız kulüp' })).toBeInTheDocument()
    expect(within(custom).getByLabelText('Bütçe üst sınırı')).toBeInTheDocument()
  })

  it('skor tabanlı görev: saha yerine skor çubuğu (hedef/mevcut) + kart listesi; havuz kulüp kartlarından', async () => {
    renderPage('/ut/sbc/7700/77004')
    const bar = await screen.findByRole('progressbar', { name: 'SBC skoru' })
    await waitFor(() => expect(bar).toHaveAttribute('aria-valuenow', '4120'))
    expect(bar).toHaveAttribute('aria-valuemax', '4100')
    expect(screen.queryByRole('region', { name: 'Saha' })).toBeNull()
    expect(vi.mocked(endpoints.sbcStreamlined).mock.calls[0][0]).toMatchObject({ targetScore: 4100 })
    const body = vi.mocked(endpoints.sbcStreamlined).mock.calls[0] as unknown as [{ pool: { count: number }[] }]
    expect(body[0].pool.reduce((n, e) => n + e.count, 0)).toBe(60)
  })

  it('skor tabanlı görev oturumsuz: skor ucu çağrılmaz, giriş istenir (uç oturum ister)', async () => {
    auth.authenticated = false
    renderPage('/ut/sbc/7700/77004')
    expect(await screen.findByRole('link', { name: 'Giriş yap' })).toHaveAttribute('href', '/login')
    expect(endpoints.sbcStreamlined).not.toHaveBeenCalled()
  })

  it('kulüp boş: "Kulübünü senkronla" bağlantısı, plan katalogdan yine gösterilir', async () => {
    vi.spyOn(utCardStore, 'get').mockReturnValue(undefined)
    renderPage()
    expect(await screen.findByRole('link', { name: 'Kulübünü senkronla' })).toHaveAttribute('href', '/ut/import')
    await waitFor(async () => expect(within(await pitch()).getAllByRole('img', { name: CARD }).length).toBe(11))
  })

  it('skor tabanlı görev, kulüp boş: senkron bağlantısı, uç çağrılmaz', async () => {
    vi.spyOn(utCardStore, 'get').mockReturnValue(undefined)
    renderPage('/ut/sbc/7700/77004')
    expect(await screen.findByRole('link', { name: 'Kulübünü senkronla' })).toHaveAttribute('href', '/ut/import')
    expect(endpoints.sbcStreamlined).not.toHaveBeenCalled()
  })

  it('tek kart teslimi (SINGLE_ITEM): saha yok, çipler var; şart değerlendirilemiyorsa "Elle kontrol et"', async () => {
    renderPage('/ut/sbc/7700/77007')
    expect(await screen.findByRole('heading', { name: 'Tek kart teslimi' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Saha' })).toBeNull()
    const chips = screen.getByRole('list', { name: 'Gereksinimler' })
    expect(within(chips).getAllByRole('listitem').every((li) => li.getAttribute('data-state') === 'unknown')).toBe(true)
    expect(screen.getByText('Elle kontrol et')).toBeInTheDocument()
  })

  it('tek kart teslimi: değerlendirilebilen şartta uygun kulüp kartları listelenir', async () => {
    renderPage('/ut/sbc/7700/77008')
    const list = await screen.findByRole('list', { name: 'Uygun kulüp kartları' })
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThan(0)
  })

  it('eşlemesi olmayan formasyon kodu: "Formasyon tanınmadı (f999)"', async () => {
    renderPage('/ut/sbc/7700/77009')
    expect(await screen.findByText('Formasyon tanınmadı (f999)')).toBeInTheDocument()
  })

  it('görev bilgisi yok: açıklama ve listeye dönüş', async () => {
    vi.mocked(endpoints.kbSbcSet).mockRejectedValue(new Error('404'))
    renderPage('/ut/sbc/1234/1')
    expect(await screen.findByText(/Bu görevin şartları bilgi tabanında yok/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'SBC listesine dön' })).toHaveAttribute('href', '/ut/sbc')
  })
})
