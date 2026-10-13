import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { PlayerDetail } from '../../api/types'
import type { UtCard } from '../../lib/utCard'
import { utCardStore } from '../../state/utCardStore'
import { utSquadStore } from '../../state/utSquadStore'
import { useUtBinding } from './useUtBinding'

vi.mock('../../api/endpoints', () => ({ endpoints: { player: vi.fn() } }))

const OUT = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY']

function Probe() {
  const { binding } = useUtBinding()
  return <output data-testid="cards">{JSON.stringify(Object.entries(binding.state.assigned).map(([slot, c]) => [slot, c.key, c.faceStats?.join('/') ?? 'yok']))}</output>
}

function renderProbe() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Probe />
    </QueryClientProvider>,
  )
}

/** F12: kayıtlı kadro F10'dan önceki (yüz değeri olmayan) kopyalar içerir; yüklemede kaynaktan tazelenir. */
describe('useUtBinding tazeleme (F12)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    utSquadStore.clear()
    vi.spyOn(utCardStore, 'get').mockReturnValue(undefined)
  })

  it('katalog kartı playerId ile katalogdan tazelenir: eski kopyada olmayan yüz değerleri gelir', async () => {
    const legacy: UtCard = { key: 'p:7', source: 'catalog', name: 'Eski', rating: 90, positions: ['ST'], playerId: 7 }
    utSquadStore.set({ formationId: '4-4-2', setup: { buildUp: 'Balanced', depth: 55 }, picked: { ST1: legacy }, roleOverride: {}, origin: 'manual' })
    vi.mocked(endpoints.player).mockResolvedValue({ summary: { id: 7, name: 'Taze', overall: 91, positions: ['ST'], valuationEstimated: false, faceLabels: OUT, faceStats: [90, 80, 70, 60, 50, 40] } } as PlayerDetail)
    renderProbe()

    await waitFor(() => expect(screen.getByTestId('cards')).toHaveTextContent('90/80/70/60/50/40'))
    expect(endpoints.player).toHaveBeenCalledWith(7)
  })

  it('kulüp kartı yakalama kitaplığından tazelenir', async () => {
    const legacy: UtCard = { key: 'c:5', source: 'club', name: 'Eski', rating: 85, positions: ['CM'], instanceId: 5 }
    const fresh: UtCard = { ...legacy, name: 'Taze', faceLabels: OUT, faceStats: [70, 60, 50, 40, 30, 20] }
    utSquadStore.set({ formationId: '4-4-2', setup: { buildUp: 'Balanced', depth: 55 }, picked: { CM1: legacy }, roleOverride: {}, origin: 'manual' })
    vi.spyOn(utCardStore, 'get').mockReturnValue({ cards: [fresh], importedAt: '2026-10-13T00:00:00Z' })
    renderProbe()

    await waitFor(() => expect(screen.getByTestId('cards')).toHaveTextContent('70/60/50/40/30/20'))
  })

  it('kayıtta katalog kartı yalnız kimlik olarak saklanır, kopya değil', async () => {
    const legacy: UtCard = { key: 'p:7', source: 'catalog', name: 'Eski', rating: 90, positions: ['ST'], playerId: 7 }
    utSquadStore.set({ formationId: '4-4-2', setup: { buildUp: 'Balanced', depth: 55 }, picked: { ST1: legacy }, roleOverride: {}, origin: 'manual' })
    vi.mocked(endpoints.player).mockResolvedValue({ summary: { id: 7, name: 'Taze', overall: 91, positions: ['ST'], valuationEstimated: false, faceStats: [1, 2, 3, 4, 5, 6] } } as PlayerDetail)
    renderProbe()

    await waitFor(() => expect(screen.getByTestId('cards')).toHaveTextContent('1/2/3/4/5/6'))
    const stored = utSquadStore.get()!.picked.ST1
    expect(stored.playerId).toBe(7)
    expect(stored.faceStats).toBeUndefined()
    expect(stored.name).toBe('')
  })
})

describe('gereksiz istek yok (hız sınırı)', () => {
  it('yüz değeri zaten olan katalog kartı için katalog isteği gitmez', async () => {
    vi.clearAllMocks()
    utSquadStore.clear()
    vi.spyOn(utCardStore, 'get').mockReturnValue(undefined)
    const full: UtCard = { key: 'p:7', source: 'catalog', name: 'Tam', rating: 90, positions: ['ST'], playerId: 7, faceLabels: OUT, faceStats: [1, 2, 3, 4, 5, 6] }
    utSquadStore.set({ formationId: '4-4-2', setup: { buildUp: 'Balanced', depth: 55 }, picked: { ST1: full }, roleOverride: {}, origin: 'manual' })
    renderProbe()

    await waitFor(() => expect(screen.getByTestId('cards')).toHaveTextContent('1/2/3/4/5/6'))
    await new Promise((r) => setTimeout(r, 50))
    expect(endpoints.player).not.toHaveBeenCalled()
  })
})
