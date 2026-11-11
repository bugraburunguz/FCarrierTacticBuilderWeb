import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { MatchPlan, OpponentReport } from '../../api/types'
import { MatchCenterPage } from './MatchCenterPage'

vi.mock('../../api/endpoints', () => ({
  endpoints: { careers: vi.fn(), matchOpponents: vi.fn(), opponentReport: vi.fn(), matchPlan: vi.fn(), formations: vi.fn(), squad: vi.fn(), mainTactic: vi.fn() },
}))

const CAREER = { id: 7, name: 'Test', clubId: 1, clubName: 'Bizim Kulüp', budgetEur: 1_000_000, season: 1, squadSize: 11, gender: 0 }
const F442 = {
  id: '4-4-2', slots: [
    { slotId: 'GK', position: 'GK', group: 'GK', defaultRole: 'r', x: 50, y: 90 },
    { slotId: 'CB1', position: 'CB', group: 'DEF', defaultRole: 'r', x: 40, y: 75 },
    { slotId: 'ST1', position: 'ST', group: 'ATT', defaultRole: 'r', x: 45, y: 15 },
  ],
}

const report = (over: Partial<OpponentReport> = {}): OpponentReport => ({
  teamId: 55, name: 'Rakip FC', leagueName: 'League Two',
  formation: { name: '4-4-2', matchedFormationId: '4-4-2', defaultFormation: true, slots: [{ index: 0, position: 'GK', roleCode: 3 }] },
  lines: { ours: { overall: 70, attack: 72, midfield: 69, defence: 68 }, opponent: { overall: 74, attack: 75, midfield: 73, defence: 70 } },
  buildUpPlay: 'Balanced', defensiveDepth: 55,
  likelyEleven: [
    { slotId: 'GK', position: 'GK', playerId: 501, name: 'Rakip Kaleci', overall: 70, averageRating: 6.9 },
    { slotId: 'CB1', position: 'CB', playerId: 502, name: 'Rakip Stoper', overall: 69, averageRating: null },
    { slotId: 'ST1', position: 'ST', playerId: 503, name: 'Rakip Golcü', overall: 75, averageRating: 7.6 },
  ],
  dangerousPlayers: [{ playerId: 503, name: 'Rakip Golcü', overall: 75, appearances: 20, goals: 12, assists: 4, averageRating: 7.6 }],
  setPieces: { captain: { playerId: 502, name: 'Rakip Stoper' }, penaltyTaker: { playerId: 503, name: 'Rakip Golcü' } },
  cardRisk: [{ playerId: 502, name: 'Rakip Stoper', appearances: 20, yellowCards: 7, redCards: 1 }],
  missing: [], ...over,
})

const plan = (over: Partial<MatchPlan> = {}): MatchPlan => ({
  opponentTeamId: 55, ourFormation: { id: '4-4-2', source: 'MAIN_TACTIC' },
  ourEleven: [
    { slotId: 'GK', position: 'GK', playerId: 10, name: 'Bizim Kaleci', overall: 68, lastRatings: [7, 6], recentAverage: 6.5, restSuggested: false },
    { slotId: 'CB1', position: 'CB', playerId: 21, name: 'Yorgun Stoper', overall: 66, lastRatings: [8], recentAverage: 8, restSuggested: true },
    { slotId: 'ST1', position: 'ST', playerId: 30, name: 'Bizim Golcü', overall: 70, lastRatings: [], recentAverage: null, restSuggested: false },
  ],
  restCandidates: [{ playerId: 21, name: 'Yorgun Stoper', minutes: 270, matches: 3 }],
  tacticalNotes: [{ code: 'KEY_THREAT', text: 'Rakip Golcü 12 gol attı: yakın markaj.' }, { code: 'OPP_ATTACK_STRONG', text: 'Rakip hücumu 3 puan güçlü.' }],
  setPieces: { ourAerialThreats: [{ playerId: 21, name: 'Yorgun Stoper', score: 80 }], theirAerialThreats: [{ playerId: 502, name: 'Rakip Stoper', score: 82 }], theirCornerTaker: { playerId: 503, name: 'Rakip Golcü' } },
  missing: [], ...over,
})

function Where() {
  return <p data-testid="where">{useLocation().search}</p>
}

function renderAt(path = '/career/match') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/career/match" element={<><MatchCenterPage /><Where /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(endpoints.careers).mockReset().mockResolvedValue([CAREER] as never)
  vi.mocked(endpoints.matchOpponents).mockReset().mockResolvedValue([
    { teamId: 55, name: 'Rakip FC', leagueName: 'League Two', overall: 72, sameLeague: true, competitionIds: [] },
    { teamId: 66, name: 'Uzak Kulüp', leagueName: 'Premier League', overall: 80, sameLeague: false, competitionIds: [] },
  ] as never)
  vi.mocked(endpoints.opponentReport).mockReset().mockResolvedValue(report())
  vi.mocked(endpoints.matchPlan).mockReset().mockResolvedValue(plan())
  vi.mocked(endpoints.formations).mockReset().mockResolvedValue([F442] as never)
  vi.mocked(endpoints.squad).mockReset().mockResolvedValue([
    { player: { id: 10, name: 'Bizim Kaleci', positions: ['GK'], overall: 68 } },
    { player: { id: 11, name: 'Eski Stoper', positions: ['CB'], overall: 64 } },
    { player: { id: 21, name: 'Yorgun Stoper', positions: ['CB'], overall: 66 } },
    { player: { id: 30, name: 'Bizim Golcü', positions: ['ST'], overall: 70 } },
  ] as never)
  vi.mocked(endpoints.mainTactic).mockReset().mockResolvedValue({ formation: '4-4-2', lineup: { GK: 10, CB1: 11, ST1: 30 }, slots: [] } as never)
})

describe('FCA-23 Maç Merkezi', () => {
  it('rakip seçilmemişken başlangıç ekranı; rapor ve plan istenmez', async () => {
    renderAt()
    expect(await screen.findByText(/Rakibi seç/)).toBeInTheDocument()
    expect(endpoints.opponentReport).not.toHaveBeenCalled()
    expect(endpoints.matchPlan).not.toHaveBeenCalled()
  })

  it('rakip seçici lige göre gruplu ve aranabilir; seçim adrese yazılır (?rakip=)', async () => {
    renderAt()
    const select = await screen.findByRole('combobox', { name: 'Rakip' }) as HTMLSelectElement
    await waitFor(() => expect(select.querySelectorAll('optgroup')).toHaveLength(2))
    expect([...select.querySelectorAll('optgroup')].map((g) => g.label)).toEqual(['League Two', 'Premier League'])
    fireEvent.change(screen.getByLabelText('Rakip ara'), { target: { value: 'uzak' } })
    expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toEqual(expect.arrayContaining(['Uzak Kulüp · 80']))
    expect(select.querySelectorAll('optgroup')).toHaveLength(1)
    fireEvent.change(select, { target: { value: '66' } })
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('?rakip=66'))
    await waitFor(() => expect(endpoints.opponentReport).toHaveBeenCalledWith(7, 66))
  })

  it('Rakip bölümü: varsayılan diziliş notu, sahada 11 (mevki, rol adı yok), hat güçleri yan yana, oyun kurma, tehlikeli oyuncular, duran top, kart riski', async () => {
    renderAt('/career/match?rakip=55')
    const section = await screen.findByRole('region', { name: 'Rakip' })
    expect(await within(section).findByText('Varsayılan diziliş; AI maç içinde değiştirebilir')).toBeInTheDocument()
    // Saha piyonları soyadı yazar, tam ad title'da; rol adı yok, mevki etiketi var.
    expect(await within(section).findByTitle('Rakip Kaleci')).toBeInTheDocument()
    expect(within(section).queryByText(/roleCode|Rol /)).toBeNull()
    const lines = within(section).getByRole('table', { name: 'Hat güçleri' })
    const attack = within(lines).getByRole('rowheader', { name: 'Hücum' }).closest('tr')!
    expect(within(attack).getAllByRole('cell').map((c) => c.textContent)).toEqual(['72', '75', '−3'])
    expect(within(section).getByText(/Oyun kurma/).parentElement).toHaveTextContent('Balanced')
    expect(within(section).getByText(/Savunma derinliği/).parentElement).toHaveTextContent('55')
    const danger = within(section).getByRole('list', { name: 'Tehlikeli oyuncular' })
    expect(danger).toHaveTextContent('Rakip Golcü')
    expect(danger).toHaveTextContent('12 G · 4 A')
    expect(danger).toHaveTextContent('7,60')
    const sets = within(section).getByRole('list', { name: 'Duran top ve kaptan' })
    expect(sets).toHaveTextContent('Kaptan: Rakip Stoper')
    expect(sets).toHaveTextContent('Penaltı: Rakip Golcü')
    expect(within(section).getByRole('list', { name: 'Kart riski' })).toHaveTextContent('7 sarı · 1 kırmızı')
  })

  it('Maç planı: önerilen ilk 11, dinlendirme adayı işaretli ama ilk 11\'de; taktik notları; duran top eşleşmesi; ana taktikten fark', async () => {
    renderAt('/career/match?rakip=55')
    const section = await screen.findByRole('region', { name: 'Maç planı' })
    const eleven = await within(section).findByRole('list', { name: 'Önerilen ilk 11' })
    const tired = within(eleven).getByText('Yorgun Stoper').closest('li')!
    expect(tired).toHaveTextContent('Dinlendir')
    expect(within(section).getByRole('list', { name: 'Dinlendirme adayları' })).toHaveTextContent('Yorgun Stoper · 3 maç · 270 dk')
    const notes = within(section).getByRole('list', { name: 'Taktik notları' })
    expect(within(notes).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Rakip Golcü 12 gol attı: yakın markaj.', 'Rakip hücumu 3 puan güçlü.'])
    const setPieces = within(section).getByRole('list', { name: 'Duran top eşleşmesi' })
    expect(setPieces).toHaveTextContent('Yorgun Stoper')
    expect(setPieces).toHaveTextContent('Rakip Stoper')
    expect(await within(section).findByText('Öneride Eski Stoper yerine Yorgun Stoper')).toBeInTheDocument()
  })

  it('ana taktik yoksa (takım varsayılanı) fark gösterilmez', async () => {
    vi.mocked(endpoints.mainTactic).mockResolvedValue(null as never)
    vi.mocked(endpoints.matchPlan).mockResolvedValue(plan({ ourFormation: { id: '4-4-2', source: 'TEAM_DEFAULT' } }))
    renderAt('/career/match?rakip=55')
    const section = await screen.findByRole('region', { name: 'Maç planı' })
    await within(section).findByRole('list', { name: 'Önerilen ilk 11' })
    expect(within(section).queryByText(/yerine/)).toBeNull()
  })

  it('missing[] doluysa ilgili bölüm yerine kısa açıklama ve içe aktarma bağlantısı', async () => {
    vi.mocked(endpoints.opponentReport).mockResolvedValue(report({ missing: ['SEASON_STATS', 'SET_PIECES'], dangerousPlayers: [], cardRisk: [], setPieces: null }))
    renderAt('/career/match?rakip=55')
    const section = await screen.findByRole('region', { name: 'Rakip' })
    expect(await within(section).findByText(/Sezon istatistiği yok/)).toBeInTheDocument()
    expect(within(section).getByText(/Duran top atıcıları kayıtta yok/)).toBeInTheDocument()
    expect(within(section).queryByRole('list', { name: 'Tehlikeli oyuncular' })).toBeNull()
    expect(within(section).queryByText('Kart riski')).toBeNull()
    expect(within(section).getAllByRole('link', { name: 'İçe aktar' })[0]).toHaveAttribute('href', '/career/import')
  })

  it('uç hata verirse sayfa çökmez: bölümde hata metni, seçici çalışır', async () => {
    vi.mocked(endpoints.opponentReport).mockRejectedValueOnce(new Error('500'))
    vi.mocked(endpoints.matchPlan).mockRejectedValueOnce(new Error('404'))
    renderAt('/career/match?rakip=55')
    expect(await screen.findByText('Rakip raporu alınamadı.')).toBeInTheDocument()
    expect(await screen.findByText('Maç planı alınamadı.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Rakip' })).toBeEnabled()
  })

  it('kullanıcı takımı bilinmiyorsa (boş rakip listesi) içe aktarma çağrısı', async () => {
    vi.mocked(endpoints.matchOpponents).mockResolvedValue([] as never)
    renderAt()
    expect(await screen.findByText(/Takımın henüz bilinmiyor/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'İçe aktar' })).toHaveAttribute('href', '/career/import')
  })
})
