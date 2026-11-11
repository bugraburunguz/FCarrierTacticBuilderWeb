import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { PlayerMatches } from '../../api/types'
import { MatchesTab } from './MatchesTab'

vi.mock('../../api/endpoints', () => ({ endpoints: { playerMatches: vi.fn() } }))

const data: PlayerMatches = {
  ratings: [
    { date: '2027-03-05', minutes: 90, position: 25, rating: 9 },
    { date: '2027-02-27', minutes: 64, position: 28, rating: 6 },
    { date: '2027-02-20', minutes: 90, position: 25, rating: 7 },
  ],
  seasons: [
    { teamId: 1, teamName: 'Crewe Alexandra', competitionId: 1512, appearances: 20, goals: 8, assists: 3, averageRating: 7.24, yellowCards: 2, redCards: 0, cleanSheets: 0 },
    { teamId: 2, teamName: 'Kiralık FC', competitionId: 1513, appearances: 5, goals: 1, assists: 0, averageRating: null, yellowCards: 0, redCards: 1, cleanSheets: 2 },
  ],
}

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><MatchesTab careerId={4} playerId={7} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.mocked(endpoints.playerMatches).mockReset())

describe('FCA-22 Maçlar sekmesi', () => {
  it('maç notları en eskiden en yeniye (en yeni sağda); her notta tarih, dakika ve not; 28/29 mevki kodu gösterilmez', async () => {
    vi.mocked(endpoints.playerMatches).mockResolvedValue(data)
    renderTab()
    const chart = await screen.findByRole('list', { name: 'Maç notları' })
    const items = within(chart).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('20 Şub 2027'), expect.stringContaining('27 Şub 2027'), expect.stringContaining('5 Mar 2027'),
    ])
    expect(items[2]).toHaveTextContent('90 dk')
    expect(items[2]).toHaveTextContent('Not 9')
    expect(items[2]).toHaveTextContent('Mevki 25')
    expect(items[1]).toHaveTextContent('64 dk')
    expect(items[1]).not.toHaveTextContent('Mevki')
    expect(endpoints.playerMatches).toHaveBeenCalledWith(4, 7)
  })

  it('turnuva bazında sezon tablosu; adı bilinmeyen turnuva kodla, kiralık kulüp ayrı satır; ortalama yoksa "—"', async () => {
    vi.mocked(endpoints.playerMatches).mockResolvedValue(data)
    renderTab()
    const table = await screen.findByRole('table', { name: 'Sezon istatistiği' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Turnuva 1512')
    expect(rows[0]).toHaveTextContent('Crewe Alexandra')
    expect(within(rows[0]).getAllByRole('cell').map((c) => c.textContent)).toEqual(expect.arrayContaining(['20', '8', '3', '7,24', '2 / 0', '0']))
    expect(rows[1]).toHaveTextContent('Turnuva 1513')
    expect(rows[1]).toHaveTextContent('Kiralık FC')
    expect(within(rows[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual(expect.arrayContaining(['—', '0 / 1', '2']))
  })

  it('veri yoksa boş durum ve içe aktarma bağlantısı', async () => {
    vi.mocked(endpoints.playerMatches).mockResolvedValue({ ratings: [], seasons: [] })
    renderTab()
    expect(await screen.findByText(/Maç verisi yok\. LE 2\.0\.5 export'unu içe aktar/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /İçe aktar/ })).toHaveAttribute('href', '/career/import')
  })

  it('uç hata verirse (ör. eski backend 404) sessizce boş durum; sayfa çökmez', async () => {
    vi.mocked(endpoints.playerMatches).mockRejectedValueOnce(new Error('404'))
    renderTab()
    expect(await screen.findByText(/Maç verisi yok/)).toBeInTheDocument()
    // Hata tekrar istek döngüsüne girmez (eski backend'e boşuna istek atılmaz).
    await new Promise((r) => setTimeout(r, 100))
    expect(endpoints.playerMatches).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
