import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request, requestText } from '../api/client'
import type { GrowthReport } from '../api/types'
import { AdminGrowthPanel } from './AdminGrowthPanel'

vi.mock('../api/client', async (orig) => ({ ...(await orig<object>()), request: vi.fn(), requestText: vi.fn() }))

const REPORT: GrowthReport = {
  from: '2026-09-19', to: '2027-09-19', days: 365, partial: false, matched: 37,
  groups: {
    age: [{ key: '≤19', n: 12, meanOverallDelta: 4.5, medianOverallDelta: 4, physical: 1.25, technical: 2, mental: 0.5, meanPredicted: 7.19, meanDiff: -2.69 }],
    play: [{ key: 'UNKNOWN', n: 37, meanOverallDelta: 1, medianOverallDelta: 1, physical: 0, technical: 0, mental: 0, meanPredicted: 1.5, meanDiff: -0.5 }],
    agePlay: [{ key: '≤19 · REGULAR', n: 3, meanOverallDelta: 5, medianOverallDelta: 5, physical: 1, technical: 1, mental: 1, meanPredicted: 7, meanDiff: -2 }],
    headroom: [],
  },
}

const renderPanel = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdminGrowthPanel /></QueryClientProvider>)

function fill(career = '7', from = '2026-09-01', to = '2027-09-30') {
  fireEvent.change(screen.getByLabelText('Kariyer kimliği'), { target: { value: career } })
  fireEvent.change(screen.getByLabelText('Başlangıç (oyun tarihi)'), { target: { value: from } })
  fireEvent.change(screen.getByLabelText('Bitiş (oyun tarihi)'), { target: { value: to } })
}

beforeEach(() => {
  vi.mocked(request).mockReset().mockResolvedValue(REPORT)
  vi.mocked(requestText).mockReset().mockResolvedValue('boyut,grup,n\n')
})

describe('Admin · Gelişim ölçümü (GTR-b)', () => {
  it('kariyer ve iki tarih seçilince rapor tablosu: boyut, grup, n ve ortalamalar; grafik yok', async () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Raporu getir' })).toBeDisabled()
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Raporu getir' }))
    const table = await screen.findByRole('table', { name: 'Gelişim ölçümü' })
    expect(request).toHaveBeenCalledWith('/admin/careers/7/growth-report', { query: { from: '2026-09-01', to: '2027-09-30' } })
    expect(screen.getByText('2026-09-19 → 2027-09-19 · 365 gün · 37 oyuncu eşleşti')).toBeInTheDocument()
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(4)
    expect(rows[1]).toHaveTextContent('Yaş≤19124,547,19−2,69')
    expect(rows[2]).toHaveTextContent('OynamaBilinmiyor37')
    expect(rows[3]).toHaveTextContent('Yaş × oynama≤19 · Düzenli3')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('kısmi dönem işaretlenir', async () => {
    vi.mocked(request).mockResolvedValue({ ...REPORT, days: 90, partial: true })
    renderPanel()
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Raporu getir' }))
    expect(await screen.findByText('Kısmi dönem (365 günden kısa)')).toBeInTheDocument()
  })

  it('CSV indirme aynı aralıkla format=csv ister ve dosyayı indirir', async () => {
    const createObjectURL = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderPanel()
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Raporu getir' }))
    await screen.findByRole('table', { name: 'Gelişim ölçümü' })
    fireEvent.click(screen.getByRole('button', { name: 'CSV indir' }))
    await vi.waitFor(() => expect(click).toHaveBeenCalled())
    expect(requestText).toHaveBeenCalledWith('/admin/careers/7/growth-report', { query: { from: '2026-09-01', to: '2027-09-30', format: 'csv' } })
    expect(createObjectURL).toHaveBeenCalled()
    click.mockRestore()
  })

  it('aralıkta iki görüntü yoksa (404) açık mesaj', async () => {
    vi.mocked(request).mockRejectedValue(new ApiError('Gelişim anlık görüntüsü bulunamadı', 'common.not_found', 404))
    renderPanel()
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Raporu getir' }))
    expect(await screen.findByText('Bu aralıkta iki anlık görüntü yok; tarihleri genişlet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'CSV indir' })).toBeNull()
  })
})
