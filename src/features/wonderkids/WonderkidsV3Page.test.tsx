import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { WonderkidsV3Page } from './WonderkidsV3Page'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))
vi.mock('../../api/endpoints', () => ({
  endpoints: { careers: vi.fn(), wonderkids: vi.fn(), leagues: vi.fn(() => Promise.resolve([])), roles: vi.fn(() => Promise.resolve([{ id: 'poacher_attack', name: 'Poacher', focus: 'Attack', positions: ['ST'] }])), playerFacets: vi.fn(),
    shortlist: vi.fn(() => Promise.resolve([])), shortlistAdd: vi.fn(() => Promise.resolve()), shortlistRemove: vi.fn(() => Promise.resolve()) },
}))

const KID = (id: number, extra = {}) => ({ id, name: `Genç ${id}`, age: 19, overall: 66, potential: 84, gap: 18, positions: ['ST'], club: 'Kulüp', league: 'Lig', ...extra })

function Where() {
  const l = useLocation()
  return <output data-testid="where">{l.search}</output>
}
function renderAt(url = '/wonderkids') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}><WonderkidsV3Page /><Where /></MemoryRouter>
    </QueryClientProvider>,
  )
}

/** V3-07c: /wonderkids v3 Katalog — süzgeçler URL'de, kariyerde Lig seviyesi ve ulaşılabilirlik kovası, rol uyumu levelFit'ten (0a). */
describe('WonderkidsV3Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    careerStore.set(undefined)
    vi.mocked(endpoints.careers).mockResolvedValue([] as never)
    vi.mocked(endpoints.wonderkids).mockResolvedValue([KID(1), KID(2, { overall: 70, potential: 88 })] as never)
    vi.mocked(endpoints.playerFacets).mockResolvedValue({ leagueOvr: 62, leagueName: 'League Two' } as never)
  })

  it('dolu (kariyersiz): tablo; Lig seviyesi ve kova sütunları yok', async () => {
    renderAt()
    const table = await screen.findByRole('table', { name: 'Genç yetenekler' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).queryByRole('columnheader', { name: 'Ulaşılabilirlik' })).toBeNull()
    expect(endpoints.wonderkids).toHaveBeenCalledWith(expect.objectContaining({ maxAge: 21, minPot: 70, sort: 'potential', career: undefined }))
  })

  it('kariyerde: Lig seviyesi (kariyerin lig gücüne göre) ve ulaşılabilirlik kovası', async () => {
    careerStore.set(7)
    vi.mocked(endpoints.careers).mockResolvedValue([{ id: 7, clubId: 1, clubName: 'Crewe', budgetEur: 0, squadSize: 25 }] as never)
    vi.mocked(endpoints.wonderkids).mockResolvedValue([KID(1, { feasibility: 'ALINABILIR' })] as never)
    renderAt()
    const table = await screen.findByRole('table', { name: 'Genç yetenekler' })
    await waitFor(() => expect(within(table).getByText('Ligin üstünde (+4)')).toBeInTheDocument())
    expect(within(table).getByText('Alınabilir')).toBeInTheDocument()
    expect(endpoints.wonderkids).toHaveBeenCalledWith(expect.objectContaining({ career: 7 }))
  })

  it('KARIYER-UX FAZ 5: kariyerde satırda "Kısa listeye ekle" (ortak ShortlistButton); kariyersiz yok', async () => {
    careerStore.set(7)
    vi.mocked(endpoints.careers).mockResolvedValue([{ id: 7, clubId: 1, clubName: 'Crewe', budgetEur: 0, squadSize: 25 }] as never)
    renderAt()
    const table = await screen.findByRole('table', { name: 'Genç yetenekler' })
    const add = (await within(table).findAllByRole('button', { name: 'Kısa listeye ekle' }))[0]
    await waitFor(() => expect(add).toBeEnabled())
    fireEvent.click(add)
    await waitFor(() => expect(endpoints.shortlistAdd).toHaveBeenCalledWith(7, 1, {}))
  })

  it('kariyersiz: kısa liste düğmesi yok', async () => {
    renderAt()
    const table = await screen.findByRole('table', { name: 'Genç yetenekler' })
    expect(within(table).queryByRole('button', { name: 'Kısa listeye ekle' })).toBeNull()
  })

  it('süzgeçler URL\'de: hazır seçim ve mevki çipi adrese yazılır, adresten okunur', async () => {
    renderAt('/wonderkids?mevki=RW&yas=19&pot=80')
    await waitFor(() => expect(endpoints.wonderkids).toHaveBeenCalledWith(expect.objectContaining({ pos: 'RW', maxAge: 19, minPot: 80 })))
    fireEvent.click(screen.getByRole('button', { name: 'Ucuz cevherler' }))
    expect(screen.getByTestId('where')).toHaveTextContent('sirala=value')
    fireEvent.click(screen.getByRole('button', { name: 'ST' }))
    expect(screen.getByTestId('where')).toHaveTextContent('mevki=ST')
  })

  it('rol seçiliyken uyum yüzdesi ve etiketi aynı sayıdan (levelFit), ham rol puanı gösterilmez', async () => {
    vi.mocked(endpoints.wonderkids).mockResolvedValue([KID(1, { roleScore: 52, roleLevelFit: 70, roleFitLabel: 'GOOD', roleBadge: 'GREEN', projectedFitLabel: 'GOOD', rolePosition: 'ST' })] as never)
    renderAt('/wonderkids?rol=poacher_attack&mevki=ST')
    expect((await screen.findAllByLabelText('Rol için uygun, yüzde 70')).length).toBeGreaterThan(0)
    expect(screen.queryByText('%52')).toBeNull()
  })

  it('boş ve hata durumları', async () => {
    vi.mocked(endpoints.wonderkids).mockResolvedValueOnce([] as never)
    const { unmount } = renderAt()
    expect(await screen.findByText(/Bu ölçütlerde genç yetenek yok/)).toBeInTheDocument()
    unmount()
    vi.mocked(endpoints.wonderkids).mockRejectedValue(new Error('ağ'))
    renderAt()
    expect(await screen.findByText('Genç yetenekler yüklenemedi.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument()
  })
})
