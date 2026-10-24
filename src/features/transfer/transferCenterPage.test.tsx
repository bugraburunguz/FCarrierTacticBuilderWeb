import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { lineupStore } from '../../state/lineupStore'
import { lineupFromFitRole } from '../../test/lineupFromFitRole'
import { TransferCenterPage } from './TransferCenterPage'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: 'PREMIUM', creditBalance: 17, dailyCreditLimit: 20 } }) }))
vi.mock('../../api/endpoints', () => {
  const none = () => Promise.resolve([])
  return {
    endpoints: {
      careers: vi.fn(), squad: vi.fn(), mainTactic: vi.fn(), starterTactic: vi.fn(), lineup: vi.fn(() => Promise.resolve({ slots: [] })), playerTags: vi.fn(), shortlist: vi.fn(), shortlistAdd: vi.fn(() => Promise.resolve()),
      shortlistRemove: vi.fn(() => Promise.resolve()), formations: vi.fn(), roles: none, eaRoles: none, resolveTactic: vi.fn(() => Promise.resolve({ formation: '4-3-3', slots: [] })),
      fitRole: vi.fn(), careerRecommendations: vi.fn(), creditCosts: vi.fn(() => Promise.resolve({ recommend: 3, squadFit: 5, advisor: 8 })), playerFacets: vi.fn(),
      recommendTactic: vi.fn(), previewSlot: vi.fn(), development: vi.fn(), fitSquad: vi.fn(),
    },
  }
})

const slot = (slotId: string) => ({ slotId, position: 'CM', defaultRole: 'box_to_box_balanced', x: 0.5, y: 0.5 })
const member = (id: number, extra: object = {}) => ({ player: { id, name: `Oyuncu ${id}`, positions: ['CM'], overall: 60 + id, age: 25, valueEur: 1_000_000, valuationEstimated: false, ...extra }, onLoan: false })
const FITS: Record<number, object> = {
  1: { levelFit: 38.4, score: 65.2, fitLabel: 'WEAK' },
  2: { levelFit: 12.0, score: 40, fitLabel: 'WRONG_ROLE' },
  3: { levelFit: 80, score: 90, fitLabel: 'GOOD' },
}
const candidate = { player: { id: 50, name: 'Aday Forvet', overall: 66, positions: ['CM'], age: 23, club: 'Port Vale', valueEur: 1_500_000, valuationEstimated: false },
  roleId: 'box_to_box_balanced', roleName: 'Box-to-Box', currentFit: 70, levelFit: 72, fitLabel: 'GOOD', bucket: 'ALINABILIR', bucketLabel: 'Alınabilir', bucketPoints: 0, bucketFactors: [], pros: [], cons: [], tags: [], rankScore: 1 }

function Where() {
  return <p data-testid="where">{useLocation().search}</p>
}

function renderPage(path = '/career/transfer') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/career/transfer" element={<><TransferCenterPage /><Where /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  careerStore.set(1)
  vi.mocked(endpoints.careers).mockResolvedValue([{ id: 1, clubName: 'Crewe', budgetEur: 5_000_000 }] as never)
  vi.mocked(endpoints.formations).mockResolvedValue([{ id: '4-3-3', name: '4-3-3', slots: [slot('CM1'), slot('CM2'), slot('CM3')] }] as never)
  vi.mocked(endpoints.squad).mockResolvedValue([member(1), member(2), member(3), member(4, { age: 32, valueEur: 3_000_000, contractUntil: '2027-08-15' }), member(5, { age: 19, overall: 58, potential: 76 })] as never)
  // KARIYER-UX FAZ 4a: İhtiyaçlar ana taktikten (15 §4.4); eski tek kopya diziliş deposu okunmaz.
  lineupStore.set(1, { CM1: 3, CM2: 3, CM3: 3 })
  vi.mocked(endpoints.mainTactic).mockResolvedValue({
    slot: 1, careerId: 1, name: 'Ana', formation: '4-3-3', buildUp: 'Balanced', defensiveApproach: null, lineHeight: null, eaCode: 'X', sourceReplicaId: null,
    slots: ['CM1', 'CM2', 'CM3'].map((s) => ({ slot: s, position: 'CM', roleId: 'box_to_box_balanced', tags: [] })), main: true, lineup: { CM1: 1, CM2: 2, CM3: 3 },
    depth: 50, presetId: null, updatedAt: '2026-10-20T10:00:00Z', lineupDropped: 0,
  } as never)
  vi.mocked(endpoints.fitRole).mockReset().mockImplementation(((b: { playerId: number }) => Promise.resolve({ roleFit: { playerId: b.playerId, playerName: `Oyuncu ${b.playerId}`, roleId: 'box_to_box_balanced', roleName: 'Box-to-Box (Balanced)', projectedRating: 70, outOfPosition: false, reasons: [], weaponChecks: [], ...FITS[b.playerId] } })) as never)
  // FAZ 4b: İhtiyaçlar rol uyumu tek /fit/lineup (dizilenler kilitli); yanıt fitRole fikstüründen (çağrı anında, testteki değişiklik geçer).
  vi.mocked(endpoints.lineup).mockReset().mockImplementation(lineupFromFitRole(endpoints.fitRole as never) as never)
  vi.mocked(endpoints.shortlist).mockReset().mockResolvedValue([])
  vi.mocked(endpoints.shortlistAdd).mockClear()
  vi.mocked(endpoints.shortlistRemove).mockClear()
  vi.mocked(endpoints.playerTags).mockResolvedValue([])
  vi.mocked(endpoints.playerFacets).mockResolvedValue({ gameDate: '2027-01-15', contractData: true, loanData: false, leagueName: 'EFL League Two', leagueOvr: 62 })
  vi.mocked(endpoints.careerRecommendations).mockReset().mockResolvedValue({ charged: 0, result: { position: 'CM', roleSource: 'REQUEST', profile: 'BALANCED', poolSize: 100, scored: 100, items: [candidate], longShots: [] } } as never)
})

const fetchCandidates = async () => {
  // Varsayılan ihtiyaç rol uyumları gelince en zayıf slot olur (yüklenirken derinlik açığı).
  await screen.findByRole('button', { name: /Oyuncu 2 · Seviyesine göre %12/, pressed: true })
  fireEvent.click(await screen.findByRole('button', { name: /Önerileri getir/ }))
  return screen.findByText('Aday Forvet')
}

describe('Transfer Merkezi (v3)', () => {
  it('İhtiyaçlar sahadaki rozetle aynı kaynaktan; çip seçimi ↔ adres çubuğu; "Tüm kadro" seçeneği', async () => {
    renderPage()
    const weak = await screen.findByRole('button', { name: /Oyuncu 2 · Seviyesine göre %12/ })
    expect(screen.getByRole('button', { name: /Oyuncu 1 · Seviyesine göre %38/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Seviyesine göre %80/ })).toBeNull()
    expect(weak).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /Oyuncu 1 · Seviyesine göre %38/ }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toContain('ihtiyac=slot-CM1'))
    fireEvent.click(screen.getByRole('button', { name: 'Tüm kadro' }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toContain('kadro=tum'))
    expect(await screen.findByRole('button', { name: /Oyuncu 3 · Seviyesine göre %80/ })).toBeInTheDocument()
  })

  it('zayıf halka ve derinlik açığı yoksa adaylar bölümü "Tüm kadroyu göster" ile çıkış verir', async () => {
    vi.mocked(endpoints.squad).mockResolvedValue(Array.from({ length: 22 }, (_, i) => member(i + 1, { positions: [['GK', 'CB', 'LB', 'CM', 'RW', 'ST'][i % 6]] })) as never)
    vi.mocked(endpoints.fitRole).mockImplementation(((b: { playerId: number }) => Promise.resolve({ roleFit: { playerId: b.playerId, playerName: `Oyuncu ${b.playerId}`, roleId: 'box_to_box_balanced', roleName: 'Box-to-Box (Balanced)', projectedRating: 70, outOfPosition: false, reasons: [], weaponChecks: [], ...FITS[3] } })) as never)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Tüm kadroyu göster' }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toContain('kadro=tum'))
    expect(await screen.findByRole('button', { name: /Oyuncu 3 · Seviyesine göre %80/ })).toBeInTheDocument()
  })

  it('adresteki ihtiyaç açılışta seçilir', async () => {
    renderPage('/career/transfer?ihtiyac=slot-CM1')
    expect(await screen.findByRole('button', { name: /Oyuncu 1 · Seviyesine göre %38/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('bütçe bandı: bütçe, kısa liste tahmini bedeli, alım sonrası bütçe', async () => {
    vi.mocked(endpoints.shortlist).mockResolvedValue([{ playerId: 50, player: candidate.player, maxFeeEur: 1_200_000 }, { playerId: 51, player: { ...candidate.player, id: 51, name: 'İkinci', valueEur: 800_000 } }] as never)
    renderPage()
    const band = await screen.findByRole('region', { name: 'Bütçe' })
    await waitFor(() => expect(within(band).getByText('€2,00 Mn')).toBeInTheDocument())
    expect(within(band).getByText('€5,00 Mn')).toBeInTheDocument()
    expect(within(band).getByText('€3,00 Mn')).toBeInTheDocument()
  })

  it('bütçe bilinmiyorsa "—" ve neden; 0 yazılmaz', async () => {
    vi.mocked(endpoints.careers).mockResolvedValue([{ id: 1, clubName: 'Crewe' }] as never)
    renderPage()
    const band = await screen.findByRole('region', { name: 'Bütçe' })
    expect(await within(band).findByText(/Bütçe girilmemiş/)).toBeInTheDocument()
    expect(within(band).getAllByText('—').length).toBeGreaterThan(0)
    expect(within(band).queryByText(/€0/)).toBeNull()
  })

  it('aday satırı: alım sonrası bütçe, lig seviyesi, oyuncu sayfası bağlantısı; kısa listeye ekle', async () => {
    renderPage()
    await fetchCandidates()
    const row = screen.getByText('Aday Forvet').closest('li')!
    expect(within(row).getByRole('link', { name: 'Aday Forvet' })).toHaveAttribute('href', '/players/50')
    expect(within(row).getByText(/Alım sonrası bütçe/)).toHaveTextContent('€3,50 Mn')
    expect(within(row).getByText('Ligin üstünde (+4)')).toBeInTheDocument()
    fireEvent.click(within(row).getByRole('button', { name: /Kısa liste/ }))
    await waitFor(() => expect(endpoints.shortlistAdd).toHaveBeenCalledWith(1, 50, expect.objectContaining({ note: expect.stringContaining('CM') })))
  })

  it('kısa liste: oyuncu adıyla, pazarlık tavanı MoneyInput kaydeder, çıkar', async () => {
    vi.mocked(endpoints.shortlist).mockResolvedValue([{ playerId: 50, player: candidate.player, note: 'CM · Box-to-Box' }] as never)
    renderPage()
    const list = await screen.findByRole('region', { name: /Kısa liste/ })
    expect(await within(list).findByRole('link', { name: 'Aday Forvet' })).toBeInTheDocument()
    const input = within(list).getByRole('textbox', { name: 'Pazarlık tavanı' })
    fireEvent.change(input, { target: { value: '1,2' } })
    fireEvent.blur(input)
    await waitFor(() => expect(endpoints.shortlistAdd).toHaveBeenCalledWith(1, 50, { maxFeeEur: 1_200_000, note: 'CM · Box-to-Box' }))
    fireEvent.click(within(list).getByRole('button', { name: 'Çıkar' }))
    await waitFor(() => expect(endpoints.shortlistRemove).toHaveBeenCalledWith(1, 50))
  })

  it('"Uzak ihtimalleri göster" anahtarı adreste ve istekte (HAYAL varsayılan dışarıda)', async () => {
    renderPage()
    await screen.findByRole('button', { name: /Önerileri getir/ })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Uzak ihtimalleri göster' }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toContain('uzak=1'))
    await fetchCandidates()
    expect(vi.mocked(endpoints.careerRecommendations).mock.calls.at(-1)![1]).toMatchObject({ includeLongShots: true, position: 'CM' })
  })

  it('HAYAL varsayılan dışarıda: anahtar kapalıyken istek uzak ihtimal istemez', async () => {
    renderPage()
    await fetchCandidates()
    expect(vi.mocked(endpoints.careerRecommendations).mock.calls.at(-1)![1]).toMatchObject({ includeLongShots: false })
  })

  it('satış planı: oyuncu · değer · sözleşme bitişi (oyun tarihine göre) · öneri ve gerekçe (Masa kuralları)', async () => {
    renderPage()
    const plan = await screen.findByRole('region', { name: 'Satış planı' })
    const veteran = (await within(plan).findByText('Oyuncu 4')).closest('tr, li')!
    expect(veteran).toHaveTextContent('Sat')
    expect(veteran).toHaveTextContent("32 yaşında, ilk 11'de değil")
    expect(veteran).toHaveTextContent('7 ay')
    const young = within(plan).getByText('Oyuncu 5').closest('tr, li')!
    expect(young).toHaveTextContent('Kirala')
    const starter = within(plan).getByText('Oyuncu 1').closest('tr, li')!
    expect(starter).toHaveTextContent('Tut')
  })

  it('yalnız v3 uçları: rol uyumu v3, öneri hattı kariyer ucu; eski uçlar çağrılmaz', async () => {
    renderPage()
    await fetchCandidates()
    // FAZ 4b: rol uyumu tek /fit/lineup'tan (kariyer motoru v3; slot başına /fit/role olmadığı useLineupFits.test'te).
    expect(endpoints.lineup).toHaveBeenCalled()
    expect(endpoints.careerRecommendations).toHaveBeenCalledWith(1, expect.objectContaining({ position: 'CM', roleId: 'box_to_box_balanced' }))
    expect(endpoints.recommendTactic).not.toHaveBeenCalled()
    expect(endpoints.previewSlot).not.toHaveBeenCalled()
    expect(endpoints.development).not.toHaveBeenCalled()
    expect(endpoints.fitSquad).not.toHaveBeenCalled()
  })

  it('boş durum: kariyer yoksa yeni kariyer bağlantısı', async () => {
    careerStore.set(undefined)
    vi.mocked(endpoints.careers).mockResolvedValue([] as never)
    renderPage()
    expect(await screen.findByRole('link', { name: 'Yeni kariyer başlat' })).toBeInTheDocument()
  })
})
