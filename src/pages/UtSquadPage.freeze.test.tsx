import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import { UtSquadPage } from './UtSquadPage'

// V3-06a: UT ana sayfası (kadro kurucu) yakalama bayrağı kapalıyken fiyat / kulüp / SBC bloklarını göstermez; kurucu katalogla çalışır.
const flags = vi.hoisted(() => ({ capture: false }))
vi.mock('../lib/features', async (importOriginal) => ({ ...(await importOriginal<typeof import('../lib/features')>()), extensionCaptureEnabled: () => flags.capture }))

const formation = { id: '4-4-2', label: '4-4-2', slots: [{ slotId: 'GK', position: 'GK', x: 50, y: 90, defaultRole: 'goalkeeper_balanced' }] }
vi.mock('../api/endpoints', () => ({
  endpoints: {
    formations: vi.fn(),
    roles: vi.fn(() => Promise.resolve([])),
    eaRoles: vi.fn(() => Promise.resolve([])),
    resolveTactic: vi.fn(() => Promise.resolve({ formation: '4-4-2', slots: [{ slotId: 'GK', roleId: 'goalkeeper_balanced', roleName: 'Goalkeeper' }] })),
    exportTacticCode: vi.fn(() => Promise.resolve({ code: 'ABCDEFGHIJKL', formation: '4-4-2', exact: true, warnings: [] })),
    utSquadEvaluate: vi.fn(() => Promise.resolve({ slots: [], averageMeta: 0 })),
    importTacticCode: vi.fn(),
    players: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
  },
}))

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><UtSquadPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(endpoints.formations).mockResolvedValue([formation] as never)
})

describe('UT ana sayfası ve yakalama bayrağı', () => {
  it('bayrak kapalı: fiyat, kulüp kadrosu ve yakalama ipuçları yok', async () => {
    flags.capture = false
    renderPage()
    expect(await screen.findByText(/OVR ort\./)).toBeInTheDocument()
    expect(screen.queryByText('Toplam değer')).toBeNull()
    expect(screen.queryByText(/ort\. ücret/)).toBeNull()
    expect(screen.queryByText(/fiyatı biliniyor/)).toBeNull()
    expect(screen.queryByText(/yakalama dosyası/)).toBeNull()
    expect(screen.queryByRole('link', { name: /içe aktar/i })).toBeNull()
  })

  it('bayrak açık: mevcut fiyat blokları görünür', async () => {
    flags.capture = true
    renderPage()
    expect(await screen.findByText(/ort\. ücret/)).toBeInTheDocument()
    expect(screen.getByText('Toplam değer')).toBeInTheDocument()
  })
})
