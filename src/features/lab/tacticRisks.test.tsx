import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { TacticRisks } from './TacticRisks'

vi.mock('../../api/endpoints', () => ({ endpoints: { setupCheck: vi.fn() } }))

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrap = (qc: QueryClient) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>

/** FIT-1 madde 5: v3 Lab'da taktik riskleri (setup-check) geri geldi: aktif taslağın çıkış + hat değeriyle; başlık, kanıt, öneri. */
describe('TacticRisks', () => {
  beforeEach(() => vi.mocked(endpoints.setupCheck).mockReset())

  it('riskler başlık, kanıt (sayılarla) ve öneriyle; uygun olanlar listelenmez; kaynak "Taslak"', async () => {
    vi.mocked(endpoints.setupCheck).mockResolvedValue([
      { title: 'Yüksek hat: stoperlerde hız', status: 'RED', detail: 'Stoperler arkadaki boşluğu kapatabilmeli (ort. hızlanma+sprint ≥ 72). Uygun: 0 / gereken 2.',
        advice: 'Savunma hattını biraz düşür ya da hızlı bir stoper ekle.', players: [{ id: 1, name: 'Ali Stoper', position: 'CB', value: 61, ok: false }, { id: 2, name: 'Veli Stoper', position: 'CB', value: 58, ok: false }] },
      { title: 'Kısa pasla çıkış: kaleci dağıtımı', status: 'GREEN', detail: 'x', advice: 'y', players: [] },
    ] as never)
    render(<TacticRisks careerId={7} setup={{ buildUp: 'Short', depth: 91 }} />, { wrapper: wrap(client()) })
    const panel = await screen.findByRole('region', { name: 'Taktik riskleri' })
    const items = await within(panel).findAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Yüksek hat: stoperlerde hız')
    expect(items[0]).toHaveTextContent('Ali Stoper 61')
    expect(items[0]).toHaveTextContent('Savunma hattını biraz düşür')
    expect(panel.querySelector('[data-source="draft"]')).not.toBeNull()
    expect(endpoints.setupCheck).toHaveBeenCalledWith({ careerId: 7, buildUp: 'Short', depth: 91 })
  })

  it('risk yoksa "Belirgin risk yok"', async () => {
    vi.mocked(endpoints.setupCheck).mockResolvedValue([{ title: 'Orta blok: savunma okuması', status: 'GREEN', detail: 'x', advice: 'y', players: [] }] as never)
    render(<TacticRisks careerId={7} setup={{ buildUp: 'Balanced', depth: 50 }} />, { wrapper: wrap(client()) })
    expect(await screen.findByText('Belirgin risk yok.')).toBeInTheDocument()
  })

  it('taslağın hattı değişince yeniden sorulur (bekletilmiş)', async () => {
    vi.mocked(endpoints.setupCheck).mockResolvedValue([] as never)
    const qc = client()
    const { rerender } = render(<TacticRisks careerId={7} setup={{ buildUp: 'Balanced', depth: 50 }} />, { wrapper: wrap(qc) })
    await waitFor(() => expect(endpoints.setupCheck).toHaveBeenCalledWith({ careerId: 7, buildUp: 'Balanced', depth: 50 }))
    rerender(<TacticRisks careerId={7} setup={{ buildUp: 'Balanced', depth: 85 }} />)
    await waitFor(() => expect(endpoints.setupCheck).toHaveBeenCalledWith({ careerId: 7, buildUp: 'Balanced', depth: 85 }))
  })
})
