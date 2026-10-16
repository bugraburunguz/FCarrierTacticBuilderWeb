import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../../api/endpoints'
import { sbcPoolStore } from '../../../state/sbcPoolStore'
import { UtImportV3Page } from './UtImportV3Page'

let authenticated = true
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated }) }))
vi.mock('../../../api/endpoints', () => ({ endpoints: { utCapture: vi.fn(), formations: vi.fn(() => Promise.resolve([])) } }))
// İçe aktarma akışı (HAR-01/V3-05c-c) kendi testlerinde; burada yalnız kabuğun ona bağlanması sınanır.
vi.mock('../../import/CaptureFileImport', () => ({ CaptureFileImport: ({ onPersonal }: { onPersonal: (c: unknown[]) => void }) => <button type="button" onClick={() => onPersonal([{ url: 'x' }])}>Dosyayı işle</button> }))
vi.mock('../../../components/ExtensionSync', () => ({ ExtensionSync: () => <section aria-label="Uzantı senkronu" /> }))

const card = (instanceId: number, name: string, rating: number) => ({ instanceId, assetId: instanceId, name, rating, position: 'ST', positions: ['ST'], untradeable: false, duplicate: instanceId === 2 })
const RESULT = {
  stats: { received: 10, processed: 8, stripped: 1, ignored: 1, invalid: 0, byKind: {}, definitionNames: 2, definitionsTruncated: false, warnings: [] },
  cards: [card(1, 'Forvet', 84), card(2, 'Kopya', 80)],
  squads: [],
  prices: [],
  objectives: [],
  sbcSets: [],
  evolutions: [],
  currencies: [],
  config: { formations: [] },
}

function Where() {
  const l = useLocation()
  return <output data-testid="where">{l.pathname}</output>
}
function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/ut/import']}><Routes><Route path="*" element={<UtImportV3Page />} /></Routes><Where /></MemoryRouter>
    </QueryClientProvider>,
  )
}

/** V3-07c: /ut/import v3 kabuğu — ortak içe aktarma akışı aynı, sonuç panelleri v3; bayraklar aynı (kapalıyken CaptureOnly notu). */
describe('UtImportV3Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticated = true
    vi.mocked(endpoints.utCapture).mockResolvedValue(RESULT as never)
  })

  it('başlangıç: başlık, uzantı senkronu ve dosya akışı; sonuç yok', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Kulüp içe aktar' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Uzantı senkronu' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Özet' })).toBeNull()
  })

  it('anonim: giriş iste', () => {
    authenticated = false
    renderPage()
    expect(screen.getByRole('link', { name: 'Giriş yap' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('button', { name: 'Dosyayı işle' })).toBeNull()
  })

  it('dolu: özet çipleri ve kulüp tablosu; "SBC havuzuna aktar" havuzu yazar ve SBC sayfasına gider', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Dosyayı işle' }))
    const summary = await screen.findByRole('region', { name: 'Özet' })
    expect(within(summary).getByText('8 işlendi')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Kulüp kartları' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    const set = vi.spyOn(sbcPoolStore, 'set')
    fireEvent.click(screen.getByRole('button', { name: 'SBC havuzuna aktar' }))
    expect(set).toHaveBeenCalled()
    expect(screen.getByTestId('where')).toHaveTextContent('/ut/sbc')
    set.mockRestore()
  })

  it('hata: sebep gösterilir', async () => {
    vi.mocked(endpoints.utCapture).mockRejectedValue(new Error('Yakalama işlenemedi'))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Dosyayı işle' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/işlenemedi|hata/i))
  })
})
