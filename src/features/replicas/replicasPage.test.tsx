import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { ReplicaSummary, SquadFit, TacticRequest } from '../../api/types'
import { careerStore } from '../../state/careerStore'
import { modeStore } from '../../state/modeStore'
import { ReplicasPage } from './ReplicasPage'
import { FIT_LIMIT } from './replicaFilter'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))

vi.mock('../../api/endpoints', () => ({
  endpoints: {
    replicas: vi.fn(),
    formations: vi.fn(() => Promise.resolve([])),
    lineup: vi.fn(),
  },
}))

const replica = (over: Partial<ReplicaSummary>): ReplicaSummary => ({
  id: 'r', category: 'UCL_WINNER', club: 'Barcelona', coach: 'Pep Guardiola', season: '2010-11', league: 'ES_LALIGA', formationId: '4-3-3 (2)', eaFormation: '4-3-3 (2)', buildUp: 'SHORT_PASSING', defensiveApproach: 'AGGRESSIVE', lineHeight: 92,
  fidelity: 4, tacticCode: 'JBiHyZ597xmL', slots: [], eaOrderedSlots: [], attentionCount: 0, verified: false, ...over,
})

const LIST = [
  replica({ id: 'bjk', club: 'Beşiktaş', coach: 'Şenol Güneş', season: '2016-17', league: 'TR_SUPER_LIG', category: 'TURKISH_BIG4', eaFormation: '4-2-3-1 (2)', verified: true }),
  replica({ id: 'barca' }),
  replica({ id: 'inter', club: 'Inter', coach: 'Simone Inzaghi', season: '2022-23', league: 'IT_SERIE_A', category: 'LEGENDARY_SQUAD', eaFormation: '5-3-2', buildUp: 'BALANCED', verified: true }),
  replica({ id: 'milan', club: 'Milan', coach: 'Carlo Ancelotti', season: '2006-07', league: 'IT_SERIE_A', category: 'UCL_WINNER', eaFormation: '4-3-2-1' }),
  replica({ id: 'celtic', club: 'Celtic', coach: 'Ange Postecoglou', season: '2022-23', league: 'SCO_PREMIERSHIP', category: 'UNDERRATED_COACH' }),
]

const probe = { search: '' }
function LocationProbe() {
  const { search } = useLocation()
  useEffect(() => {
    probe.search = search
  }, [search])
  return null
}

function renderPage(path = '/replicas') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/replicas" element={<ReplicasPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(endpoints.replicas).mockResolvedValue(LIST)
  vi.mocked(endpoints.lineup).mockReset()
  modeStore.set('ut')
  careerStore.set(undefined)
})

afterEach(() => {
  careerStore.set(undefined)
})

describe('lig sekmeleri (REP-d)', () => {
  it('sıra Tümü · Süper Lig · Premier League · LaLiga · Serie A · Bundesliga · Ligue 1 · Diğer; her sekmede sayı', async () => {
    renderPage()
    await screen.findByText(/Inter/)
    const tabs = within(screen.getByRole('tablist', { name: 'Lig' })).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Tümü5', 'Süper Lig1', 'Premier League0', 'LaLiga1', 'Serie A2', 'Bundesliga0', 'Ligue 10', 'Diğer1'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('sekme ?lig= ile adreste durur; seçili lig düz liste gösterir', async () => {
    renderPage('/replicas?lig=serie-a')
    expect(await screen.findByText(/Inter/)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Serie A/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText(/Beşiktaş/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Serie A · 2/ })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: /Diğer/ }))
    expect(probe.search).toContain('lig=diger')
    expect(await screen.findByText(/Celtic/)).toBeInTheDocument()
  })

  it('"Tümü" lige göre gruplu; başlıkta lig adı ve sayı; grup katlanır', async () => {
    renderPage()
    const serieA = await screen.findByRole('button', { name: 'Serie A · 2' })
    expect(serieA).toHaveAttribute('aria-expanded', 'true')
    const headers = screen.getAllByRole('button', { name: / · \d+$/ }).map((b) => b.getAttribute('aria-label'))
    expect(headers).toEqual(['Süper Lig · 1', 'LaLiga · 1', 'Serie A · 2', 'Diğer · 1'])
    fireEvent.click(serieA)
    expect(serieA).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/Inter/)).toBeNull()
    expect(screen.getByText(/Beşiktaş/)).toBeInTheDocument()
  })
})

describe('filtre çipleri (REP-d)', () => {
  it('kategori çoklu seçilir ve adreste tutulur', async () => {
    renderPage()
    await screen.findByText(/Inter/)
    const group = screen.getByRole('group', { name: 'Kategori' })
    fireEvent.click(within(group).getByRole('button', { name: 'Türk 4 büyükler' }))
    fireEvent.click(within(group).getByRole('button', { name: 'Efsane kadro' }))
    expect(within(group).getByRole('button', { name: 'Türk 4 büyükler' })).toHaveAttribute('aria-pressed', 'true')
    expect(probe.search).toContain('kategori=TURKISH_BIG4%2CLEGENDARY_SQUAD')
    expect(screen.getByText(/Beşiktaş/)).toBeInTheDocument()
    expect(screen.getByText(/Inter/)).toBeInTheDocument()
    expect(screen.queryByText(/Milan/)).toBeNull()
  })

  it('formasyon ailesi, oyun tarzı ve "Doğrulandı" çipleri süzer', async () => {
    renderPage()
    await screen.findByText(/Inter/)
    fireEvent.click(within(screen.getByRole('group', { name: 'Formasyon ailesi' })).getByRole('button', { name: '5 defans' }))
    expect(screen.queryByText(/Milan/)).toBeNull()
    expect(screen.getByText(/Inter/)).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('group', { name: 'Formasyon ailesi' })).getByRole('button', { name: '5 defans' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Oyun tarzı' })).getByRole('button', { name: 'Dengeli' }))
    expect(screen.queryByText(/Barcelona/)).toBeNull()
    fireEvent.click(within(screen.getByRole('group', { name: 'Oyun tarzı' })).getByRole('button', { name: 'Dengeli' }))
    fireEvent.click(screen.getByRole('button', { name: 'Doğrulandı' }))
    expect(probe.search).toContain('dogrulandi=1')
    expect(screen.getByText(/Beşiktaş/)).toBeInTheDocument()
    expect(screen.queryByText(/Celtic/)).toBeNull()
  })

  it('arama kulüp, hoca ve sezonda kalır', async () => {
    renderPage()
    await screen.findByText(/Inter/)
    fireEvent.change(screen.getByLabelText('Ara'), { target: { value: 'inzaghi' } })
    expect(screen.getByText(/Inter/)).toBeInTheDocument()
    expect(screen.queryByText(/Milan/)).toBeNull()
  })
})

describe('kart (REP-d)', () => {
  it('kulüp, sezon, hoca, formasyon, lig, kategori ve metinli doğrulama rozeti', async () => {
    renderPage()
    const card = (await screen.findByRole('link', { name: /Beşiktaş 2016-17/ })).closest('li')!
    expect(within(card).getByText('Şenol Güneş')).toBeInTheDocument()
    expect(within(card).getByText('4-2-3-1 (2)')).toBeInTheDocument()
    expect(within(card).getByText('Süper Lig')).toBeInTheDocument()
    expect(within(card).getByText('Türk 4 büyükler')).toBeInTheDocument()
    expect(within(card).getByText('Doğrulandı')).toBeInTheDocument()
    const unverified = screen.getByRole('link', { name: /Celtic 2022-23/ }).closest('li')!
    expect(within(unverified).queryByText('Doğrulandı')).toBeNull()
  })
})

describe('"Kadroma uyanlar" (REP-d)', () => {
  const many = Array.from({ length: 15 }, (_, i) => replica({ id: `r${i}`, club: `Kulüp ${String(i).padStart(2, '0')}`, formationId: `F${i}`, league: 'ES_LALIGA' }))
  const fit = (squadFit: number): SquadFit => ({ squadFit, summary: '', slots: [], weakLinks: [], rules: [], attackPattern: '', bench: [] })

  it('UT modunda yok', async () => {
    renderPage()
    await screen.findByText(/Inter/)
    expect(screen.queryByRole('button', { name: 'Kadroma uyanlar' })).toBeNull()
  })

  it('kariyer modunda aktif kariyer yoksa yok', async () => {
    modeStore.set('career')
    renderPage()
    await screen.findByText(/Inter/)
    expect(screen.queryByRole('button', { name: 'Kadroma uyanlar' })).toBeNull()
  })

  it('yalnız görünen ilk 12 replika hesaplanır (tek /fit/lineup, kilitsiz); uyuma göre sıralanır, yüzde kartta', async () => {
    modeStore.set('career')
    careerStore.set(7)
    vi.mocked(endpoints.replicas).mockResolvedValue(many)
    vi.mocked(endpoints.lineup).mockImplementation((_careerId: number, tactic: TacticRequest) => Promise.resolve(fit(50 + Number(tactic.formation!.slice(1)))))
    renderPage()
    await screen.findByText('Kulüp 00')
    fireEvent.click(screen.getByRole('button', { name: 'Kadroma uyanlar' }))
    expect(probe.search).toContain('uyum=1')
    await waitFor(() => expect(screen.getByText('Uyum %61')).toBeInTheDocument())
    expect(endpoints.lineup).toHaveBeenCalledTimes(FIT_LIMIT)
    vi.mocked(endpoints.lineup).mock.calls.forEach(([careerId, , locked]) => {
      expect(careerId).toBe(7)
      expect(locked).toBeUndefined()
    })
    const titles = screen.getAllByRole('link', { name: /Kulüp/ }).map((a) => a.textContent)
    expect(titles[0]).toContain('Kulüp 11')
    expect(titles[11]).toContain('Kulüp 00')
    expect(titles[12]).toContain('Kulüp 12')
    expect(screen.queryByText('Uyum %62')).toBeNull()
  })
})
