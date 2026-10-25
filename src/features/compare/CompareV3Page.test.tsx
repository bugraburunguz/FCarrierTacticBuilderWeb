import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { compareStore } from '../../state/compareStore'
import { modeStore } from '../../state/modeStore'
import { CompareV3Page } from './CompareV3Page'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: false }) }))
vi.mock('../../api/endpoints', () => ({
  endpoints: {
    players: vi.fn(() => Promise.resolve({ items: [{ id: 3, name: 'Üçüncü', overall: 75, positions: ['CM'], valuationEstimated: false }], total: 1 })),
    player: vi.fn(),
    compare: vi.fn(),
    positions: vi.fn(() => Promise.resolve([])),
    roles: vi.fn(() => Promise.resolve([{ id: 'advanced_forward_attack', name: 'Advanced Forward', focus: 'Attack', positions: ['ST'] }])),
    behaviorTags: vi.fn(() => Promise.resolve([])),
  },
}))

const detail = (id: number, name: string, overall: number, pace: number) => ({
  summary: { id, name, overall, positions: ['ST'], age: 24, valuationEstimated: false },
  weakFoot: 3,
  skillMoves: 4,
  attrs: { Acceleration: pace, SprintSpeed: pace, Finishing: 80 },
  playstyles: { FinesseShot: 2 },
})

function setMobile(mobile: boolean) {
  window.matchMedia = ((query: string) => ({ matches: mobile && query.includes('max-width'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as never
}

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><CompareV3Page /></MemoryRouter>
    </QueryClientProvider>,
  )
}

/** V3-07c: /compare v3 — 2+ oyuncu yan yana (masaüstü tablo, mobilde dikey), en iyi değer işaretli, rol uyumu: sıralama rol puanı, rozet seviyesinden (0a). */
describe('CompareV3Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    compareStore.clear()
    setMobile(false)
    vi.mocked(endpoints.player).mockImplementation((id: number) => Promise.resolve((id === 1 ? detail(1, 'Hızlı', 84, 92) : detail(2, 'Yavaş', 86, 70)) as never))
  })
  afterEach(() => compareStore.clear())

  it('boş (< 2): en az iki oyuncu iste; aramadan ekle', async () => {
    renderPage()
    expect(screen.getByText('Karşılaştırmak için en az 2 oyuncu ekle.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Oyuncu ekle'), { target: { value: 'Üç' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Üçüncü ekle' }))
    expect(compareStore.has(3)).toBe(true)
  })

  it('masaüstü: yan yana tablo; satırda en iyi değer işaretli', async () => {
    compareStore.add({ id: 1, name: 'Hızlı', overall: 84, position: 'ST' })
    compareStore.add({ id: 2, name: 'Yavaş', overall: 86, position: 'ST' })
    renderPage()
    const table = await screen.findByRole('table', { name: 'Yan yana karşılaştırma' })
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Hızlı'), expect.stringContaining('Yavaş')]))
    const genel = within(table).getByRole('row', { name: /^Genel/ })
    expect(within(genel).getByText('86').closest('td')).toHaveAttribute('data-best', 'true')
    const hiz = within(table).getByRole('row', { name: /^Hızlanma/ })
    expect(within(hiz).getByText('92').closest('td')).toHaveAttribute('data-best', 'true')
  })

  it('mobil: tablo yerine oyuncu başına dikey bölüm', async () => {
    setMobile(true)
    compareStore.add({ id: 1, name: 'Hızlı', overall: 84, position: 'ST' })
    compareStore.add({ id: 2, name: 'Yavaş', overall: 86, position: 'ST' })
    renderPage()
    expect(await screen.findByRole('region', { name: 'Hızlı' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Yavaş' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Yan yana karşılaştırma' })).toBeNull()
  })

  it('rol uyumu: sıra rol puanına göre, rozet yüzdesi seviyesinden (ikisi ayrı yazılır)', async () => {
    compareStore.add({ id: 1, name: 'Hızlı', overall: 84, position: 'ST' })
    compareStore.add({ id: 2, name: 'Yavaş', overall: 86, position: 'ST' })
    vi.mocked(endpoints.compare).mockResolvedValue([
      { roleFit: { playerId: 2, playerName: 'Yavaş', score: 78, currentFit: 78, levelFit: 45, fitLabel: 'AT_LEVEL', projectedRating: 85, outOfPosition: false, reasons: [], weaponChecks: [] } },
      { roleFit: { playerId: 1, playerName: 'Hızlı', score: 74, currentFit: 74, levelFit: 80, fitLabel: 'GOOD', badge: 'GREEN', projectedRating: 84, outOfPosition: false, reasons: [], weaponChecks: [] } },
    ] as never)
    renderPage()
    await screen.findByRole('table', { name: 'Yan yana karşılaştırma' })
    fireEvent.click(screen.getByRole('button', { name: 'Uyumu hesapla' }))
    const list = await screen.findByRole('list', { name: 'Role göre uyum' })
    const items = within(list).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Yavaş')
    // FIT-1: kariyerde iki metrik adıyla (Güç, Rol oturması); rozetin aria'sı sayının adını söyler.
    expect(items[0]).toHaveTextContent('Güç 78')
    expect(within(items[0]).getAllByLabelText('Rol için seviyesinde, Rol oturması %45').length).toBeGreaterThan(0)
    expect(within(items[1]).getAllByLabelText('Rol için uygun, Rol oturması %80').length).toBeGreaterThan(0)
  })

  it('FIT-1: UT modunda eski adlar (Rol puanı, yüzde) değişmez', async () => {
    modeStore.set('ut')
    try {
      compareStore.add({ id: 1, name: 'Hızlı', overall: 84, position: 'ST' })
      compareStore.add({ id: 2, name: 'Yavaş', overall: 86, position: 'ST' })
      vi.mocked(endpoints.compare).mockResolvedValue([
        { roleFit: { playerId: 2, playerName: 'Yavaş', score: 78, currentFit: 78, levelFit: 45, fitLabel: 'AT_LEVEL', projectedRating: 85, outOfPosition: false, reasons: [], weaponChecks: [] } },
        { roleFit: { playerId: 1, playerName: 'Hızlı', score: 74, currentFit: 74, levelFit: 80, fitLabel: 'GOOD', badge: 'GREEN', projectedRating: 84, outOfPosition: false, reasons: [], weaponChecks: [] } },
      ] as never)
      renderPage()
      await screen.findByRole('table', { name: 'Yan yana karşılaştırma' })
      fireEvent.click(screen.getByRole('button', { name: 'Uyumu hesapla' }))
      const items = within(await screen.findByRole('list', { name: 'Role göre uyum' })).getAllByRole('listitem')
      expect(items[0]).toHaveTextContent('Rol puanı 78')
      expect(within(items[0]).getAllByLabelText('Rol için seviyesinde, yüzde 45').length).toBeGreaterThan(0)
    } finally {
      modeStore.set('career')
    }
  })

  it('hata: oyuncu verisi gelmezse sebep + tekrar dene', async () => {
    vi.mocked(endpoints.player).mockRejectedValue(new Error('ağ'))
    compareStore.add({ id: 1, name: 'Hızlı', overall: 84, position: 'ST' })
    compareStore.add({ id: 2, name: 'Yavaş', overall: 86, position: 'ST' })
    renderPage()
    expect(await screen.findByText('Oyuncu verisi yüklenemedi.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument())
  })
})
