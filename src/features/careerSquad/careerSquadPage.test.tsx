import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserTactic } from '../../api/types'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { labStore } from '../../state/labStore'
import { CareerSquadPage } from './CareerSquadPage'

const SLOTS = ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'RCM', 'RM', 'LST', 'RST']
const POSITIONS = ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST']
const f442 = { id: '4-4-2', label: '4-4-2', slots: SLOTS.map((slotId, i) => ({ slotId, position: POSITIONS[i], x: 10 + i * 7, y: 10 + i * 7, defaultRole: 'r', group: POSITIONS[i] })) }
const player = (id: number, position: string, overall = 70, extra: object = {}, record: object = {}) =>
  ({ player: { id, name: `Oyuncu ${id}`, overall, positions: [position], valuationEstimated: false, age: 24, ...extra }, onLoan: false, ...record })
const SQUAD = [
  ...POSITIONS.map((p, i) => player(i + 1, p, 75, {}, { wageEur: 12_000 })),
  player(12, 'GK', 60, { age: 19, contractUntil: '2027-04-30' }),
  player(13, 'ST', 62, {}, { onLoan: true, loanUntil: '2027-02-12' }),
]
const MAIN: UserTactic = {
  slot: 1, careerId: 7, name: 'Ana 4-4-2', formation: '4-4-2', buildUp: 'Balanced', defensiveApproach: null, lineHeight: null, eaCode: 'X', sourceReplicaId: null,
  slots: SLOTS.map((s, i) => ({ slot: s, position: POSITIONS[i], roleId: 'r', tags: [] })), main: true,
  lineup: Object.fromEntries(SLOTS.map((s, i) => [s, i + 1])), depth: 50, presetId: null, updatedAt: '2026-10-20T10:00:00Z', lineupDropped: 0,
} as UserTactic
const CAREER = { id: 7, name: 'Test kariyeri', clubId: 1, clubName: 'Kulüp', budgetEur: 1_000_000, season: 2, squadSize: SQUAD.length, gender: 0, gameDate: '2027-01-15' }

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))
vi.mock('../../api/endpoints', () => ({
  endpoints: {
    careers: vi.fn(), squad: vi.fn(), events: vi.fn(), mainTactic: vi.fn(), starterTactic: vi.fn(), lineup: vi.fn(),
    positionAdvice: vi.fn(() => Promise.resolve([])),
    formations: vi.fn(() => Promise.resolve([f442])),
    roles: vi.fn(() => Promise.resolve([])), eaRoles: vi.fn(() => Promise.resolve([])),
    resolveTactic: vi.fn(() => Promise.resolve({ formation: '4-4-2', slots: [] })),
    fitRole: vi.fn((b: { playerId: number }) => Promise.resolve({ roleFit: { playerId: b.playerId, roleId: 'r', roleName: 'Rol', score: 70, levelFit: 72, fitLabel: 'GOOD', reasons: [], weaponChecks: [], projectedRating: 70, outOfPosition: false } })),
    careerMoves: vi.fn(() => Promise.resolve([])),
    snapshots: vi.fn(() => Promise.resolve([{ id: 1, takenAt: '2026-10-19T12:00:00Z', source: 'IMPORT', playerCount: 13 }])),
    applyEvent: vi.fn(() => Promise.resolve({})),
    undoEvent: vi.fn(() => Promise.resolve({})),
    players: vi.fn(() => Promise.resolve({ items: [{ id: 99, name: 'Aday Oyuncu', overall: 80, positions: ['ST'], club: 'Başka', valuationEstimated: false }], total: 1 })),
    playerTags: vi.fn(() => Promise.resolve([])),
    saveUserTactic: vi.fn(), setMainTactic: vi.fn(), userTactics: vi.fn(() => Promise.resolve([])),
  },
}))

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.pathname + location.search}</output>
}

function renderAt(url = '/career/squad') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/career/squad" element={<CareerSquadPage />} />
          <Route path="*" element={null} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Kadro Analizi (/career/squad, KARIYER-UX FAZ 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    labStore.reload()
    careerStore.set(7)
    vi.mocked(endpoints.careers).mockResolvedValue([CAREER] as never)
    vi.mocked(endpoints.squad).mockResolvedValue(SQUAD as never)
    vi.mocked(endpoints.mainTactic).mockResolvedValue(MAIN as never)
    vi.mocked(endpoints.events).mockResolvedValue([
      { id: 2, type: 'BUY', playerId: 13, playerName: 'Oyuncu 13', feeEur: 500_000 },
      { id: 1, type: 'SELL', playerId: 50, playerName: 'Eski Oyuncu' },
    ] as never)
  })

  it('sekmeler: Diziliş · Liste · Derinlik · Hareketler; Kariyer sekmesi yok', async () => {
    renderAt()
    expect(await screen.findByRole('tab', { name: 'Diziliş', selected: true })).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((t) => t.textContent?.replace(/\s*\(\d+\)$/, ''))).toEqual(['Diziliş', 'Liste', 'Derinlik', 'Hareketler'])
    expect(screen.queryByRole('tab', { name: /Kariyer/ })).toBeNull()
  })

  it('diziliş: ana taktik salt okunur piyon sahada ("Kararın"); sürükleme/taşıma yok; piyon oyuncu sayfasını açar', async () => {
    renderAt()
    const pawn = await screen.findByRole('button', { name: /^GK — Oyuncu 1, 75/ })
    expect(document.querySelector('[data-pitch-marker="pawn"]')).not.toBeNull()
    expect(document.querySelector('[data-field="cyber"]')).not.toBeNull()
    expect(screen.getAllByText('Kararın').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText(/M ile taşı/)).toBeNull()
    expect(screen.getByRole('button', { name: "Lab'da düzenle" })).toBeInTheDocument()
    fireEvent.click(pawn)
    expect(screen.getByTestId('where')).toHaveTextContent('/players/1')
    expect(endpoints.lineup).not.toHaveBeenCalled()
  })

  it('diziliş: StatTile\'lar ortalama reyting, oyuncu sayısı, ortalama yaş', async () => {
    renderAt()
    const stats = await screen.findByRole('region', { name: 'Kadro özeti' })
    expect(within(stats).getByText('Ortalama reyting')).toBeInTheDocument()
    expect(await within(stats).findByText('72,8')).toBeInTheDocument()
    expect(within(stats).getByText('13')).toBeInTheDocument()
    expect(within(stats).getByText('Ortalama yaş')).toBeInTheDocument()
    expect(within(stats).getByText('23,6')).toBeInTheDocument()
  })

  it('ana taktik yoksa başlangıç önerisi "Otomatik öneri" etiketiyle', async () => {
    vi.mocked(endpoints.mainTactic).mockResolvedValue(null as never)
    vi.mocked(endpoints.starterTactic).mockResolvedValue({
      formationId: '4-4-2', setup: { buildUp: 'Balanced', depth: 50 }, squadFit: 64, alternatives: [],
      slots: SLOTS.map((s, i) => ({ slotId: s, position: POSITIONS[i], roleId: 'r', roleName: 'Rol' })), lineup: Object.fromEntries(SLOTS.map((s, i) => [s, i + 1])),
    } as never)
    renderAt()
    expect((await screen.findAllByText('Otomatik öneri · ana taktik değil')).length).toBeGreaterThan(0)
    expect(await screen.findByRole('button', { name: /^GK — Oyuncu 1, 75/ })).toBeInTheDocument()
  })

  it('liste: satırlarda maaş ve kiralık bitişi; kartlarda "Sat" satış diyaloğunu açar', async () => {
    renderAt('/career/squad?sekme=liste')
    expect(await screen.findByRole('tab', { name: /Liste/, selected: true })).toBeInTheDocument()
    const row13 = (await screen.findByRole('link', { name: 'Oyuncu 13' })).closest('tr')!
    expect(row13).toHaveTextContent('12 Şub 2027')
    const row1 = screen.getByRole('link', { name: 'Oyuncu 1' }).closest('tr')!
    expect(row1).toHaveTextContent('€12.000')
    fireEvent.click(await screen.findByRole('radio', { name: 'Kartlar' }))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Sat' }))[0])
    const dialog = await screen.findByRole('dialog', { name: /Satış/ })
    fireEvent.change(within(dialog).getByLabelText(/bedel/i), { target: { value: '100000' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Satışı onayla' }))
    await waitFor(() => expect(endpoints.applyEvent).toHaveBeenCalledWith(7, expect.objectContaining({ type: 'SELL' })))
  })

  it('derinlik: ?grup= o grubu açık ve odaklı getirir; diğerleri kapalı', async () => {
    renderAt('/career/squad?sekme=derinlik&grup=MID')
    const toggle = await screen.findByRole('button', { name: /Orta saha/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => expect(document.activeElement).toBe(toggle))
    expect(screen.getByRole('button', { name: /Kaleci/ })).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(screen.getByRole('button', { name: /Kaleci/ }))
    expect(screen.getByRole('button', { name: /Kaleci/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('derinlik: yaş histogramı metin özetiyle ve tablo alternatifiyle; sözleşme zaman çizgisi', async () => {
    renderAt('/career/squad?sekme=derinlik')
    const histogram = await screen.findByRole('img', { name: /Yaş profili: ortalama 23,6/ })
    expect(histogram).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Yaş profili' })
    expect(within(table).getByRole('row', { name: /≤20 1/ })).toBeInTheDocument()
    const timeline = screen.getByRole('region', { name: 'Sözleşme bitişleri' })
    expect(within(timeline).getByText('Oyuncu 12')).toBeInTheDocument()
    expect(within(timeline).getByText(/3 ay/)).toBeInTheDocument()
  })

  it('hareketler: kayda göre hareketler, geçmiş (yalnız son geri alınır) ve transfer piyasası', async () => {
    renderAt('/career/squad?sekme=hareketler')
    const undo = await screen.findAllByRole('button', { name: 'Geri al' })
    expect(undo).toHaveLength(1)
    fireEvent.click(undo[0])
    await waitFor(() => expect(endpoints.undoEvent).toHaveBeenCalledWith(7, 2))
    fireEvent.change(screen.getByLabelText('Oyuncu ara'), { target: { value: 'Ad' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Satın al' }))
    await waitFor(() => expect(endpoints.applyEvent).toHaveBeenCalledWith(7, expect.objectContaining({ type: 'BUY', playerId: 99 })))
  })

  it('Kadro taslak okumaz: Lab taslağı varken bile diziliş ana taktikten', async () => {
    labStore.create(7, { name: 'Deneme', origin: { kind: 'blank' }, tactic: { formation: '4-3-3', slots: {} }, lineup: { GK: 12 } })
    const read = vi.spyOn(labStore, 'get')
    renderAt()
    expect(await screen.findByRole('button', { name: /^GK — Oyuncu 1, 75/ })).toBeInTheDocument()
    expect(read).not.toHaveBeenCalled()
    read.mockRestore()
  })

  it('kariyer yoksa yeni kariyer öneren boş durum', async () => {
    vi.mocked(endpoints.careers).mockResolvedValue([] as never)
    careerStore.set(undefined)
    renderAt()
    expect(await screen.findByRole('link', { name: 'Yeni kariyer başlat' })).toHaveAttribute('href', '/career/new')
  })
})
