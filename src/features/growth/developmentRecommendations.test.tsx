import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { SlotFitRow } from '../squad/useSlotFits'
import { DevelopmentRecommendations } from './DevelopmentRecommendations'

vi.mock('../../api/endpoints', () => ({ endpoints: { developmentRecommendations: vi.fn() } }))

const wrap = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
)

const row = (slotId: string, position: string, roleId: string, playerId: number, weakClass: SlotFitRow['weakClass']) =>
  ({ slotId, position, roleId, roleName: 'Rol', playerId, playerName: `P${playerId}`, fit: {}, display: {}, weakClass }) as unknown as SlotFitRow

const option = { planKey: 'role:deep_lying_playmaker:CDM', planName: 'Deep-Lying Playmaker', kind: 'ROLE', position: 'CDM', roleId: 'deep_lying_playmaker_build_up',
  roleName: 'Deep-Lying Playmaker (Build-Up)', strength1: 69, strength2: 71.2, roleFit2: 58, balancedStrength2: 67.4, gain: 3.8, incumbentName: 'Nyoni', incumbentStrength2: 68.1 }

/** FIT-3 madde 11: Gelişim sayfası ve Kadro › Derinlik — gençler için plan önerisi, her yerde "tahmin · kalibre edilmedi". */
describe('DevelopmentRecommendations', () => {
  beforeEach(() => {
    vi.mocked(endpoints.developmentRecommendations).mockReset().mockResolvedValue([
      { playerId: 7, playerName: 'Figueiredo', age: 19, overall: 64, balanced: false, recommended: option, options: [option], estimated: true,
        text: 'Figueiredo · CDM Deep-Lying Playmaker planı → 2 sezonda CDM gücü 71 (Dengeli: 67; Nyoni\'nin tahmini 68)' },
      { playerId: 8, playerName: 'Genç', age: 20, overall: 60, balanced: true, recommended: null, options: [], estimated: true, reason: 'SMALL_GAIN',
        text: 'Genç · Dengeli plan yeterli: özel planlar 2 sezonda en çok +1 Güç getiriyor' },
      { playerId: 9, playerName: 'Esnek', age: 18, overall: 58, balanced: true, recommended: null, options: [], estimated: true, reason: 'NO_CLEAR_TARGET',
        text: 'Esnek · Dengeli plan: Henüz net bir mevkisi yok, esnek gelişsin' },
    ] as never)
  })

  it('takımın zayıf slotları (kalite açığı / ikisi) istekte; öneri metni, seçenekler ve "tahmin · kalibre edilmedi"', async () => {
    const rows = [row('CDM', 'CDM', 'holding_defend', 3, 'KALITE_ACIGI'), row('ST', 'ST', 'poacher_attack', 9, 'ROL_UYUMSUZ'), row('LB', 'LB', 'fullback_defend', 4, 'IKISI')]
    render(<DevelopmentRecommendations careerId={5} rows={rows} />, { wrapper: wrap })
    const panel = await screen.findByRole('region', { name: 'Gelişim planı önerileri' })
    expect(endpoints.developmentRecommendations).toHaveBeenCalledWith(5, [
      { slotId: 'CDM', position: 'CDM', roleId: 'holding_defend', playerId: 3 }, { slotId: 'LB', position: 'LB', roleId: 'fullback_defend', playerId: 4 },
    ])
    expect(within(panel).getByText('tahmin · kalibre edilmedi')).toBeInTheDocument()
    const items = await within(panel).findAllByRole('listitem')
    expect(items[0]).toHaveTextContent("Figueiredo · CDM Deep-Lying Playmaker planı → 2 sezonda CDM gücü 71 (Dengeli: 67; Nyoni'nin tahmini 68)")
    expect(items[0]).toHaveTextContent('+3,8')
    expect(within(panel).getByText(/Dengeli plan yeterli/)).toBeInTheDocument()
    expect(within(panel).getByText(/Henüz net bir mevkisi yok, esnek gelişsin/)).toBeInTheDocument()
  })

  it('İnceleme: ana taktik satırları beklenirken istek gitmez (zayıf slotlar gelince ikinci istek olmasın)', async () => {
    const { rerender } = render(<DevelopmentRecommendations careerId={5} rows={[]} pending />, { wrapper: wrap })
    await new Promise((r) => setTimeout(r, 30))
    expect(endpoints.developmentRecommendations).not.toHaveBeenCalled()
    rerender(<DevelopmentRecommendations careerId={5} rows={[row('CDM', 'CDM', 'holding_defend', 3, 'KALITE_ACIGI')]} pending={false} />)
    await screen.findByRole('region', { name: 'Gelişim planı önerileri' })
    await vi.waitFor(() => expect(endpoints.developmentRecommendations).toHaveBeenCalledTimes(1))
  })

  it('kompakt (Derinlik): yalnız özel plan önerilenler', async () => {
    render(<DevelopmentRecommendations careerId={5} rows={[]} compact />, { wrapper: wrap })
    const panel = await screen.findByRole('region', { name: 'Gelişim planı önerileri' })
    const items = await within(panel).findAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Figueiredo · CDM Deep-Lying Playmaker planı')
    expect(within(panel).queryByText(/Dengeli plan yeterli/)).toBeNull()
    expect(within(panel).getByText('tahmin · kalibre edilmedi')).toBeInTheDocument()
  })
})
