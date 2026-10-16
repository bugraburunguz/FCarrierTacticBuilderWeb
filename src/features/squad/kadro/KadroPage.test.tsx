import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../../api/endpoints'
import { careerStore } from '../../../state/careerStore'
import { lineupStore } from '../../../state/lineupStore'
import { tacticStore } from '../../../state/tacticStore'
import { KadroPage } from './KadroPage'

const SLOTS = ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'RCM', 'RM', 'LST', 'RST']
const POSITIONS = ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST']
const f442 = { id: '4-4-2', label: '4-4-2', slots: SLOTS.map((slotId, i) => ({ slotId, position: POSITIONS[i], x: 10 + i * 7, y: 10 + i * 7, defaultRole: 'r', group: POSITIONS[i] })) }
const player = (id: number, position: string, overall = 70) => ({ player: { id, name: `Oyuncu ${id}`, overall, positions: [position], valuationEstimated: false, age: 24 }, onLoan: false })
// 11 ilk + 2 yedek (biri kaleci).
const SQUAD = [...POSITIONS.map((p, i) => player(i + 1, p, 75)), player(12, 'GK', 60), player(13, 'ST', 62)]
const lineupResult = (mirrored = false) => ({
  mirrored,
  squadFit: 70,
  summary: '',
  weakLinks: [],
  rules: [],
  attackPattern: '',
  bench: [],
  slots: SLOTS.map((slotId, i) => ({ slotId, position: POSITIONS[i], roleId: 'r', roleName: 'Rol', tags: [], playerId: i + 1, playerName: `Oyuncu ${i + 1}`, overall: 75, roleFit: { score: 70, badge: 'GREEN' }, depth: [] })),
})
const CAREER = { id: 7, name: 'Test kariyeri', clubId: 1, clubName: 'Kulüp', budgetEur: 1_000_000, season: 2, squadSize: SQUAD.length, gender: 0 }

vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))
vi.mock('../../../api/endpoints', () => ({
  endpoints: {
    careers: vi.fn(),
    squad: vi.fn(),
    events: vi.fn(),
    positionAdvice: vi.fn(() => Promise.resolve([])),
    formations: vi.fn(() => Promise.resolve([f442])),
    roles: vi.fn(() => Promise.resolve([])),
    lineup: vi.fn(),
    applyEvent: vi.fn(() => Promise.resolve({})),
    undoEvent: vi.fn(() => Promise.resolve({})),
    players: vi.fn(() => Promise.resolve({ items: [{ id: 99, name: 'Aday Oyuncu', overall: 80, positions: ['ST'], club: 'Başka', valuationEstimated: false }], total: 1 })),
    clubs: vi.fn(() => Promise.resolve([])),
    updateCareer: vi.fn(() => Promise.resolve(CAREER)),
    deleteCareer: vi.fn(),
    playerTags: vi.fn(() => Promise.resolve([])),
  },
}))

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.pathname + location.search}</output>
}

function renderAt(url = '/squad') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/squad" element={<KadroPage />} />
          <Route path="*" element={null} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** V3-07b: v3 /squad — davranış v2 SquadPage ile aynı (ilk 11 + yedek, aynalama, sat/kirala, geçmiş/geri al, transfer, ayarlar); yerleşim 08 §3 + §14-16. */
describe('KadroPage (v3 /squad)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    careerStore.set(7)
    tacticStore.set({ formation: '4-4-2', slots: {} })
    vi.mocked(endpoints.careers).mockResolvedValue([CAREER] as never)
    vi.mocked(endpoints.squad).mockResolvedValue(SQUAD as never)
    vi.mocked(endpoints.events).mockResolvedValue([
      { id: 2, type: 'BUY', playerId: 13, playerName: 'Oyuncu 13', feeEur: 500_000 },
      { id: 1, type: 'SELL', playerId: 50, playerName: 'Eski Oyuncu' },
    ] as never)
    vi.mocked(endpoints.lineup).mockResolvedValue(lineupResult() as never)
  })

  it('kariyer yoksa yeni kariyer öneren boş durum', async () => {
    vi.mocked(endpoints.careers).mockResolvedValue([] as never)
    careerStore.set(undefined)
    renderAt()
    expect(await screen.findByRole('link', { name: 'Yeni kariyer başlat' })).toHaveAttribute('href', '/career/new')
  })

  it('kahraman saha: seçili taktikte ilk 11 (tek lineup isteği), yedek kulübesi ve kadro rating\'i', async () => {
    renderAt()
    // V3-07c 0b: ilk sekme "Saha" (üst alt menüde "Kadro" zaten var)
    expect(await screen.findByRole('tab', { name: 'Saha', selected: true })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Kadro' })).toBeNull()
    const pitch = await screen.findByRole('region', { name: 'Saha' })
    expect(await within(pitch).findByRole('button', { name: /^GK — Oyuncu 1, 75/ })).toBeInTheDocument()
    expect(endpoints.lineup).toHaveBeenCalledTimes(1)
    expect(vi.mocked(endpoints.lineup).mock.calls[0][0]).toBe(7)
    expect(within(pitch).getByRole('list', { name: 'Yedek kulübesi' })).toHaveTextContent('Oyuncu 12')
    expect(screen.getByText('Kadro rating\'i')).toBeInTheDocument()
  })

  it('rol etiketi "Rol · Odak" (kurucuyla aynı biçim; ad tekrarlanmaz)', async () => {
    const result = lineupResult()
    result.slots[0].roleName = 'Goalkeeper (Balanced)'
    result.slots[1].roleName = 'Fullback'
    vi.mocked(endpoints.lineup).mockResolvedValue(result as never)
    renderAt()
    expect(await screen.findByRole('button', { name: 'Goalkeeper · Balanced' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fullback' })).toBeInTheDocument()
  })

  it('V3-07c 0a: rozet etiketi ve yüzdesi aynı sayıdan (levelFit); ham rol puanı gösterilmez, yüzde arttıkça etiket kötüleşmez', async () => {
    const result = lineupResult()
    // Sunucu: etiket levelFit'ten (≥65 Uygun, 40–65 Seviyesinde). Ham puan (score/currentFit) ters sırada: eski ekran %52 "Uygun", %62 "Seviyesinde" gösteriyordu.
    result.slots[0].roleFit = { score: 52, currentFit: 52, levelFit: 70, fitLabel: 'GOOD', badge: 'GREEN' } as never
    result.slots[1].roleFit = { score: 62, currentFit: 62, levelFit: 50, fitLabel: 'AT_LEVEL', badge: null } as never
    result.slots[0].depth = [{ playerId: 12, playerName: 'Oyuncu 12', combined: 40, roleFitScore: 41, badge: 'YELLOW', levelFit: 33, fitLabel: 'WEAK' }] as never
    vi.mocked(endpoints.lineup).mockResolvedValue(result as never)
    renderAt()
    expect((await screen.findAllByLabelText('Rol için uygun, yüzde 70')).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Rol için seviyesinde, yüzde 50').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText(/yüzde 52|yüzde 62/)).toBeNull()
    expect(screen.getByRole('list', { name: 'Yedek kulübesi' })).toHaveTextContent('GK %33')
  })

  it('sahada karta tıklamak kadro kurucuya götürür', async () => {
    renderAt()
    fireEvent.click(await screen.findByRole('button', { name: /^GK — Oyuncu 1, 75/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('/squad/builder')
  })

  it('iki kartı yer değiştirmek (M ile taşı + Enter) dizilişi kurucuya kaydedip oraya geçer', async () => {
    const set = vi.spyOn(lineupStore, 'set')
    renderAt()
    fireEvent.keyDown(await screen.findByRole('button', { name: /^GK — Oyuncu 1, 75/ }), { key: 'm' })
    fireEvent.keyDown(screen.getByRole('button', { name: /^LB — Oyuncu 2, 75/ }), { key: 'Enter' })
    expect(set).toHaveBeenCalledWith(7, expect.objectContaining({ GK: 2, LB: 1 }))
    expect(screen.getByTestId('where')).toHaveTextContent('/squad/builder')
    set.mockRestore()
  })

  it('aynalanmış taktik uyarısı ve "Aynalanmış taktiği kaydet"', async () => {
    vi.mocked(endpoints.lineup).mockResolvedValue(lineupResult(true) as never)
    const set = vi.spyOn(tacticStore, 'set')
    renderAt()
    fireEvent.click(await screen.findByRole('button', { name: 'Aynalanmış taktiği kaydet' }))
    expect(set).toHaveBeenCalled()
    set.mockRestore()
  })

  it('kadro 11\'den azsa ilk 11 dizilmez, sebebi söylenir', async () => {
    vi.mocked(endpoints.squad).mockResolvedValue(SQUAD.slice(0, 5) as never)
    renderAt()
    expect(await screen.findByText(/en az 11 oyuncu/)).toBeInTheDocument()
    expect(endpoints.lineup).not.toHaveBeenCalled()
  })

  it('Oyuncular sekmesi (?sekme=oyuncular): liste/kartlar/etiket görünümü; kartlarda "Sat" satış diyaloğunu açar ve SELL gönderir', async () => {
    renderAt('/squad?sekme=oyuncular')
    expect(await screen.findByRole('tab', { name: /Oyuncular/, selected: true })).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('radio', { name: 'Kartlar' }))
    const sell = await screen.findAllByRole('button', { name: 'Sat' })
    fireEvent.click(sell[0])
    const dialog = await screen.findByRole('dialog', { name: /Satış/ })
    fireEvent.change(within(dialog).getByLabelText(/bedel/i), { target: { value: '100000' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Satışı onayla' }))
    await waitFor(() => expect(endpoints.applyEvent).toHaveBeenCalledWith(7, expect.objectContaining({ type: 'SELL' })))
  })

  it('Hareketler sekmesi: geçmişte yalnız son hareket geri alınır; transfer aramasından satın alma', async () => {
    renderAt('/squad?sekme=hareketler')
    const undo = await screen.findAllByRole('button', { name: 'Geri al' })
    expect(undo).toHaveLength(1)
    fireEvent.click(undo[0])
    await waitFor(() => expect(endpoints.undoEvent).toHaveBeenCalledWith(7, 2))
    fireEvent.change(screen.getByLabelText('Oyuncu ara'), { target: { value: 'Ad' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Satın al' }))
    await waitFor(() => expect(endpoints.applyEvent).toHaveBeenCalledWith(7, expect.objectContaining({ type: 'BUY', playerId: 99 })))
  })

  it('Kariyer sekmesi: ad/bütçe/sezon kaydedilir; silme yalnız onaylı diyalogla', async () => {
    renderAt('/squad?sekme=kariyer')
    const name = await screen.findByLabelText('Ad')
    fireEvent.change(name, { target: { value: 'Yeni ad' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }))
    await waitFor(() => expect(endpoints.updateCareer).toHaveBeenCalledWith(7, expect.objectContaining({ name: 'Yeni ad', season: 2 })))
    fireEvent.click(screen.getByRole('button', { name: 'Kariyeri sil' }))
    expect(await screen.findByRole('dialog', { name: 'Kariyeri sil' })).toBeInTheDocument()
    expect(endpoints.deleteCareer).not.toHaveBeenCalled()
  })
})
