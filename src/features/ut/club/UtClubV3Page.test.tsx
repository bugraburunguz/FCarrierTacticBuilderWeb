import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../../api/endpoints'
import type { UtCard } from '../../../lib/utCard'
import { utCardStore } from '../../../state/utCardStore'
import { LOCK_PARAM } from '../../sbc/solve/lockParam'
import { UtClubV3Page } from './UtClubV3Page'

const capture = vi.hoisted(() => ({ value: undefined as unknown }))
vi.mock('../../../state/utCaptureStore', () => ({ useUtCapture: () => capture.value }))
vi.mock('../../../api/endpoints', () => ({ endpoints: { kbSbc: vi.fn(), kbSbcSet: vi.fn() } }))

const card = (key: string, name: string, rating: number, patch: Partial<UtCard> = {}): UtCard => ({ key, source: 'club', name, rating, positions: ['ST'], pile: 'club', ...patch })
const CARDS = [
  card('c:1', 'Forvet Bir', 86, { league: 'Premier League', price: 20000 }),
  card('c:2', 'Stoper İki', 78, { positions: ['CB'], duplicate: true, pile: 'storage' }),
  card('c:3', 'Orta Üç', 88, { positions: ['CM'], rarityId: 3, rarity: 'TOTW', price: 60000, instanceId: 33 }),
  card('m:4', 'Pazar Dört', 80, { source: 'market' }),
]

function Where() {
  const l = useLocation()
  return <output data-testid="where">{l.pathname + l.search}</output>
}
function renderAt(url = '/ut/club') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}><UtClubV3Page /><Where /></MemoryRouter>
    </QueryClientProvider>,
  )
}

/** V3-07c: /ut/club v3 Katalog — süzgeçler adreste, ızgara/tablo, SBC yemi rozeti, toplu seçim → "Şu SBC'de kullan" (kilitli kartlarla çözüm). */
describe('UtClubV3Page', () => {
  beforeEach(() => {
    capture.value = undefined
    vi.spyOn(utCardStore, 'get').mockReturnValue({ cards: CARDS, importedAt: '2026-10-15T10:00:00Z' })
    vi.mocked(endpoints.kbSbc).mockResolvedValue([{ id: 7700, name: 'Hibrit Ligler', category: 'UPGRADES', reward: null, status: 'CONFIRMED', challengeCount: 2 }] as never)
    vi.mocked(endpoints.kbSbcSet).mockResolvedValue({ id: 7700, name: 'Hibrit Ligler', category: 'UPGRADES', reward: null, status: 'CONFIRMED', challengeCount: 2,
      challenges: [{ id: 77001, setId: 7700, name: 'Üç Lig' }, { id: 77002, setId: 7700, name: 'Beş Lig' }] } as never)
  })
  afterEach(() => vi.restoreAllMocks())

  it('boş: kulüp içe aktarmaya yönlendirir', () => {
    vi.mocked(utCardStore.get).mockReturnValue({ cards: [], importedAt: '' })
    renderAt()
    expect(screen.getByRole('link', { name: 'Kulüp içe aktar' })).toHaveAttribute('href', '/ut/import')
  })

  it('dolu: yalnız kulüp kartları; kopya kartta "SBC yemi" rozeti ve sebebi', () => {
    renderAt()
    expect(screen.getByText(/^3 kart ·/)).toBeInTheDocument()
    const tile = screen.getByRole('listitem', { name: /Stoper İki/ })
    expect(within(tile).getByText('SBC yemi')).toHaveAttribute('title', 'Kopya')
    expect(screen.queryByRole('listitem', { name: /Pazar Dört/ })).toBeNull()
    expect(within(screen.getByRole('listitem', { name: /Orta Üç/ })).queryByText('SBC yemi')).toBeNull()
  })

  it('süzgeç adreste: ?mevki=CB açılışta; mevki çipi adrese yazar', () => {
    renderAt('/ut/club?mevki=CB')
    expect(screen.getByText(/^1 kart ·/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'CM' }))
    expect(screen.getByTestId('where')).toHaveTextContent('mevki=CB%2CCM')
  })

  it('tablo görünümü', () => {
    renderAt('/ut/club?gorunum=table')
    const table = screen.getByRole('table', { name: 'Kulüp kartları' })
    expect(within(table).getAllByRole('row')).toHaveLength(4)
  })

  it('toplu seçim → "Şu SBC\'de kullan": set ve görev seçilir, çözüm sayfasına seçili kartlar kilitli gider', async () => {
    renderAt()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seç: Forvet Bir' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seç: Stoper İki' }))
    expect(screen.getByRole('region', { name: 'Seçim' })).toHaveTextContent('2 kart seçili')
    fireEvent.click(screen.getByRole('button', { name: "Şu SBC'de kullan" }))
    const dialog = await screen.findByRole('dialog', { name: "Şu SBC'de kullan" })
    fireEvent.click(await within(dialog).findByRole('button', { name: /Hibrit Ligler/ }))
    const link = await within(dialog).findByRole('link', { name: 'Üç Lig' })
    expect(link.getAttribute('href')).toBe(`/ut/sbc/7700/77001?${LOCK_PARAM}=${encodeURIComponent('c:1,c:2')}`)
  })

  it('aktif kadrodaki kart seçilirse sebebi seçim çubuğunda yazılır (çözücü aktif kadroyu kullanmaz)', () => {
    capture.value = { activeSquad: { slots: [{ index: 0, starter: true, card: { instanceId: 33 } }] } }
    renderAt()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seç: Orta Üç' }))
    expect(screen.getByRole('region', { name: 'Seçim' })).toHaveTextContent('Orta Üç: aktif kadronda')
  })
})
