import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../../api/endpoints'
import { UtMetaV3Page } from './UtMetaV3Page'

vi.mock('../../../api/endpoints', () => ({ endpoints: { utFormations: vi.fn(), utTier: vi.fn() } }))

const FORMATIONS = { snapshotNote: 'Topluluk anlık görüntüsü', formations: [{ id: '4-2-3-1', share: 28, note: 'Dengeli', buildUp: 'Balanced', lineHeight: '60', keyRoles: ['CAM'] }] }
const TIER = [
  { id: 1, name: 'Hızlı Forvet', overall: 88, position: 'ST', metaRating: 91, tier: 'A+', bestChemStyle: 'Hunter', assumption: false },
  { id: 2, name: 'Yavaş Forvet', overall: 86, position: 'ST', metaRating: 80, tier: 'B', assumption: false },
]

function Where() {
  const l = useLocation()
  return <output data-testid="where">{l.search}</output>
}
function renderAt(url = '/ut/meta') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}><UtMetaV3Page /><Where /></MemoryRouter>
    </QueryClientProvider>,
  )
}

/** V3-07c: /ut/meta v3 (Pano + Katalog tablosu). Mevki URL'de (?mevki=); durumlar: yükleniyor / dolu / boş / hata. */
describe('UtMetaV3Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(endpoints.utFormations).mockResolvedValue(FORMATIONS as never)
    vi.mocked(endpoints.utTier).mockResolvedValue(TIER as never)
  })

  it('dolu: meta formasyonlar ve tier tablosu (varsayılan ST)', async () => {
    renderAt()
    expect(await screen.findByRole('heading', { level: 1, name: 'Meta' })).toBeInTheDocument()
    expect(await screen.findByText('4-2-3-1')).toBeInTheDocument()
    const table = await screen.findByRole('table', { name: 'Meta tier listesi' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText('Hızlı Forvet')).toBeInTheDocument()
    expect(endpoints.utTier).toHaveBeenCalledWith('ST', expect.objectContaining({ limit: 25 }))
  })

  it('mevki URL ile eşleşir: ?mevki=CB açılışta, çip seçimi URL\'ye yazar', async () => {
    renderAt('/ut/meta?mevki=CB')
    await waitFor(() => expect(endpoints.utTier).toHaveBeenCalledWith('CB', expect.anything()))
    fireEvent.click(screen.getByRole('button', { name: 'LW' }))
    expect(screen.getByTestId('where')).toHaveTextContent('mevki=LW')
    await waitFor(() => expect(endpoints.utTier).toHaveBeenCalledWith('LW', expect.anything()))
  })

  it('boş tier: eylem öneren tek satır', async () => {
    vi.mocked(endpoints.utTier).mockResolvedValue([] as never)
    renderAt()
    expect(await screen.findByText(/Bu mevkide meta kartı yok/)).toBeInTheDocument()
  })

  it('hata: sebep + tekrar dene', async () => {
    vi.mocked(endpoints.utTier).mockRejectedValue(new Error('ağ'))
    vi.mocked(endpoints.utFormations).mockRejectedValue(new Error('ağ'))
    renderAt()
    expect(await screen.findByText('Tier listesi yüklenemedi.')).toBeInTheDocument()
    expect(screen.getByText('Meta formasyonlar yüklenemedi.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Tekrar dene' })).toHaveLength(2)
  })
})
