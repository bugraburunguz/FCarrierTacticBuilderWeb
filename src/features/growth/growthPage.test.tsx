import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AcademyPlayer } from '../../api/types'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { GrowthPage } from './GrowthPage'

const mobile = vi.hoisted(() => ({ value: false }))
vi.mock('../../design/components/MobileSheet', async (orig) => ({ ...(await orig<object>()), useIsMobile: () => mobile.value }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: 'FREE' } }) }))
vi.mock('../../api/endpoints', () => ({
  endpoints: { careers: vi.fn(), squad: vi.fn(), snapshots: vi.fn(), snapshotDiff: vi.fn(), playerHistory: vi.fn(), youth: vi.fn(), training: vi.fn(), youthDetail: vi.fn(), development: vi.fn(), growthRecent: vi.fn() },
}))

const member = (id: number, extra: object = {}) => ({ player: { id, name: `Oyuncu ${id}`, positions: ['CM'], overall: 60 + id, potential: 75, age: 25, valuationEstimated: false, ...extra }, onLoan: false })
const snap = (id: number, season?: number) => ({ id, takenAt: `2026-10-0${id}T10:00:00Z`, season, source: 'IMPORT', playerCount: 3 })
const youth = (id: number, extra: Partial<AcademyPlayer> = {}): AcademyPlayer => ({
  playerId: id, name: `Genç ${id}`, age: 19, positions: ['CM'], overall: 62, potential: 84, potentialRange: null, youthVerified: false, bestPosition: 'CM',
  conversionPosition: 'CDM', plan: { name: 'Deep-Lying Playmaker', label: 'CDM · Deep-Lying Playmaker', text: 'Genç · CDM planı → 2 sezonda CDM gücü 70 (Dengeli: 67)', balanced: false },
  promote: null, status: null, loanedOut: false, ageGroup: 'YOUTH', ...extra,
})
const VETERAN = youth(21, {
  name: 'Vardy', age: 34, overall: 80, potential: 80, conversionPosition: null, bestPosition: 'ST', ageGroup: 'VETERAN',
  plan: { name: 'Poacher', label: 'ST · Poacher', text: 'Vardy · Plansız tahmini −3 OVR / −2,6 Güç, ST · Poacher planıyla −1 OVR / −1,2 Güç (bitiricilik ve pozisyon alma korunur) · tahmin', balanced: false },
})
const PEAK = youth(31, {
  name: 'Okafor', age: 26, overall: 74, potential: 76, conversionPosition: null, ageGroup: 'PEAK',
  plan: { name: 'Dengeli', label: 'Dengeli', text: 'Okafor · Dengeli plan: CM Box-to-Box rolünde oturması iyi (%71)', balanced: true },
})

function Where() {
  const l = useLocation()
  return <p data-testid="where">{l.pathname + l.search}</p>
}

function renderPage(path = '/career/growth') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/career/growth" element={<GrowthPage />} />
          <Route path="*" element={null} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mobile.value = false
  careerStore.set(1)
  vi.mocked(endpoints.careers).mockResolvedValue([{ id: 1, clubName: 'Crewe', gameVersionId: 27, clubId: 9, squadSize: 3 }] as never)
  vi.mocked(endpoints.squad).mockResolvedValue([member(1), member(2, { overall: 75, potential: 75, age: 21 }), member(3)] as never)
  vi.mocked(endpoints.snapshots).mockResolvedValue([snap(3, 2), snap(2, 2), snap(1, 1)] as never)
  vi.mocked(endpoints.training).mockResolvedValue([youth(11, { name: 'Figueiredo', age: 18 }), youth(12, { name: 'Kiralık Genç', loanedOut: true, conversionPosition: null }), PEAK, VETERAN])
  vi.mocked(endpoints.growthRecent).mockReset().mockResolvedValue([])
  vi.mocked(endpoints.youthDetail).mockResolvedValue({ playerId: 11, name: 'Figueiredo', positions: ['CM'], academy: false,
    advice: { sentence: 'CDM · Deep-Lying Playmaker planını seç: 2 sezonda CDM OVR 70 (Dengeli 67).', estimated: true, plans: [{ label: 'Dengeli', kind: 'GENERAL', position: 'CDM', overall1: 64, overall2: 67 }] },
    position: { bestPosition: 'CM', listedPositions: ['CM'] }, team: { position: 'CDM', source: 'MAIN', slots: 1, strengths: [60, 64, 68] } })
  vi.mocked(endpoints.snapshotDiff).mockReset().mockResolvedValue({ changed: 4, transfers: 0, added: 0, removed: 0, rows: [
    { playerId: 1, name: 'Oyuncu 1', kind: 'CHANGED', overallFrom: 58, overallTo: 61 },
    { playerId: 3, name: 'Oyuncu 3', kind: 'CHANGED', overallFrom: 64, overallTo: 63 },
    { playerId: 2, name: 'Oyuncu 2', kind: 'CHANGED', overallFrom: 70, overallTo: 75 },
    // Kadroda olmayan (başka takım) satırı listede yok.
    { playerId: 99, name: 'Yabancı', kind: 'CHANGED', overallFrom: 50, overallTo: 60 },
  ] } as never)
})

/** ACADEMY-b §3: "Kadromdaki gençler doğru gelişiyor mu?" — gelişim planları + son içe aktarmadan beri düz liste; seçici ve grafik yok. */
describe('Gelişim (sade)', () => {
  it('GTR-b: önceki anlık görüntü varsa satırda "Son N ayda" (maç bilinmiyorsa yalnız OVR); yoksa satır yok', async () => {
    vi.mocked(endpoints.growthRecent).mockResolvedValue([
      { playerId: 11, months: 3, overallDelta: 3, matches: 18 },
      { playerId: 21, months: 3, overallDelta: -2, matches: null },
      { playerId: 31, months: 1, overallDelta: 0, matches: 0 },
    ])
    renderPage()
    const youthRow = await screen.findByRole('button', { name: /Figueiredo/ })
    expect(await within(youthRow).findByText('Son 3 ayda: +3 OVR · 18 maç')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /Vardy/ })).getByText('Son 3 ayda: −2 OVR')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /Okafor/ })).getByText('Son 1 ayda: 0 OVR · 0 maç')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kiralık Genç/ })).not.toHaveTextContent(/Son \d+ ayda/)
    expect(endpoints.growthRecent).toHaveBeenCalledWith(1)
  })

  it('GTR-b: önceki görüntü yoksa (boş liste) ya da uç hata verirse satır görünmez, sayfa çalışır', async () => {
    vi.mocked(endpoints.growthRecent).mockRejectedValue(new Error('500'))
    renderPage()
    expect(await screen.findByRole('button', { name: /Figueiredo/ })).toBeInTheDocument()
    expect(screen.queryByText(/Son \d+ ayda/)).toBeNull()
  })

  it('oyuncu seçici ve geçmiş grafiği yok; geçmiş ucu çağrılmaz', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Gelişim' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('img', { name: /OVR geçmişi/ })).toBeNull()
    expect(endpoints.playerHistory).not.toHaveBeenCalled()
    expect(endpoints.development).not.toHaveBeenCalled()
  })

  it('gençler: Altyapı satır biçimi (A takım ≤ 23 + kiralıktaki gençler); tek içe aktarmayla da görünür', async () => {
    vi.mocked(endpoints.snapshots).mockResolvedValue([snap(1, 1)] as never)
    renderPage()
    const plans = await screen.findByRole('region', { name: 'Gençler' })
    const list = await within(plans).findByRole('list', { name: 'Gençler' })
    const row = within(list).getByRole('button', { name: /Figueiredo/ })
    expect(row).toHaveTextContent('CM → CDM önerilir')
    expect(row).toHaveTextContent('62 → 84')
    expect(row).toHaveTextContent('Önerilen plan: CDM · Deep-Lying Playmaker')
    expect(within(list).getByRole('button', { name: /Kiralık Genç/ })).toHaveTextContent('Kiralıkta')
    expect(endpoints.training).toHaveBeenCalledWith(1)
    expect(endpoints.youth).not.toHaveBeenCalled()
    // Tek içe aktarma: yalnız fark bölümü bekler.
    const since = screen.getByRole('region', { name: 'Son içe aktarmadan beri' })
    expect(within(since).getByText('İkinci içe aktarmadan sonra görünür.')).toBeInTheDocument()
    expect(endpoints.snapshotDiff).not.toHaveBeenCalled()
  })

  it('satır aynı paneli açar (?oyuncu=); Masa bağlantısı ?oyuncu= ile paneli açık getirir', async () => {
    renderPage('/career/growth?oyuncu=11')
    const panel = await screen.findByRole('complementary', { name: 'Figueiredo' })
    expect(await within(panel).findByRole('heading', { name: 'Ne yapmalıyım?' })).toBeInTheDocument()
    expect(within(panel).getByRole('list', { name: 'Plan karşılaştırması' })).toBeInTheDocument()
  })

  it('Masa "Süre ver ya da kirala" bağlantısı (?oyuncu=) plan listesinde olmayan kadro oyuncusu için de paneli açar', async () => {
    renderPage('/career/growth?oyuncu=3')
    expect(await screen.findByRole('complementary', { name: 'Oyuncu 3' })).toBeInTheDocument()
    expect(endpoints.youthDetail).toHaveBeenCalledWith(1, 3)
  })

  it('mobilde satır ayrı sayfayı açar, geri dönüş Gelişim', async () => {
    mobile.value = true
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Figueiredo/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('/career/academy/11?geri=gelisim')
  })

  it('son içe aktarmadan beri: düz liste ▲/▼, fark ve önce→şimdi; yalnız kadro; plato satır içinde', async () => {
    renderPage()
    const since = await screen.findByRole('region', { name: 'Son içe aktarmadan beri' })
    const items = (await within(since).findAllByRole('listitem')).map((li) => li.textContent)
    expect(items).toEqual(['▲ Oyuncu 2 +5 (70→75) ⚠ POT\'a ulaştı', '▲ Oyuncu 1 +3 (58→61)', '▼ Oyuncu 3 −1 (64→63)'])
    expect(since.textContent).not.toContain('Yabancı')
  })

  it('aralık seçici: Son iki içe aktarma | Sezon başı → şimdi (snapshotDiff from/to)', async () => {
    renderPage()
    const since = await screen.findByRole('region', { name: 'Son içe aktarmadan beri' })
    fireEvent.click(await within(since).findByRole('radio', { name: 'Sezon başı → şimdi' }))
    expect(await within(since).findAllByRole('listitem')).not.toHaveLength(0)
    expect(endpoints.snapshotDiff).toHaveBeenLastCalledWith(1, 2, 3)
  })

  /** GT-a madde 1: "Kadromdaki her oyuncuya hangi antrenmanı vermeliyim?" — yaşa göre üç bölüm, her satırda tek plan ve tek satır gerekçe. */
  it('tüm takım üç yaş bölümünde: Gençler, Zirve, Tecrübeliler; satırda tek satır gerekçe (ad tekrar edilmez)', async () => {
    renderPage()
    expect(await screen.findByText('Kadromdaki her oyuncuya hangi antrenmanı vermeliyim?')).toBeInTheDocument()
    await screen.findByRole('region', { name: 'Gençler' })
    const sections = screen.getAllByRole('region').map((r) => r.querySelector('h2')?.textContent)
    expect(sections).toEqual(['Gençler', 'Zirve', 'Tecrübeliler', 'Son içe aktarmadan beri'])
    const peak = within(screen.getByRole('region', { name: 'Zirve' }))
    expect(peak.getByText(/^24–29 yaş · rolde incelme ya da koruma/)).toBeInTheDocument()
    expect(peak.getByRole('button', { name: /Okafor/ })).toHaveTextContent('Dengeli plan: CM Box-to-Box rolünde oturması iyi (%71)')
    const veterans = within(screen.getByRole('region', { name: 'Tecrübeliler' }))
    const row = veterans.getByRole('button', { name: /Vardy/ })
    expect(row).toHaveTextContent('Önerilen plan: ST · Poacher')
    expect(row).toHaveTextContent('Plansız tahmini −3 OVR / −2,6 Güç, ST · Poacher planıyla −1 OVR / −1,2 Güç (bitiricilik ve pozisyon alma korunur) · tahmin')
    expect(row.textContent).not.toContain('Vardy · ')
    // Adı bilinmeyen oyuncu: sunucu metni ham adla başlar ("Oyuncu #…"); satırda o da tekrar edilmez.
    expect(peak.getByRole('button', { name: /Okafor/ }).textContent).not.toContain('Okafor · ')
    expect(within(screen.getByRole('region', { name: 'Gençler' })).queryByRole('button', { name: /Vardy|Okafor/ })).toBeNull()
  })

  it('gerekçe ham adla başlasa da (adı bilinmeyen oyuncu) satırda ad kırpılır', async () => {
    vi.mocked(endpoints.training).mockResolvedValue([{ ...VETERAN, name: 'Adı bilinmiyor', plan: { ...VETERAN.plan!, text: 'Oyuncu #202017 · Plansız tahmini −2 OVR / −5,3 Güç, LM mevki planıyla −1 OVR / −4,7 Güç · tahmin' } }])
    renderPage()
    const row = await within(await screen.findByRole('region', { name: 'Tecrübeliler' })).findByRole('button', { name: /Adı bilinmiyor/ })
    expect(row).toHaveTextContent('Plansız tahmini −2 OVR / −5,3 Güç, LM mevki planıyla −1 OVR / −4,7 Güç · tahmin')
    expect(row.textContent).not.toContain('Oyuncu #202017')
  })

  it('bir yaş bölümünde oyuncu yoksa kısa boş satır; hiç oyuncu yoksa tek boş durum', async () => {
    vi.mocked(endpoints.training).mockResolvedValue([VETERAN])
    renderPage()
    const youthSection = await screen.findByRole('region', { name: 'Gençler' })
    expect(await within(youthSection).findByText('Bu yaş bölümünde oyuncu yok.')).toBeInTheDocument()
  })

  it('kadroda plan önerilecek oyuncu yoksa boş durum', async () => {
    vi.mocked(endpoints.training).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('Antrenman planı önerilecek oyuncu yok. Kariyer içinden içe aktarınca dolar.')).toBeInTheDocument()
  })
})
