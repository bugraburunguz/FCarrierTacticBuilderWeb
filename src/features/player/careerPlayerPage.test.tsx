import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayerContract, PlayerDetail, PlayerRoleFit } from '../../api/types'
import { ROLES_HELP } from '../../lib/fitLabels'
import { CareerPlayerPage } from './CareerPlayerPage'

vi.mock('../../api/endpoints', () => ({
  endpoints: { player: vi.fn(), playerRoles: vi.fn(), playerContract: vi.fn(), development: vi.fn() },
}))

const CAREER = 4

const detail = (over: Partial<PlayerDetail['summary']> = {}): PlayerDetail => ({
  summary: { id: 7, name: 'Ollie Watkins', age: 22, overall: 72, potential: 84, positions: ['ST', 'CF'], club: 'Crewe', league: 'League Two', nationality: 'England', valuationEstimated: false, ...over },
  weakFoot: 3, skillMoves: 4, preferredFoot: 'Left', attrs: { Finishing: 78, Acceleration: 80 }, playstyles: {},
})

const role = (over: Partial<PlayerRoleFit>): PlayerRoleFit => ({
  position: 'ST', roleId: 'advanced_forward_attack', roleName: 'Advanced Forward (Attack)', score: 80, projectedRating: 72, badgeText: '', reasons: [], gaps: [], engineVersion: 'v3',
  currentFit: 80, levelFit: 90, fitLabel: 'GOOD', levelReference: { kind: 'LEAGUE', league: 'League Two', ovr: 64 },
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
  vi.mocked(endpoints.development).mockReset()
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

  it('dört sekme; sekme adres çubuğunda (?sekme=), doğrudan adresle açılır', async () => {
    renderPage()
    const tabs = await screen.findAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Statlar', 'Roller', 'Gelişim', 'Sözleşme ve değer'])
    fireEvent.click(screen.getByRole('tab', { name: 'Roller' }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toContain('sekme=roller'))
    fireEvent.click(screen.getByRole('tab', { name: 'Statlar' }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe(''))
  })

  it('Roller: kariyer motoru v3 kariyerle istenir; tek yardım referansın lig olduğunu söyler', async () => {
    renderPage('/players/7?sekme=roller')
    expect(await screen.findByText('Advanced Forward (Attack)')).toBeInTheDocument()
    expect(endpoints.playerRoles).toHaveBeenCalledWith(7, CAREER, 'v3')
    expect(vi.mocked(endpoints.playerRoles).mock.calls.every((c) => c[2] === 'v3')).toBe(true)
    expect(endpoints.development).not.toHaveBeenCalled()
    const panel = screen.getByRole('tabpanel')
    const notes = within(panel).getAllByRole('note')
    expect(notes).toHaveLength(1)
    expect(notes[0]).toHaveTextContent('League Two')
    expect(notes[0]).toHaveTextContent(ROLES_HELP.rolePoints)
    expect(within(panel).getAllByText('Biçilmiş kaftan')).toHaveLength(1)
    expect(within(panel).getByText('Neden?')).toBeInTheDocument()
  })

  it('Roller: lig gücü bilinmiyorsa yardım oyuncunun kendi seviyesini söyler (lig adı uydurulmaz)', async () => {
    vi.mocked(endpoints.playerRoles).mockResolvedValue([role({ levelReference: { kind: 'OVR' } })])
    renderPage('/players/7?sekme=roller')
    await screen.findByText('Advanced Forward (Attack)')
    const note = within(screen.getByRole('tabpanel')).getByRole('note')
    expect(note).toHaveTextContent('kendi OVR')
    expect(note).not.toHaveTextContent('League Two')
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

  it('Gelişim: OVR→POT ve gelişim payı mevcut veriden; projeksiyon ucu yok, eski gelişim ucu çağrılmaz', async () => {
    renderPage('/players/7?sekme=gelisim')
    const panel = await screen.findByRole('tabpanel')
    expect(await within(panel).findByText('+12')).toBeInTheDocument()
    expect(within(panel).getByText(/72 → 84/)).toBeInTheDocument()
    expect(within(panel).queryByText(/Projeksiyon/)).toBeNull()
    expect(endpoints.development).not.toHaveBeenCalled()
  })

  it('kaleci: Statlar yalnız kaleci grubu', async () => {
    vi.mocked(endpoints.player).mockResolvedValue({ ...detail({ positions: ['GK'] }), attrs: { GKDiving: 70, Finishing: 10 } })
    renderPage()
    expect(await screen.findByRole('region', { name: 'Kaleci' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Şut' })).toBeNull()
  })
})
