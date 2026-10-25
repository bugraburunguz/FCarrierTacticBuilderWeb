import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import { TacticRisks } from './TacticRisks'

vi.mock('../../api/endpoints', () => ({ endpoints: { setupCheck: vi.fn(), tacticAnalysis: vi.fn() } }))

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrap = (qc: QueryClient) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>

/** FIT-1 madde 5: v3 Lab'da taktik riskleri (setup-check) geri geldi: aktif taslağın çıkış + hat değeriyle; başlık, kanıt, öneri. */
describe('TacticRisks', () => {
  beforeEach(() => {
    vi.mocked(endpoints.setupCheck).mockReset()
    vi.mocked(endpoints.tacticAnalysis).mockReset().mockResolvedValue({ metrics: { band: 'BALANCED', depth: 50 }, findings: [], notEvaluated: [] } as never)
  })

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

  it('İnceleme: diziliş kuralları alınamazsa "risk yok" denmez; kurulum riskleri yine listelenir ve eksik kısım söylenir', async () => {
    vi.mocked(endpoints.setupCheck).mockResolvedValue([] as never)
    vi.mocked(endpoints.tacticAnalysis).mockRejectedValue(new Error('429'))
    const tactic = { formation: '4-3-3', slots: [] }
    render(<TacticRisks careerId={7} setup={{ buildUp: 'Balanced', depth: 50 }} tactic={tactic} assigned={{}} />, { wrapper: wrap(client()) })
    expect(await screen.findByText('Diziliş kuralları alınamadı; yalnız kurulum kontrolleri gösteriliyor.')).toBeInTheDocument()
    expect(screen.queryByText('Belirgin risk yok.')).toBeNull()
  })

  it('Karar: analiz 429 dönerse son başarılı diziliş sonucu "güncellenemedi" notuyla kalır', async () => {
    vi.mocked(endpoints.setupCheck).mockResolvedValue([] as never)
    vi.mocked(endpoints.tacticAnalysis).mockResolvedValueOnce({ metrics: { band: 'BALANCED', depth: 50 }, notEvaluated: [], findings: [
      { code: 'striker_isolated', title: 'Santrfor yalnız', severity: 'WARN', instance: {}, evidence: [], text: 'Tek forvet yalnız.' },
    ] } as never).mockRejectedValue(new ApiError('Çok fazla istek', 'RATE_LIMIT_EXCEEDED', 429))
    const qc = client()
    const a = { formation: '4-3-3', slots: [{ slotId: 'LW', tags: [], roleId: 'inside_forward_attack' }] }
    const { rerender } = render(<TacticRisks careerId={7} setup={{ buildUp: 'Balanced', depth: 50 }} tactic={a} assigned={{}} />, { wrapper: wrap(qc) })
    expect(await screen.findByText('Santrfor yalnız')).toBeInTheDocument()
    rerender(<TacticRisks careerId={7} setup={{ buildUp: 'Balanced', depth: 50 }} tactic={{ ...a, slots: [{ slotId: 'LW', tags: [], roleId: 'winger_attack' }] }} assigned={{}} />)
    expect(await screen.findByText('Diziliş kuralları güncellenemedi; son başarılı sonuç gösteriliyor.')).toBeInTheDocument()
    expect(screen.getByText('Santrfor yalnız')).toBeInTheDocument()
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

  it('FIT-2 madde 7: taslağın diziliş kuralları (analiz) da listelenir — risk ve uyarı, bilgi değil; istek taslağın rolleri ve dizilişiyle', async () => {
    vi.mocked(endpoints.setupCheck).mockResolvedValue([] as never)
    vi.mocked(endpoints.tacticAnalysis).mockResolvedValue({ metrics: { band: 'BALANCED', depth: 50 }, notEvaluated: [], findings: [
      { code: 'counter_risk_overlap', title: 'Kontra riski yüksek', severity: 'RISK', instance: {}, evidence: [], text: 'Kontra riski yüksek: 2 bek sürekli bindiriyor, stoperlerin ortalama hızı 59.5.',
        recommendation: { code: 'X', text: 'İkinci bir pivot ekle, hattı düşür ya da hızlı bir stoper kullan.' } },
      { code: 'midfield_thin', title: 'Orta saha ince', severity: 'INFO', instance: {}, evidence: [], text: 'bilgi' },
    ] } as never)
    const tactic = { formation: '4-3-3', slots: [{ slotId: 'LB', tags: [], roleId: 'attacking_wingback_attack' }, { slotId: 'RB', tags: [] }] }
    render(<TacticRisks careerId={7} setup={{ buildUp: 'Balanced', depth: 50 }} tactic={tactic} assigned={{ LB: 5 }} />, { wrapper: wrap(client()) })
    const panel = await screen.findByRole('region', { name: 'Taktik riskleri' })
    const item = await within(panel).findByText('Kontra riski yüksek')
    const li = item.closest('li')!
    expect(li).toHaveTextContent('stoperlerin ortalama hızı 59.5')
    expect(li).toHaveTextContent('Öneri: İkinci bir pivot ekle')
    expect(within(panel).queryByText('Orta saha ince')).toBeNull()
    expect(endpoints.tacticAnalysis).toHaveBeenCalledWith({ formation: '4-3-3', buildUp: 'Balanced', depth: 50, slots: [{ slotId: 'LB', roleId: 'attacking_wingback_attack' }], careerId: 7, assigned: { LB: 5 } })
  })
})
