import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import sampleHar from '../../../tests/fixtures/har/sample.har?raw'
import { ApiError } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import { HarImport } from './HarImport'

vi.mock('../../api/endpoints', () => ({
  endpoints: { captureRules: vi.fn(), contribCapture: vi.fn() },
}))

const SECRETS = ['SIZINTI-AUTH-111', 'SIZINTI-COOKIE-222', 'SIZINTI-POST-666', 'SIZINTI-SETCOOKIE-444']

function renderImport(onPersonal = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><HarImport onPersonal={onPersonal} busy={false} /></QueryClientProvider>)
  return onPersonal
}

const choose = (text: string, name = 'oturum.har') => fireEvent.change(screen.getByLabelText('HAR dosyası'), { target: { files: [new File([text], name, { type: 'application/json' })] } })

beforeEach(() => {
  vi.mocked(endpoints.captureRules).mockReset().mockRejectedValue(new Error('ağ yok'))
  vi.mocked(endpoints.contribCapture).mockReset().mockResolvedValue({ created: 2, updated: 0, unchanged: 0, queued: 1, pricesRecorded: 2, pricesSkipped: 0 })
})

describe('HAR içe aktarma', () => {
  it('talimat ve paylaşma uyarısı görünür; varsayılan hedef kişisel senkron', () => {
    renderImport()
    expect(screen.getByText('Dosyayı kimseyle paylaşma; FC Assist yalnız gerekli yanıtları okur.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Kulübümü senkronla' })).toBeChecked()
    const help = screen.getByLabelText('HAR nasıl alınır?')
    expect(help.closest('details')).toHaveTextContent('Export HAR')
    expect(help.closest('details')).toHaveTextContent('Preserve log')
  })

  it('dosya → özet → onay → kişisel senkron ucuna yalnız süzülmüş yakalamalar gider', async () => {
    const onPersonal = renderImport()
    choose(sampleHar)
    const summary = await screen.findByRole('region', { name: 'Gönderilmeden önce özet' })
    expect(within(summary).getByText('SBC seti').nextSibling).toHaveTextContent('2')
    expect(within(summary).getByText('SBC görevi').nextSibling).toHaveTextContent('2')
    expect(within(summary).getByText('Kulüp kartı').nextSibling).toHaveTextContent('3')
    expect(within(summary).getByText('Fiyat gözlemi').nextSibling).toHaveTextContent('2')
    expect(within(summary).getByText('Objective').nextSibling).toHaveTextContent('2')
    expect(within(summary).getByText('Atlanan istek').nextSibling).toHaveTextContent('4')
    expect(onPersonal).not.toHaveBeenCalled()

    fireEvent.click(within(summary).getByRole('button', { name: 'Gönder' }))
    expect(onPersonal).toHaveBeenCalledTimes(1)
    const sent = onPersonal.mock.calls[0][0] as { url: string }[]
    expect(sent).toHaveLength(5)
    const text = JSON.stringify(sent)
    SECRETS.forEach((s) => expect(text).not.toContain(s))
    expect(endpoints.contribCapture).not.toHaveBeenCalled()
  })

  it('katkı hedefi: kişisel uçlar yok, stripFields uygulanmış; katkı ucuna gider', async () => {
    const onPersonal = renderImport()
    fireEvent.click(screen.getByRole('radio', { name: 'Bilgi tabanına katkı' }))
    choose(sampleHar)
    const summary = await screen.findByRole('region', { name: 'Gönderilmeden önce özet' })
    expect(within(summary).getByText('Kulüp kartı').nextSibling).toHaveTextContent('0')
    fireEvent.click(within(summary).getByRole('button', { name: 'Gönder' }))
    await waitFor(() => expect(endpoints.contribCapture).toHaveBeenCalled())
    const sent = vi.mocked(endpoints.contribCapture).mock.calls.flatMap((c) => c[0]) as { url: string; body: string }[]
    expect(sent.map((c) => c.url).some((u) => u.endsWith('/club'))).toBe(false)
    expect(JSON.stringify(sent)).not.toContain('SIZINTI-SATICI-555')
    expect(onPersonal).not.toHaveBeenCalled()
    expect(await screen.findByText(/Katkı gönderildi/)).toBeInTheDocument()
  })

  it('katkıcı olmayan hesap: anlaşılır hata (402)', async () => {
    vi.mocked(endpoints.contribCapture).mockRejectedValue(new ApiError('Premium', 'fc.exception.0004', 402))
    renderImport()
    fireEvent.click(screen.getByRole('radio', { name: 'Bilgi tabanına katkı' }))
    choose(sampleHar)
    fireEvent.click(within(await screen.findByRole('region', { name: 'Gönderilmeden önce özet' })).getByRole('button', { name: 'Gönder' }))
    expect(await screen.findByText('Bilgi tabanına katkı için katkıcı yetkisi gerekir.')).toBeInTheDocument()
  })

  it('Vazgeç özeti kapatır, hiçbir şey gönderilmez', async () => {
    const onPersonal = renderImport()
    choose(sampleHar)
    fireEvent.click(within(await screen.findByRole('region', { name: 'Gönderilmeden önce özet' })).getByRole('button', { name: 'Vazgeç' }))
    expect(screen.queryByRole('region', { name: 'Gönderilmeden önce özet' })).toBeNull()
    expect(onPersonal).not.toHaveBeenCalled()
  })

  it('bozuk dosya ve HAR olmayan JSON için anlaşılır hata', async () => {
    renderImport()
    choose('{bozuk')
    expect(await screen.findByRole('alert')).toHaveTextContent('Dosya geçerli bir HAR (JSON) değil.')
    choose('{"captures":[]}')
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Bu bir HAR dosyası değil'))
  })
})
