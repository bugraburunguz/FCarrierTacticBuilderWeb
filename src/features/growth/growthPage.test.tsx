import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { GrowthPage } from './GrowthPage'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: 'FREE' } }) }))
vi.mock('../../api/endpoints', () => ({
  endpoints: { careers: vi.fn(), squad: vi.fn(), snapshots: vi.fn(), snapshotDiff: vi.fn(), playerHistory: vi.fn(), development: vi.fn(), updateRatings: vi.fn() },
}))

const member = (id: number, extra: object = {}) => ({ player: { id, name: `Oyuncu ${id}`, positions: ['CM'], overall: 60 + id, potential: 75, age: 25, valuationEstimated: false, ...extra }, onLoan: false })
const snap = (id: number, season?: number) => ({ id, takenAt: `2026-10-0${id}T10:00:00Z`, season, source: 'IMPORT', playerCount: 3 })

function Where() {
  return <p data-testid="where">{useLocation().search}</p>
}

function renderPage(path = '/career/growth') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/career/growth" element={<><GrowthPage /><Where /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  careerStore.set(1)
  vi.mocked(endpoints.careers).mockResolvedValue([{ id: 1, clubName: 'Crewe', gameVersionId: 27, clubId: 9, squadSize: 3 }] as never)
  vi.mocked(endpoints.squad).mockResolvedValue([member(1), member(2, { overall: 75, potential: 75, age: 21 }), member(3)] as never)
  vi.mocked(endpoints.snapshots).mockResolvedValue([snap(3, 2), snap(2, 2), snap(1, 1)] as never)
  vi.mocked(endpoints.snapshotDiff).mockReset().mockResolvedValue({ changed: 3, transfers: 0, added: 0, removed: 0, rows: [
    { playerId: 1, name: 'Oyuncu 1', kind: 'CHANGED', overallFrom: 58, overallTo: 61 },
    { playerId: 3, name: 'Oyuncu 3', kind: 'CHANGED', overallFrom: 64, overallTo: 63 },
    { playerId: 2, name: 'Oyuncu 2', kind: 'CHANGED', overallFrom: 70, overallTo: 75 },
  ] } as never)
  vi.mocked(endpoints.playerHistory).mockReset().mockImplementation(((_c: number, p: number) => Promise.resolve([
    { snapshotId: 1, takenAt: '2026-10-01T10:00:00Z', overall: 55 + p, potential: 75, gameDate: '2027-01-15' },
    { snapshotId: 2, takenAt: '2026-10-02T10:00:00Z', overall: 58 + p, potential: 75, gameDate: '2027-03-16' },
    { snapshotId: 3, takenAt: '2026-10-03T10:00:00Z', overall: 60 + p, potential: 76, gameDate: '2027-07-14' },
  ])) as never)
})

describe('Gelişim (v3)', () => {
  it('oyuncu seçimi ↔ adres çubuğu (?oyuncu=); geçmiş seçili oyuncu için istenir', async () => {
    renderPage('/career/growth?oyuncu=3')
    const select = await screen.findByRole('combobox', { name: 'Oyuncu' })
    await waitFor(() => expect(select).toHaveValue('3'))
    await waitFor(() => expect(endpoints.playerHistory).toHaveBeenCalledWith(1, 3))
    fireEvent.change(select, { target: { value: '1' } })
    await waitFor(() => expect(screen.getByTestId('where').textContent).toContain('oyuncu=1'))
    await waitFor(() => expect(endpoints.playerHistory).toHaveBeenCalledWith(1, 1))
  })

  it('grafik: svg role="img" + özet etiket, x ekseni oyun tarihi; "Tablo olarak göster" aynı veriyi gösterir', async () => {
    renderPage('/career/growth?oyuncu=1')
    const chart = await screen.findByRole('img', { name: /OVR 56 → 61, POT 76; 3 içe aktarma, oyun tarihine göre/ })
    expect(chart).toBeInTheDocument()
    const region = screen.getByRole('region', { name: 'OVR geçmişi' })
    expect(within(region).getByText('Oyun tarihi')).toBeInTheDocument()
    fireEvent.click(within(region).getByRole('button', { name: 'Tablo olarak göster' }))
    const table = within(region).getByRole('table', { name: /OVR ve POT geçmişi/ })
    const rows = within(table).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell').map((c) => c.textContent))
    expect(rows).toEqual([['15.01.2027', '56', '75'], ['16.03.2027', '59', '75'], ['14.07.2027', '61', '76']])
  })

  it('plato uyarısı deskRules kuralıyla (≤ 24 yaş, OVR ≥ POT), metinle', async () => {
    renderPage('/career/growth?oyuncu=2')
    expect(await screen.findByRole('status', { name: 'Plato' })).toHaveTextContent('potansiyeline ulaştı')
    const view = screen.getByTestId('where')
    expect(view).toBeInTheDocument()
  })

  it('platoda olmayan oyuncuda uyarı yok', async () => {
    renderPage('/career/growth?oyuncu=1')
    await screen.findByRole('img', { name: /OVR 56/ })
    expect(screen.queryByRole('status', { name: 'Plato' })).toBeNull()
  })

  it('en çok yükselenler (azalan) ve düşenler ayrı; tablo görünümü aynı sıra', async () => {
    renderPage()
    const up = await screen.findByRole('region', { name: 'En çok yükselenler' })
    await waitFor(() => expect(within(up).getByRole('img', { name: /Oyuncu 2 \+5, Oyuncu 1 \+3/ })).toBeInTheDocument())
    const down = screen.getByRole('region', { name: 'Düşenler' })
    expect(within(down).getByRole('img', { name: /Oyuncu 3 −1/ })).toBeInTheDocument()
    fireEvent.click(within(up).getByRole('button', { name: 'Tablo olarak göster' }))
    expect(within(up).getAllByRole('row').slice(1).map((r) => r.textContent)).toEqual(['Oyuncu 270 → 75+5', 'Oyuncu 158 → 61+3'])
  })

  it('aralık seçici: son iki içe aktarma (varsayılan) / sezon başı → şimdi (sezon verisi varsa) → snapshotDiff from/to', async () => {
    renderPage()
    await screen.findByRole('region', { name: 'En çok yükselenler' })
    expect(endpoints.snapshotDiff).toHaveBeenCalledWith(1, undefined, undefined)
    fireEvent.click(screen.getByRole('radio', { name: 'Sezon başı → şimdi' }))
    await waitFor(() => expect(endpoints.snapshotDiff).toHaveBeenCalledWith(1, 2, 3))
  })

  it('tek içe aktarma: "en az iki içe aktarma gerekir" + İçe aktar bağlantısı', async () => {
    vi.mocked(endpoints.snapshots).mockResolvedValue([snap(1, 1)] as never)
    renderPage()
    expect(await screen.findByText('Gelişimi görmek için en az iki içe aktarma gerekir.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'İçe aktar' })).toHaveAttribute('href', '/career/import')
    expect(endpoints.snapshotDiff).not.toHaveBeenCalled()
  })

  it('oyuncunun geçmişi yok; hata durumu', async () => {
    vi.mocked(endpoints.playerHistory).mockResolvedValueOnce([] as never)
    const view = renderPage('/career/growth?oyuncu=1')
    expect(await screen.findByText('Bu oyuncunun içe aktarma geçmişi yok.')).toBeInTheDocument()
    view.unmount()
    vi.mocked(endpoints.playerHistory).mockRejectedValueOnce(new Error('500'))
    renderPage('/career/growth?oyuncu=1')
    expect(await screen.findByText('Gelişim geçmişi yüklenemedi.')).toBeInTheDocument()
  })

  it('yalnız mevcut uçlar: eski gelişim ucu çağrılmaz', async () => {
    renderPage('/career/growth?oyuncu=1')
    await screen.findByRole('img', { name: /OVR 56/ })
    expect(endpoints.development).not.toHaveBeenCalled()
  })
})
