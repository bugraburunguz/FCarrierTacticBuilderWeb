import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { PageResponse, PlayerSummary } from '../../api/types'
import { CareerPlayersPage } from './CareerPlayersPage'

vi.mock('../../api/endpoints', () => ({
  endpoints: {
    players: vi.fn(),
    playerFacets: vi.fn(),
    shortlist: vi.fn(() => Promise.resolve([])),
    shortlistAdd: vi.fn(() => Promise.resolve()),
    shortlistRemove: vi.fn(() => Promise.resolve()),
    leagues: vi.fn(() => Promise.resolve([{ id: 13, name: 'Premier League', count: 1 }])),
    nationalities: vi.fn(() => Promise.resolve([{ id: 18, name: 'Fransa', count: 1 }])),
    careerTeams: vi.fn(() => Promise.resolve([{ teamId: 101, name: 'Crewe Alexandra' }])),
    roles: vi.fn(() => Promise.resolve([
      { id: 'st_poacher', baseRole: 'Poacher', name: 'Golcü', positions: ['ST'], focus: 'Attack', weapons: [], accelerate: [], movementTags: [] },
      { id: 'cb_stopper', baseRole: 'Stopper', name: 'Stoper', positions: ['CB'], focus: 'Defend', weapons: [], accelerate: [], movementTags: [] },
    ])),
  },
}))

const player = (id: number, name: string, extra: Partial<PlayerSummary> = {}): PlayerSummary => ({
  id, name, overall: 74, potential: 82, positions: ['ST'], age: 21, club: 'Crewe', valueEur: 3_000_000, valuationEstimated: false, feasibility: 'ALINABILIR', ...extra,
})
const page = (items: PlayerSummary[]): PageResponse<PlayerSummary> => ({ items, page: 0, size: 48, totalItems: items.length })

function renderPage(path = '/players') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <CareerPlayersPage careerId={4} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const lastQuery = () => vi.mocked(endpoints.players).mock.calls.at(-1)![0]

beforeEach(() => {
  vi.mocked(endpoints.players).mockReset()
  vi.mocked(endpoints.players).mockResolvedValue(page([player(1, 'Ada Golcü', { contractUntil: '2027-05-30', roleFit: 81.5 }), player(2, 'Bora Stoper', { positions: ['CB'], feasibility: 'HAYAL' })]))
  vi.mocked(endpoints.playerFacets).mockReset()
  vi.mocked(endpoints.playerFacets).mockResolvedValue({ budgetEur: 5_000_000, contractData: false, loanData: false })
})

describe('kariyer oyuncu listesi (v3 Katalog)', () => {
  it('havuz kariyer kaydıdır; kart oyuncu sayfasına gider, kova görünür (HAYAL gizlenmez)', async () => {
    renderPage()
    expect(await screen.findByRole('link', { name: /Ada Golcü, 74/ })).toHaveAttribute('href', '/players/1')
    expect(within(screen.getByRole('link', { name: /Bora Stoper/ }).closest('li')!).getByText('Hayal')).toBeInTheDocument()
    expect(lastQuery()).toMatchObject({ career: 4 })
    expect(lastQuery().bucket).toBeUndefined()
  })

  it('KARIYER-UX FAZ 5: kartta ve tablo satırında "Kısa listeye ekle" (ortak ShortlistButton, PUT /shortlist/{pid})', async () => {
    const { unmount } = renderPage()
    await screen.findByRole('link', { name: /Ada Golcü, 74/ })
    const buttons = await screen.findAllByRole('button', { name: 'Kısa listeye ekle' })
    expect(buttons).toHaveLength(2)
    const add = buttons[0]
    await waitFor(() => expect(add).toBeEnabled())
    fireEvent.click(add)
    await waitFor(() => expect(endpoints.shortlistAdd).toHaveBeenCalledWith(4, 1, {}))
    unmount()
    renderPage('/players?gorunum=table')
    const row = (await screen.findByRole('link', { name: 'Bora Stoper' })).closest('tr')!
    expect(within(row).getByRole('button', { name: 'Kısa listeye ekle' })).toBeInTheDocument()
  })

  it('yapışkan opak filtre çubuğu kart veritabanıyla aynı parçadır', async () => {
    renderPage()
    await screen.findByText(/2 oyuncu/)
    expect(screen.getByRole('region', { name: 'Süzgeçler' }).className).toContain('glass-sticky')
  })

  it('tablo görünümü OVR, POT, yaş, mevki, kulüp, değer ve kova sütunlarını gösterir; sözleşme sütunu yalnız veri varken', async () => {
    const { unmount } = renderPage('/players?gorunum=table')
    await screen.findByRole('table')
    for (const name of ['OVR', 'POT', 'Yaş', 'Mevki', 'Kulüp', 'Değer', 'Ulaşılabilirlik']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(name) })).toBeInTheDocument()
    }
    expect(screen.queryByRole('columnheader', { name: /Sözleşme/ })).not.toBeInTheDocument()
    unmount()
    vi.mocked(endpoints.playerFacets).mockResolvedValue({ gameDate: '2027-01-15', contractData: true, loanData: false })
    renderPage('/players?gorunum=table')
    expect(await screen.findByRole('columnheader', { name: /Sözleşme/ })).toBeInTheDocument()
  })

  it('Lig seviyesi: lig gücü biliniyorsa tablo sütunu ve ızgara kartı altında nötr çip; bilinmiyorsa yok (V3-06c)', async () => {
    vi.mocked(endpoints.playerFacets).mockResolvedValue({ budgetEur: 5_000_000, contractData: false, loanData: false, leagueName: 'EFL League Two', leagueOvr: 62 })
    const grid = renderPage()
    const card = (await screen.findByRole('link', { name: /Ada Golcü/ })).closest('li')!
    expect(await within(card).findByText('Ligin üstünde (+12)')).toBeInTheDocument()
    grid.unmount()
    const table = renderPage('/players?gorunum=table')
    expect(await screen.findByRole('columnheader', { name: /Lig seviyesi/ })).toBeInTheDocument()
    expect(screen.getAllByText('Ligin üstünde (+12)').length).toBeGreaterThan(0)
    table.unmount()
    vi.mocked(endpoints.playerFacets).mockResolvedValue({ budgetEur: 5_000_000, contractData: false, loanData: false })
    renderPage('/players?gorunum=table')
    await screen.findByRole('table')
    expect(screen.queryByRole('columnheader', { name: /Lig seviyesi/ })).toBeNull()
    expect(screen.queryByText(/Ligin üstünde/)).toBeNull()
  })

  it('süzgeç ↔ adres çubuğu: adresten okunur ve sunucuya gider', async () => {
    renderPage('/players?degermin=1000000&kova=ZOR&yasmax=23')
    await screen.findByText(/2 oyuncu/)
    expect(lastQuery()).toMatchObject({ value_min: 1_000_000, bucket: ['ZOR'], age_max: 23 })
  })

  it('bütçe biliniyorsa "Bütçeme sığar" value_max gönderir', async () => {
    renderPage()
    await screen.findByText(/2 oyuncu/)
    fireEvent.click(await screen.findByRole('checkbox', { name: /Bütçeme sığar/ }))
    await waitFor(() => expect(lastQuery().value_max).toBe(5_000_000))
  })

  it('bütçe bilinmiyorsa "Bütçeme sığar" pasif ve nedeni yazılı', async () => {
    vi.mocked(endpoints.playerFacets).mockResolvedValue({ contractData: false, loanData: false })
    renderPage('/players?butce=1')
    const box = await screen.findByRole('checkbox', { name: /Bütçeme sığar/ })
    await waitFor(() => expect(box).toBeDisabled())
    expect(box).toHaveAccessibleDescription('Bütçe kayıt dosyasında yok')
    expect(lastQuery().value_max).toBeUndefined()
  })

  it('sözleşme süzgeci veri yoksa gizli; veri ve oyun tarihi varsa 6 ay gönderir', async () => {
    const { unmount } = renderPage()
    await screen.findByText(/2 oyuncu/)
    expect(screen.queryByRole('checkbox', { name: /Sözleşmesi ≤ 6 ay/ })).not.toBeInTheDocument()
    unmount()
    vi.mocked(endpoints.playerFacets).mockResolvedValue({ gameDate: '2027-01-15', budgetEur: 5_000_000, contractData: true, loanData: true })
    renderPage()
    fireEvent.click(await screen.findByRole('checkbox', { name: /Sözleşmesi ≤ 6 ay/ }))
    await waitFor(() => expect(lastQuery().contract_months).toBe(6))
    fireEvent.click(screen.getByRole('checkbox', { name: /Kiralık/ }))
    await waitFor(() => expect(lastQuery().on_loan).toBe(true))
  })

  it('rol seçilince sunucuya rol sıralaması istenir ve rol uyumu gösterilir', async () => {
    renderPage()
    await screen.findByText(/2 oyuncu/)
    fireEvent.change(await screen.findByRole('combobox', { name: /Rol uyumu/ }), { target: { value: 'st_poacher' } })
    await waitFor(() => expect(lastQuery()).toMatchObject({ sort: 'role', role: 'st_poacher' }))
    expect(await screen.findByText('81.5')).toBeInTheDocument()
  })

  it('kayıttaki takım seçilir; serbest oyuncu takımı temizler', async () => {
    renderPage()
    await screen.findByText(/2 oyuncu/)
    const team = screen.getByRole('combobox', { name: 'Takım' })
    await screen.findByRole('option', { name: 'Crewe Alexandra' })
    fireEvent.change(team, { target: { value: '101' } })
    await waitFor(() => expect(lastQuery().team).toBe(101))
    fireEvent.click(screen.getByRole('checkbox', { name: /Serbest oyuncu/ }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ free_agent: true, team: undefined }))
  })

  it('öznitelik minimumları katlanmış grupta; değer sunucuya attrMin olarak gider', async () => {
    renderPage()
    await screen.findByText(/2 oyuncu/)
    const group = screen.getByText('Öznitelik minimumları').closest('details')!
    expect(group).not.toHaveAttribute('open')
    fireEvent.change(within(group).getByLabelText('Bitiricilik en az'), { target: { value: '70' } })
    await waitFor(() => expect(lastQuery().attrMin).toEqual({ Finishing: 70 }))
  })

  it('boş sonuçta süzgeçleri temizle önerilir', async () => {
    vi.mocked(endpoints.players).mockResolvedValue(page([]))
    renderPage('/players?kova=HAYAL')
    expect(await screen.findByText('Bu süzgeçlere uyan oyuncu yok.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Süzgeçleri temizle' })).toBeInTheDocument()
  })
})
