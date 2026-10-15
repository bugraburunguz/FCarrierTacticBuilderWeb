import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { CaptureFileImport } from './CaptureFileImport'

vi.mock('../../api/endpoints', () => ({
  endpoints: { captureRules: vi.fn(), contribCapture: vi.fn(), utCapture: vi.fn() },
}))

// V3-05c-c: uzantı yakalama dosyası, HAR-01 akışının ortak parçasıyla (hedef → özet → onay). Sentetik veri.
const UT = 'https://utas.mob.v1.prd.futc-ext.gcp.ea.com/ut/game/fc27'
const FILE = JSON.stringify([
  { url: `${UT}/sbs/hub/v2`, status: 200, ts: 1, body: JSON.stringify({ categories: [{ sets: [{ setId: 1 }] }] }) },
  { url: `${UT}/club`, status: 200, ts: 2, body: JSON.stringify({ itemData: [{ id: 1 }, { id: 2 }] }) },
  { url: `${UT}/transfermarket?num=21`, status: 200, ts: 3, body: JSON.stringify({ auctionInfo: [{ tradeId: 7, sellerName: 'SIZINTI-SATICI' }] }) },
  { url: 'https://accounts.ea.com/connect/auth', status: 200, ts: 4, body: '{"access_token":"SIZINTI-TOKEN"}' },
])

function renderImport(onPersonal = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><CaptureFileImport source="capture" onPersonal={onPersonal} busy={false} /></QueryClientProvider>)
  return onPersonal
}
const choose = () => fireEvent.change(screen.getByLabelText('Yakalama dosyası'), { target: { files: [new File([FILE], 'fcareer-captures.json', { type: 'application/json' })] } })

beforeEach(() => {
  vi.mocked(endpoints.captureRules).mockReset().mockRejectedValue(new Error('ağ yok'))
  vi.mocked(endpoints.contribCapture).mockReset().mockResolvedValue({ created: 1, updated: 0, unchanged: 0, queued: 0, pricesRecorded: 1, pricesSkipped: 0 })
  vi.mocked(endpoints.utCapture).mockReset()
})

describe('yakalama dosyası içe aktarma (ortak akış)', () => {
  it('hedef seçimi ve özet HAR ile aynı; kişisel onayda yalnız süzülmüş yakalamalar gider', async () => {
    const onPersonal = renderImport()
    expect(screen.getByRole('heading', { name: 'Yakalama dosyasından içe aktar' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Kulübümü senkronla' })).toBeChecked()
    choose()
    await screen.findByRole('region', { name: 'Gönderilmeden önce özet' })
    expect(onPersonal).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Gönder' }))
    const sent = onPersonal.mock.calls[0][0] as { url: string; body: string }[]
    expect(sent.map((c) => c.url)).toEqual([`${UT}/sbs/hub/v2`, `${UT}/club`, `${UT}/transfermarket?num=21`])
    expect(JSON.stringify(sent)).not.toContain('SIZINTI-TOKEN')
    expect(endpoints.utCapture).not.toHaveBeenCalled()
  })

  it('katkı hedefi: kişisel uçlar alınmaz, satıcı alanları silinir', async () => {
    renderImport()
    fireEvent.click(screen.getByRole('radio', { name: 'Bilgi tabanına katkı' }))
    choose()
    await screen.findByRole('region', { name: 'Gönderilmeden önce özet' })
    fireEvent.click(screen.getByRole('button', { name: 'Gönder' }))
    await waitFor(() => expect(endpoints.contribCapture).toHaveBeenCalledTimes(1))
    const sent = vi.mocked(endpoints.contribCapture).mock.calls[0][0] as { url: string }[]
    expect(sent.map((c) => c.url)).toEqual([`${UT}/sbs/hub/v2`, `${UT}/transfermarket?num=21`])
    expect(JSON.stringify(sent)).not.toMatch(/SIZINTI|tradeId|"\/club"/)
  })
})
