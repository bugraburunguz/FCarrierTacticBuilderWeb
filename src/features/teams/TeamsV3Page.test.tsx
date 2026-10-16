import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { TeamsV3Page } from './TeamsV3Page'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))
vi.mock('../../api/endpoints', () => ({ endpoints: { careers: vi.fn(), careerTeams: vi.fn(), careerTeam: vi.fn() } }))

const team = (teamId: number, name: string, league: string, overall: number) => ({ teamId, name, league, overall, attack: overall + 1, midfield: overall, defence: overall - 1, playerCount: 25 })
const TEAMS = [team(1, 'Crewe Alexandra', 'EFL League Two', 62), team(2, 'Port Vale', 'EFL League Two', 64), team(3, 'Leeds United', 'Premier League', 76)]
const PROFILE = { team: TEAMS[1], strengths: ['Hücum güçlü'], weaknesses: [], culture: ['Genç kadro'], topPlayers: [{ id: 9, name: 'Kilit Oyuncu', overall: 70, positions: ['ST'], valuationEstimated: false }] }

function Where() {
  const l = useLocation()
  return <output data-testid="where">{l.search}</output>
}
function renderAt(url = '/teams') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}><TeamsV3Page /><Where /></MemoryRouter>
    </QueryClientProvider>,
  )
}

/** V3-07c: /teams v3 Katalog — arama/lig/sıralama URL'de, kulüp gücü sütunları, kariyerin kulübü vurgulu, takım seçince profil paneli. */
describe('TeamsV3Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    careerStore.set(7)
    vi.mocked(endpoints.careers).mockResolvedValue([{ id: 7, clubId: 737, clubName: 'Crewe Alexandra', budgetEur: 0, squadSize: 25 }] as never)
    vi.mocked(endpoints.careerTeams).mockResolvedValue(TEAMS as never)
    vi.mocked(endpoints.careerTeam).mockResolvedValue(PROFILE as never)
  })

  it('dolu: güce göre sıralı tablo; kariyerin kulübü işaretli', async () => {
    renderAt()
    const table = await screen.findByRole('table', { name: 'Takımlar' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((r) => r.querySelector('th')?.textContent)).toEqual([expect.stringContaining('Leeds United'), expect.stringContaining('Port Vale'), expect.stringContaining('Crewe Alexandra')])
    expect(rows[2]).toHaveAttribute('aria-current', 'true')
    expect(within(rows[2]).getByText('Senin kulübün')).toBeInTheDocument()
  })

  it('lig süzgeci ve sıralama URL\'de', async () => {
    renderAt('/teams?lig=EFL%20League%20Two&sirala=name')
    const table = await screen.findByRole('table', { name: 'Takımlar' })
    const names = within(table).getAllByRole('row').slice(1).map((r) => r.querySelector('th')?.textContent)
    expect(names).toEqual([expect.stringContaining('Crewe'), expect.stringContaining('Port Vale')])
    fireEvent.change(screen.getByLabelText('Lig'), { target: { value: '' } })
    expect(screen.getByTestId('where').textContent).not.toContain('lig=')
  })

  it('arama sunucuya gider ve URL\'ye yazılır', async () => {
    renderAt()
    await screen.findByRole('table', { name: 'Takımlar' })
    fireEvent.change(screen.getByLabelText('Ara'), { target: { value: 'Vale' } })
    expect(screen.getByTestId('where')).toHaveTextContent('q=Vale')
    await waitFor(() => expect(endpoints.careerTeams).toHaveBeenCalledWith(7, 'Vale'))
  })

  it('takım seçilince profil (güçlü/zayıf yönler, kilit oyuncular); ?takim= ile açılır', async () => {
    renderAt('/teams?takim=2')
    expect(await screen.findByText('Hücum güçlü')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Kilit Oyuncu/ })).toHaveAttribute('href', '/players/9')
    expect(endpoints.careerTeam).toHaveBeenCalledWith(7, 2)
  })

  it('boş: içe aktarma öneren durum', async () => {
    vi.mocked(endpoints.careerTeams).mockResolvedValue([] as never)
    renderAt()
    expect(await screen.findByRole('link', { name: 'Kariyer verisini içe aktar' })).toHaveAttribute('href', '/career/import')
  })

  it('hata: sebep + tekrar dene', async () => {
    vi.mocked(endpoints.careerTeams).mockRejectedValue(new Error('ağ'))
    renderAt()
    expect(await screen.findByText('Takımlar yüklenemedi.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument()
  })
})
