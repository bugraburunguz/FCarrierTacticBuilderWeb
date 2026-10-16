import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../../api/endpoints'
import { evoEligibility } from './evoEligibility'
import { UtEvolutionsV3Page } from './UtEvolutionsV3Page'

let capture: unknown
vi.mock('../../../state/utCaptureStore', () => ({ useUtCapture: () => capture }))
vi.mock('../../../api/endpoints', () => ({ endpoints: { kbEvolutions: vi.fn() } }))

const EVO = (id: number, name: string, extra = {}) => ({ id, name, levels: 3, status: 'CONFIRMED', ...extra })

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><UtEvolutionsV3Page /></MemoryRouter>
    </QueryClientProvider>,
  )
}

/** V3-07c: /ut/evo v3 — yalnız veride olan alanlar; sonra-kartı, gereksinim, maliyet, zincir ve uygun oyuncu sayısı veri yoksa uydurulmaz. */
describe('UtEvolutionsV3Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capture = undefined
    vi.mocked(endpoints.kbEvolutions).mockResolvedValue([EVO(1, 'Striker Glow Up', { levels: 5 }), EVO(2, 'Relentless', { status: 'PENDING', levels: 2 })] as never)
  })

  it('dolu: kart başına ad, seviye sayısı, doğrulanmamış etiketi; veride olmayan alan gösterilmez', async () => {
    renderPage()
    const card = await screen.findByRole('article', { name: 'Striker Glow Up' })
    expect(within(card).getByText('5 seviye')).toBeInTheDocument()
    expect(within(card).queryByText(/Maliyet|Bitiş/)).toBeNull()
    expect(within(screen.getByRole('article', { name: 'Relentless' })).getByText('Doğrulanmamış')).toBeInTheDocument()
  })

  it('uygun oyuncu sayısı: gereksinim verisi yoksa sayı yok, sebep yazılır', async () => {
    renderPage()
    const card = await screen.findByRole('article', { name: 'Striker Glow Up' })
    expect(within(card).queryByText(/uygun \d+ oyuncu/i)).toBeNull()
    expect(within(card).getByText('Uygunluk: gereksinim verisi yok')).toBeInTheDocument()
  })

  it('evoEligibility: gereksinim yoksa ya da çözülemiyorsa sayım yapılmaz (tahmin yok)', () => {
    const cards = [{ rating: 80, positions: ['ST'] }, { rating: 88, positions: ['CB'] }] as never
    expect(evoEligibility(EVO(1, 'A') as never, cards)).toEqual({ kind: 'unknown', reason: 'gereksinim verisi yok' })
    expect(evoEligibility(EVO(1, 'A', { requirements: null }) as never, cards)).toEqual({ kind: 'unknown', reason: 'gereksinim verisi yok' })
    expect(evoEligibility(EVO(1, 'A', { requirements: { elgReqs: [{ type: 'PLAYER_ATTRIBUTE', eligibilityKey: 41, eligibilityValue: 47 }] } }) as never, cards)).toEqual({ kind: 'unknown', reason: 'gereksinim biçimi doğrulanmadı' })
  })

  it('senin slotların (yakalama): ad, seviye ve durum', async () => {
    capture = { evolutions: [{ id: 9, name: 'Akademi slotu', levels: 4, status: 'STARTED' }] }
    renderPage()
    const mine = await screen.findByRole('list', { name: 'Senin slotların' })
    expect(within(mine).getByText('Akademi slotu')).toBeInTheDocument()
    expect(within(mine).getByText('4 seviye')).toBeInTheDocument()
  })

  it('boş ve hata', async () => {
    vi.mocked(endpoints.kbEvolutions).mockResolvedValueOnce([] as never)
    const { unmount } = renderPage()
    expect(await screen.findByRole('link', { name: 'Kulübümü senkronla' })).toHaveAttribute('href', '/ut/import')
    unmount()
    vi.mocked(endpoints.kbEvolutions).mockRejectedValue(new Error('ağ'))
    renderPage()
    expect(await screen.findByText("Evolution'lar yüklenemedi.")).toBeInTheDocument()
  })
})
