import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayerContract, PlayerDetail, PlayerRoleFit } from '../../api/types'
import { CAREER_ROLES_HELP } from '../../lib/fitLabels'
import { ratingBlend } from '../../lib/ratingTone'
import { CareerPlayerPage } from './CareerPlayerPage'

vi.mock('../../api/endpoints', () => ({
  endpoints: { player: vi.fn(), playerRoles: vi.fn(), playerContract: vi.fn(), playerFacets: vi.fn(), development: vi.fn(), playerHistory: vi.fn(() => Promise.resolve([])),
    positionAdvice: vi.fn(() => Promise.resolve([{ playerId: 7, playerName: 'Ollie Watkins', listedPositions: ['ST'], ownPositionBest: false, bestOverallPosition: 'ST', bestOverall: 72,
      best: [{ position: 'CAM', roleName: 'Shadow Striker (Attack)', score: 74, natural: false }], sideReason: null,
      conversion: { position: 'CAM', roleName: 'Shadow Striker (Attack)', strength: 74, fromPosition: 'ST', fromRoleName: 'Poacher (Attack)', fromStrength: 68,
        text: "ST listeli ama CAM'de daha etkili: CAM · Shadow Striker gücü 74, ST · Poacher 68. CAM mevki planı önerilir." } }])),
    shortlist: vi.fn(() => Promise.resolve([])), shortlistAdd: vi.fn(() => Promise.resolve()), shortlistRemove: vi.fn(() => Promise.resolve()),
    playerMatches: vi.fn(() => Promise.resolve({ ratings: [{ date: '2027-01-10', minutes: 90, position: 25, rating: 8 }], seasons: [] })) },
}))

const CAREER = 4

const detail = (over: Partial<PlayerDetail['summary']> = {}): PlayerDetail => ({
  summary: { id: 7, name: 'Ollie Watkins', age: 22, overall: 72, potential: 84, positions: ['ST', 'CF'], club: 'Crewe', league: 'League Two', nationality: 'England', valuationEstimated: false, ...over },
  weakFoot: 3, skillMoves: 4, preferredFoot: 'Left', attrs: { Finishing: 78, Acceleration: 80 }, playstyles: {},
})

const role = (over: Partial<PlayerRoleFit>): PlayerRoleFit => ({
  position: 'ST', roleId: 'advanced_forward_attack', roleName: 'Advanced Forward (Attack)', score: 80, projectedRating: 72, badgeText: '', reasons: [], gaps: [], engineVersion: 'v3',
  currentFit: 80, levelFit: 90, fitLabel: 'GOOD',
  narrative: { headline: 'Ligine göre çok iyi.', tailored: true, strengths: [], weaknesses: [] }, ...over,
})

const contract = (over: Partial<CareerPlayerContract> = {}): CareerPlayerContract => ({
  inSquad: false, onLoan: false, valuationEstimated: true, valueEur: 1_500_000, wageEur: 12_000, releaseClauseEur: 5_000_000,
  contractUntil: '2027-08-15', gameDate: '2027-01-15', monthsLeft: 7, feasibility: 'ZOR', budgetEur: 2_000_000, budgetAfterPurchaseEur: 500_000, ...over,
})

function Where() {
  return <p data-testid="where">{useLocation().search}</p>
}

function renderPage(path = '/players/7') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/players/:id" element={<><CareerPlayerPage careerId={CAREER} /><Where /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(endpoints.player).mockReset().mockResolvedValue(detail())
  vi.mocked(endpoints.playerRoles).mockReset().mockResolvedValue([role({}), role({ roleId: 'poacher_attack', roleName: 'Poacher (Attack)', levelFit: 50, fitLabel: 'AT_LEVEL', narrative: undefined })])
  vi.mocked(endpoints.playerContract).mockReset().mockResolvedValue(contract())
  vi.mocked(endpoints.playerFacets).mockReset().mockResolvedValue({ contractData: false, loanData: false, leagueName: 'EFL League Two', leagueOvr: 64 })
  vi.mocked(endpoints.development).mockReset()
})

describe('FCA-3 Parça 6: oyuncu profili', () => {
  it('oyuncu adı başlığı olduğu gibi; statlar sekmesinde çubuk rengi kesintisiz kırmızı → amber → yeşil (color-mix)', async () => {
    renderPage('/players/7?sekme=statlar')
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Ollie Watkins' })
    // Oyuncu adı büyük harfe çevrilmez: tek dil kuralı her adı bozar (tr: Mickey → MİCKEY; en: Merih → MERIH).
    expect(h1).not.toHaveClass('page-title')
    expect(h1).not.toHaveAttribute('lang')
    const bars = [...document.querySelectorAll<HTMLElement>('[data-attr-bar]')]
    expect(bars.length).toBeGreaterThan(0)
    bars.forEach((b) => expect(b.style.background).toMatch(/var\(--rate-(low|60|90)\)/))
  })
})

describe('FCA-4d: Roller sekmesinde mevkiye göre OVR sahası', () => {
  it('her mevki sahada OVR kutusuyla; en yüksek ve listelenen mevki metinle; tek mevkili veride saha yok', async () => {
    vi.mocked(endpoints.player).mockResolvedValue({ ...detail(), positionOveralls: { ST: 72, CAM: 70, LW: 66, CM: 61 } } as never)
    const { unmount } = renderPage('/players/7?sekme=roller')
    const pitch = await screen.findByRole('list', { name: 'Mevkiye göre OVR' })
    const items = within(pitch).getAllByRole('listitem')
    expect(items.map((i) => i.getAttribute('aria-label'))).toEqual([
      'ST: OVR 72, en yüksek, listelenen mevki', 'CAM: OVR 70', 'LW: OVR 66', 'CM: OVR 61',
    ])
    expect(within(items[0]).getByText('72')).toBeInTheDocument()
    expect(items[0]).toHaveAttribute('data-gap', 'best')
    expect(items[2]).toHaveAttribute('data-gap', 'ok')
    expect(items[3]).toHaveAttribute('data-gap', 'far')
    unmount()
    vi.mocked(endpoints.player).mockResolvedValue({ ...detail(), positionOveralls: { ST: 72 } } as never)
    renderPage('/players/7?sekme=roller')
    await screen.findByRole('heading', { level: 1, name: 'Ollie Watkins' })
    expect(screen.queryByRole('list', { name: 'Mevkiye göre OVR' })).toBeNull()
  })
})

describe('1–99 kesintisiz renk (ratingBlend)', () => {
  it.each([
    [1, 'var(--rate-low)'], [30, 'color-mix(in oklab, var(--rate-60) 59%, var(--rate-low))'], [50, 'var(--rate-60)'],
    [65, 'color-mix(in oklab, var(--rate-90) 50%, var(--rate-60))'], [80, 'var(--rate-90)'], [99, 'var(--rate-90)'],
  ])('%i → %s', (value, expected) => {
    expect(ratingBlend(value)).toBe(expected)
  })
})

describe('kariyer oyuncu sayfası (v3 Detay)', () => {
  it('kariyerin verisiyle başlık, kart yanında OVR ve POT, yaş/ayak/zayıf ayak/hareket/mevkiler', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Ollie Watkins' })).toBeInTheDocument()
    expect(endpoints.player).toHaveBeenCalledWith(7, CAREER)
    const card = screen.getByRole('region', { name: 'Kart' })
    expect(within(card).getByText('POT')).toBeInTheDocument()
    expect(within(card).getByText('84')).toBeInTheDocument()
    expect(within(card).getByText('Yaş')).toBeInTheDocument()
    expect(within(card).getByText('Sol')).toBeInTheDocument()
    expect(within(card).getByText('Zayıf ayak')).toBeInTheDocument()
    expect(within(card).getByText('Hareket')).toBeInTheDocument()
    expect(within(card).getByText('CF')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: /Karşılaştır/ })).toBeInTheDocument()
  })

  it('KARIYER-UX FAZ 5: kadroda değilse "Kısa listeye ekle" (ortak ShortlistButton); kadrodaysa yok', async () => {
    const { unmount } = renderPage()
    const add = await screen.findByRole('button', { name: 'Kısa listeye ekle' })
    await waitFor(() => expect(add).toBeEnabled())
    fireEvent.click(add)
    await waitFor(() => expect(endpoints.shortlistAdd).toHaveBeenCalledWith(CAREER, 7, {}))
    unmount()
    vi.mocked(endpoints.playerContract).mockResolvedValue(contract({ inSquad: true }))
    renderPage()
    await screen.findByText('Kadronda')
    expect(screen.queryByRole('button', { name: 'Kısa listeye ekle' })).toBeNull()
  })

  it('KARIYER-UX 6: Statlar sekmesinde profil radarı (ortak AttributeRadar, metin tablosuyla) öznitelik gruplarının üstünde', async () => {
    renderPage()
    const radar = await screen.findByRole('img', { name: /Profil radarı: Ollie Watkins/ })
    expect(screen.getByRole('table', { name: 'Profil değerleri' })).toBeInTheDocument()
    const order = [radar, screen.getByRole('region', { name: 'Hız' })]
    expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('dört sekme; sekme adres çubuğunda (?sekme=), doğrudan adresle açılır', async () => {
    renderPage()
    const tabs = await screen.findAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Statlar', 'Roller', 'Gelişim', 'Sözleşme ve değer', 'Maçlar'])
    fireEvent.click(screen.getByRole('tab', { name: 'Roller' }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toContain('sekme=roller'))
    fireEvent.click(screen.getByRole('tab', { name: 'Statlar' }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe(''))
  })

  it('FCA-22: Maçlar sekmesi adresle açılır ve oyuncunun maç notlarını gösterir', async () => {
    renderPage('/players/7?sekme=maclar')
    expect(await screen.findByRole('list', { name: 'Maç notları' })).toBeInTheDocument()
    expect(endpoints.playerMatches).toHaveBeenCalledWith(CAREER, 7)
  })

  it('Roller: kariyer motoru v3 kariyerle istenir; tek yardım fitLabels\'teki "kendi seviyesindeki" metni (lig referans satırı yok)', async () => {
    renderPage('/players/7?sekme=roller')
    expect(await screen.findByText('Advanced Forward (Attack)')).toBeInTheDocument()
    expect(endpoints.playerRoles).toHaveBeenCalledWith(7, CAREER, 'v3')
    expect(vi.mocked(endpoints.playerRoles).mock.calls.every((c) => c[2] === 'v3')).toBe(true)
    expect(endpoints.development).not.toHaveBeenCalled()
    const panel = screen.getByRole('tabpanel')
    const notes = within(panel).getAllByRole('note')
    expect(notes).toHaveLength(1)
    // FIT-1: kariyerde iki metrik kariyer adlarıyla (Rol oturması, Güç).
    expect(notes[0]).toHaveTextContent(CAREER_ROLES_HELP.badge)
    expect(notes[0]).toHaveTextContent(CAREER_ROLES_HELP.rolePoints)
    expect(within(panel).getAllByText(/^Güç \d+$/).length).toBeGreaterThan(0)
    expect(within(panel).getAllByRole('img', { name: /Rol oturması %\d+/ }).length).toBeGreaterThan(0)
    expect(within(panel).queryByText(/Seviye referansı/)).toBeNull()
    expect(within(panel).getAllByText('Biçilmiş kaftan')).toHaveLength(1)
    expect(within(panel).getByText('Neden?')).toBeInTheDocument()
  })

  it('FIT-3 madde 12: Roller\'de rol bazlı en iyi mevki ve dönüşüm önerisi; plan seçenekleri Gelişim sayfasına bağlanır', async () => {
    renderPage('/players/7?sekme=roller')
    const box = await screen.findByRole('region', { name: 'Rol bazlı mevki önerisi' })
    expect(within(box).getByText("ST listeli ama CAM'de daha etkili: CAM · Shadow Striker gücü 74, ST · Poacher 68. CAM mevki planı önerilir.")).toBeInTheDocument()
    expect(within(box).getByText(/Rol bazlı en iyi: CAM · Shadow Striker \(Attack\) · Güç 74/)).toBeInTheDocument()
    expect(within(box).getByRole('link', { name: /Plan seçenekleri/ })).toHaveAttribute('href', '/career/growth?oyuncu=7')
    expect(endpoints.positionAdvice).toHaveBeenCalledWith(CAREER)
  })

  it('Roller: <480px\'te rol adı kendi satırında (kısaltılmaz), çip ve rozet alt satırda (ortak RoleRow)', async () => {
    renderPage('/players/7?sekme=roller')
    const name = await screen.findByText('Advanced Forward (Attack)')
    expect(name.className).toContain('max-[479px]:basis-full')
    expect(name.className).toContain('max-[479px]:whitespace-normal')
  })

  it('Lig seviyesi: başlıkta nötr çip + yardım (lig gücü biliniyorsa); bilinmiyorsa yok', async () => {
    const view = renderPage()
    await screen.findByRole('heading', { name: 'Ollie Watkins' })
    expect(await screen.findByText('Ligin üstünde (+8)')).toBeInTheDocument()
    expect(screen.getByText('Oyuncunun OVR\'ı, kariyerindeki ligin ortalama seviyesiyle karşılaştırılır.')).toBeInTheDocument()
    view.unmount()
    vi.mocked(endpoints.playerFacets).mockResolvedValue({ contractData: false, loanData: false })
    renderPage()
    await screen.findByRole('heading', { name: 'Ollie Watkins' })
    await waitFor(() => expect(endpoints.playerFacets).toHaveBeenCalledTimes(2))
    expect(screen.queryByText(/Ligin|Lig seviyesinde/)).toBeNull()
  })

  it('FIT-3: başlık rozetleri (Kadronda + Lig seviyesi yardımı) geçerli DOM iç içeliğiyle; konsolda nesting hatası yok', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(endpoints.playerContract).mockResolvedValue(contract({ inSquad: true }))
    renderPage()
    await screen.findByText('Ligin üstünde (+8)')
    await screen.findByText('Kadronda')
    const nesting = error.mock.calls.filter((args) => args.some((a) => typeof a === 'string' && /cannot be a descendant of|cannot contain a nested|validateDOMNesting/.test(a)))
    error.mockRestore()
    expect(nesting).toEqual([])
    const header = screen.getByRole('heading', { name: 'Ollie Watkins' }).closest('header')!
    expect(header.querySelector('p p, p details, summary p')).toBeNull()
  })

  it('Sözleşme: kalan ay oyun tarihine göre, tahmini değer ≈, kova ve alım sonrası bütçe', async () => {
    renderPage('/players/7?sekme=sozlesme')
    const panel = await screen.findByRole('tabpanel')
    await within(panel).findByText('Piyasa değeri')
    expect(within(panel).getByText(/^≈/)).toBeInTheDocument()
    expect(within(panel).getByText(/7 ay kaldı/)).toBeInTheDocument()
    expect(within(panel).getByText(/oyun tarihi 15\.01\.2027/)).toBeInTheDocument()
    expect(within(panel).getByText('Maaş')).toBeInTheDocument()
    expect(within(panel).getByText('Serbest bırakma bedeli')).toBeInTheDocument()
    expect(within(panel).getByText('Zor')).toBeInTheDocument()
    expect(within(panel).getByText('Alım sonrası bütçe')).toBeInTheDocument()
  })

  it('Sözleşme: bütçe bilinmiyorsa bütçe satırı yok; veri olmayan alan gösterilmez (0 yazılmaz)', async () => {
    vi.mocked(endpoints.playerContract).mockResolvedValue({ inSquad: false, onLoan: false, valuationEstimated: false, feasibility: 'ALINABILIR' })
    renderPage('/players/7?sekme=sozlesme')
    const panel = await screen.findByRole('tabpanel')
    await within(panel).findByText('Ulaşılabilirlik')
    for (const label of ['Alım sonrası bütçe', 'Maaş', 'Piyasa değeri', 'Sözleşme bitişi', 'Serbest bırakma bedeli']) {
      expect(within(panel).queryByText(label)).toBeNull()
    }
    expect(within(panel).queryByText(/€0/)).toBeNull()
  })

  it('kadrodaysa "Kadronda" rozeti; değilse yok', async () => {
    vi.mocked(endpoints.playerContract).mockResolvedValue(contract({ inSquad: true, feasibility: undefined, budgetAfterPurchaseEur: undefined }))
    const view = renderPage()
    expect(await screen.findByText('Kadronda')).toBeInTheDocument()
    view.unmount()
    vi.mocked(endpoints.playerContract).mockResolvedValue(contract())
    renderPage()
    await screen.findByRole('heading', { name: 'Ollie Watkins' })
    await waitFor(() => expect(endpoints.playerContract).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Kadronda')).toBeNull()
  })

  it('bizden kiralık giden oyuncu "Kadronda" değil "Kiralıkta"; sözleşmede "Kiralık verildi"', async () => {
    vi.mocked(endpoints.playerContract).mockResolvedValue(contract({ inSquad: true, onLoan: true, loanedOut: true, feasibility: undefined, budgetAfterPurchaseEur: undefined }))
    renderPage()
    expect(await screen.findByText('Kiralıkta')).toBeInTheDocument()
    expect(screen.queryByText('Kadronda')).toBeNull()
  })

  it('Gelişim: OVR→POT ve gelişim payı mevcut veriden; projeksiyon ucu yok, eski gelişim ucu çağrılmaz', async () => {
    renderPage('/players/7?sekme=gelisim')
    const panel = await screen.findByRole('tabpanel')
    expect(await within(panel).findByText('+12')).toBeInTheDocument()
    expect(within(panel).getByText(/72 → 84/)).toBeInTheDocument()
    expect(within(panel).queryByText(/Projeksiyon/)).toBeNull()
    expect(endpoints.development).not.toHaveBeenCalled()
  })

  it('ACADEMY-b: Gelişim sekmesinde OVR/POT geçmiş grafiği (Gelişim sayfasından taşındı); kadro dışı oyuncuda grafik yok', async () => {
    vi.mocked(endpoints.playerContract).mockResolvedValue(contract({ inSquad: true, feasibility: undefined, budgetAfterPurchaseEur: undefined }))
    vi.mocked(endpoints.playerHistory).mockResolvedValue([
      { snapshotId: 1, takenAt: '2026-10-01T10:00:00Z', overall: 70, potential: 84, gameDate: '2027-01-15' },
      { snapshotId: 2, takenAt: '2026-10-02T10:00:00Z', overall: 72, potential: 84, gameDate: '2027-03-16' },
    ] as never)
    renderPage('/players/7?sekme=gelisim')
    const panel = await screen.findByRole('tabpanel')
    const history = await within(panel).findByRole('region', { name: 'OVR geçmişi' })
    expect(await within(history).findByRole('img', { name: /OVR/ })).toBeInTheDocument()
    expect(endpoints.playerHistory).toHaveBeenCalledWith(CAREER, 7)
  })

  it('ACADEMY-b: tek içe aktarmada grafik yerine kısa not', async () => {
    vi.mocked(endpoints.playerContract).mockResolvedValue(contract({ inSquad: true, feasibility: undefined, budgetAfterPurchaseEur: undefined }))
    vi.mocked(endpoints.playerHistory).mockResolvedValue([{ snapshotId: 1, takenAt: '2026-10-01T10:00:00Z', overall: 72, potential: 84 }] as never)
    renderPage('/players/7?sekme=gelisim')
    const panel = await screen.findByRole('tabpanel')
    expect(await within(panel).findByText('Grafik ikinci içe aktarmadan sonra görünür.')).toBeInTheDocument()
  })

  it('kaleci: Statlar yalnız kaleci grubu', async () => {
    vi.mocked(endpoints.player).mockResolvedValue({ ...detail({ positions: ['GK'] }), attrs: { GKDiving: 70, Finishing: 10 } })
    renderPage()
    expect(await screen.findByRole('region', { name: 'Kaleci' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Şut' })).toBeNull()
  })
})
