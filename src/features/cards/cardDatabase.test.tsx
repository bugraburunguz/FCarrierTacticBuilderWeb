import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { PageResponse, PlayerSummary } from '../../api/types'
import { CardDatabasePage } from './CardDatabasePage'

vi.mock('../../api/endpoints', () => ({
  endpoints: {
    players: vi.fn(),
    leagues: vi.fn(() => Promise.resolve([{ id: 13, name: 'Premier League', count: 1 }])),
    nationalities: vi.fn(() => Promise.resolve([{ id: 18, name: 'Fransa', count: 1 }])),
  },
}))

const player = (id: number, name: string, overall: number, positions = ['ST']): PlayerSummary => ({ id, name, overall, positions, age: 25, club: 'Arsenal', league: 'Premier League', weakFoot: 4, skillMoves: 4, valuationEstimated: false })
const page = (items: PlayerSummary[], p = 0, totalItems = items.length, size = 48): PageResponse<PlayerSummary> => ({ items, page: p, size, totalItems })

function renderPage(path = '/players') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <CardDatabasePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(endpoints.players).mockReset()
  vi.mocked(endpoints.players).mockResolvedValue(page([player(1, 'Ada Santrfor', 91), player(2, 'Bora Kanat', 88, ['LW', 'RW'])]))
})

describe('kart veritabanı', () => {
  it('kartları ızgarada gösterir ve toplamı yazar', async () => {
    renderPage()
    expect(await screen.findByRole('link', { name: /Ada Santrfor, 91/ })).toHaveAttribute('href', '/players/1')
    expect(screen.getByText('2 kart · 2 gösteriliyor')).toBeInTheDocument()
  })

  it('yapışkan filtre çubuğu opak yüzeydir (Q5: altından geçen kart görünmez)', async () => {
    renderPage()
    await screen.findByText(/2 kart/)
    expect(screen.getByRole('region', { name: 'Süzgeçler' }).className).toContain('glass-sticky')
  })

  it('mevki çipi sunucu sorgusuna mevki ekler', async () => {
    renderPage()
    await screen.findByText(/2 kart/)
    fireEvent.click(screen.getByRole('button', { name: 'ST' }))
    await waitFor(() => expect(vi.mocked(endpoints.players).mock.calls.some((c) => c[0].pos?.[0] === 'ST')).toBe(true))
  })

  it('süzgeçler adres çubuğundan okunur (tablo görünümü + OVR en az)', async () => {
    renderPage('/players?gorunum=table&ovrmin=85')
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(vi.mocked(endpoints.players).mock.calls[0][0]).toMatchObject({ ovr_min: 85 })
  })

  it('tabloda OVR/Oyuncu sütunları yalnız mobilde (<820px) yapışkan ve opak; masaüstünde satır tek tonlu', async () => {
    renderPage('/players?gorunum=table')
    const cell = (await screen.findByRole('link', { name: 'Ada Santrfor' })).closest('td')!
    const ovr = cell.previousElementSibling as HTMLElement
    for (const el of [ovr, cell, screen.getByRole('columnheader', { name: /OVR/ })]) {
      expect(el.className.split(' ')).toContain('table-sticky-col')
      expect(el.className.split(' ')).not.toContain('sticky')
      expect(el.className.split(' ')).not.toContain('glass-sticky')
    }
  })

  it('tabloda başlığa tıklayınca sıralama değişir ve aria-sort güncellenir', async () => {
    renderPage('/players?gorunum=table')
    const header = (await screen.findByRole('columnheader', { name: /Yaş/ }))
    expect(header).toHaveAttribute('aria-sort', 'none')
    fireEvent.click(within(header).getByRole('button'))
    await waitFor(() => expect(screen.getByRole('columnheader', { name: /Yaş/ })).toHaveAttribute('aria-sort', 'descending'))
  })

  it('daha fazla yükle bir sonraki sayfayı ekler', async () => {
    vi.mocked(endpoints.players).mockResolvedValueOnce(page([player(1, 'Ada Santrfor', 91)], 0, 2, 1)).mockResolvedValueOnce(page([player(2, 'Bora Kanat', 88)], 1, 2, 1))
    renderPage()
    await screen.findByText('2 kart · 1 gösteriliyor')
    fireEvent.click(screen.getByRole('button', { name: /kart daha yükle/ }))
    expect(await screen.findByText('2 kart · 2 gösteriliyor')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /kart daha yükle/ })).toBeNull()
  })

  it('yükleniyor iskeleti, boş durum ve hata durumu', async () => {
    vi.mocked(endpoints.players).mockResolvedValueOnce(page([]))
    renderPage('/players?ara=zzz')
    expect(screen.getByLabelText('Yükleniyor')).toBeInTheDocument()
    expect(await screen.findByText('Bu süzgeçlere uyan kart yok.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Süzgeçleri temizle' })).toBeInTheDocument()
  })

  it('hatada yeniden dene gösterir', async () => {
    vi.mocked(endpoints.players).mockRejectedValueOnce(new Error('x'))
    renderPage()
    expect(await screen.findByText('Kartlar yüklenemedi.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument()
  })
})

describe('mobil kart veritabanı', () => {
  const original = window.matchMedia
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({ matches: query.includes('max-width: 819px'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }) as unknown as MediaQueryList) as typeof window.matchMedia
  })
  afterEach(() => {
    window.matchMedia = original
  })

  it('gelişmiş süzgeçler "Filtreler" sheet\'inde; mevki çipleri yatay kaydırılan tek satır', async () => {
    renderPage()
    await screen.findByText(/2 kart/)
    expect(screen.queryByLabelText('OVR en az')).toBeNull()
    expect(screen.getByRole('group', { name: 'Mevki' }).className).toContain('max-[819px]:overflow-x-auto')
    fireEvent.click(screen.getByRole('button', { name: /Filtreler/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Filtreler' })
    fireEvent.change(within(sheet).getByLabelText('OVR en az'), { target: { value: '85' } })
    await waitFor(() => expect(screen.getByRole('button', { name: /Filtreler \(1\)/, hidden: true })).toBeInTheDocument())
    expect(within(sheet).getByRole('button', { name: /kartı göster/ })).toBeInTheDocument()
  })
})
