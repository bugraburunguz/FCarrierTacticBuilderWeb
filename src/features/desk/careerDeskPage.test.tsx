import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { fitDisplay } from '../../lib/fitLabels'
import { careerStore } from '../../state/careerStore'
import { lineupStore } from '../../state/lineupStore'
import { teamFitPct } from '../squad/useSlotFits'
import { DeskPage } from './DeskPage'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: 'FREE', creditBalance: 17, dailyCreditLimit: 20 } }) }))
vi.mock('../../api/endpoints', () => {
  const none = () => Promise.resolve([])
  return {
    endpoints: {
      careers: vi.fn(), squad: vi.fn(), lineup: vi.fn(() => Promise.resolve({ slots: [] })), playerTags: vi.fn(() => Promise.resolve([])), formations: vi.fn(), roles: none, eaRoles: none,
      resolveTactic: vi.fn(() => Promise.resolve({ formation: '4-3-3', slots: [] })), fitRole: vi.fn(), playerFacets: vi.fn(), snapshotDiff: vi.fn(() => Promise.resolve({ rows: [] })),
      snapshots: vi.fn(), events: vi.fn(), updateCareer: vi.fn(), careerBackup: vi.fn(), careerRestore: vi.fn(),
      fitSquad: vi.fn(), recommendTactic: vi.fn(), development: vi.fn(), positionAdvice: vi.fn(),
    },
  }
})

const slot = (slotId: string) => ({ slotId, position: 'CM', defaultRole: 'box_to_box_balanced', x: 0.5, y: 0.5 })
const member = (id: number, extra: object = {}) => ({ player: { id, name: `Oyuncu ${id}`, positions: ['CM'], overall: 60 + id, age: 25, valueEur: 1_000_000, valuationEstimated: false, ...extra }, onLoan: false })
const FITS: Record<number, object> = {
  1: { levelFit: 38.4, score: 65.2, fitLabel: 'WEAK' },
  2: { levelFit: 12.0, score: 40, fitLabel: 'WRONG_ROLE' },
  3: { levelFit: 80, score: 90, fitLabel: 'GOOD' },
}
const CAREER = { id: 1, clubName: 'Crewe Alexandra', budgetEur: 5_000_000, wageBudgetEur: 20_000, gameDate: '2027-01-15', windowEndsOn: '2027-01-31', gameVersionId: 27, clubId: 9, squadSize: 5 }

function Where() {
  return <p data-testid="where">{useLocation().search}</p>
}

function renderPage(path = '/career/desk') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/career/desk" element={<><DeskPage /><Where /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  careerStore.set(1)
  vi.mocked(endpoints.careers).mockResolvedValue([CAREER] as never)
  vi.mocked(endpoints.formations).mockResolvedValue([{ id: '4-3-3', name: '4-3-3', slots: [slot('CM1'), slot('CM2'), slot('CM3')] }] as never)
  vi.mocked(endpoints.squad).mockResolvedValue([member(1), member(2), member(3), member(4, { age: 32, valueEur: 3_000_000, contractUntil: '2027-05-01' }), member(5, { age: 19, overall: 58, potential: 76 })] as never)
  lineupStore.set(1, { CM1: 1, CM2: 2, CM3: 3 })
  vi.mocked(endpoints.fitRole).mockReset().mockImplementation(((b: { playerId: number }) => Promise.resolve({ roleFit: { playerId: b.playerId, playerName: `Oyuncu ${b.playerId}`, roleId: 'box_to_box_balanced', roleName: 'Box-to-Box (Balanced)', projectedRating: 70, outOfPosition: false, reasons: [], weaponChecks: [], ...FITS[b.playerId] } })) as never)
  vi.mocked(endpoints.playerFacets).mockResolvedValue({ gameDate: '2027-01-15', contractData: true, loanData: false, squadWageEur: 15_000 })
  vi.mocked(endpoints.snapshots).mockResolvedValue([{ id: 7, takenAt: '2026-10-10T12:00:00Z', source: 'IMPORT', playerCount: 30 }] as never)
  vi.mocked(endpoints.events).mockResolvedValue([{ id: 3, type: 'SELL', playerId: 4, playerName: 'Satılan Oyuncu', feeEur: 2_000_000, createdAt: '2026-10-12T10:00:00Z' }] as never)
})

describe('Kariyer Masası (v3)', () => {
  it('takım uyumu kadro kurucuyla aynı fonksiyon ve kaynaktan (useSlotFits v3 → teamFitPct)', async () => {
    renderPage()
    const expected = teamFitPct([1, 2, 3].map((id) => fitDisplay(FITS[id] as never)))
    expect(expected).toBe(43)
    expect(await screen.findByRole('img', { name: `Takım uyumu %${expected}` })).toBeInTheDocument()
  })

  it('en zayıf halkalar kart olarak (rozet + seviyesine göre %); "Aday bul" Transfer\'de o ihtiyacı seçili açar', async () => {
    renderPage()
    const weak = await screen.findByRole('region', { name: 'Zayıf halkalar' })
    const cards = await within(weak).findAllByRole('listitem')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Oyuncu 2')
    expect(cards[0]).toHaveTextContent('Seviyesine göre %12')
    expect(within(cards[0]).getByRole('link', { name: /Aday bul/ })).toHaveAttribute('href', '/career/transfer?ihtiyac=slot-CM2')
  })

  it('dönem bandı oyun tarihine göre: bitime kalan gün, bütçe, maaş bütçesi kullanımı', async () => {
    renderPage()
    const band = await screen.findByRole('region', { name: 'Dönem' })
    expect(await within(band).findByText('16 gün')).toBeInTheDocument()
    expect(within(band).getByText('€5,00 Mn')).toBeInTheDocument()
    expect(await within(band).findByText('%75')).toBeInTheDocument()
  })

  it('bilinmeyen değer gösterilmez: bütçe, oyun tarihi ve maaş verisi yoksa ilgili kutu yok, 0 yok', async () => {
    vi.mocked(endpoints.careers).mockResolvedValue([{ ...CAREER, budgetEur: undefined, gameDate: undefined, wageBudgetEur: undefined }] as never)
    vi.mocked(endpoints.playerFacets).mockResolvedValue({ contractData: false, loanData: false })
    renderPage()
    const band = await screen.findByRole('region', { name: 'Dönem' })
    await waitFor(() => expect(endpoints.playerFacets).toHaveBeenCalled())
    expect(within(band).queryByText('Transfer bütçesi')).toBeNull()
    expect(within(band).queryByText(/Dönem bitimine/)).toBeNull()
    expect(within(band).queryByText(/Maaş/)).toBeNull()
    expect(within(band).queryByText(/€0|%0/)).toBeNull()
    expect(within(band).getByText(/Bütçe, oyun tarihi ve maaş verisi girilmemiş/)).toBeInTheDocument()
  })

  it('uyarılar: sözleşme (oyun tarihine göre), plato, yaş; oyun tarihi yoksa sözleşme uyarısı yok', async () => {
    const view = renderPage()
    const box = await screen.findByRole('region', { name: 'Uyarılar' })
    expect(await within(box).findByText('Oyuncu 4: sözleşmesi 3 ay içinde bitiyor.')).toBeInTheDocument()
    view.unmount()
    vi.mocked(endpoints.careers).mockResolvedValue([{ ...CAREER, gameDate: undefined }] as never)
    vi.mocked(endpoints.playerFacets).mockResolvedValue({ contractData: true, loanData: false })
    renderPage()
    const again = await screen.findByRole('region', { name: 'Uyarılar' })
    await waitFor(() => expect(endpoints.playerFacets).toHaveBeenCalled())
    expect(within(again).queryByText(/sözleşmesi/)).toBeNull()
  })

  it('"3 iş" deskRules.suggestActions\'tan (satış planıyla tek kaynak)', async () => {
    renderPage()
    const jobs = await screen.findByRole('region', { name: 'Bu dönemin 3 işi' })
    // İlk 3: iki zayıf halka (öncelik 100 − %) ve kiralık (30 + 18 potansiyel farkı) > satış (40 + 3); sıra suggestActions'ın.
    expect(await within(jobs).findByText('Süre ver ya da kirala: Oyuncu 5')).toBeInTheDocument()
    expect(within(jobs).getAllByRole('listitem').map((li) => li.querySelector('b')?.textContent)).toEqual(['CM: zayıf halka (Seviyesine göre %12)', 'CM: zayıf halka (Seviyesine göre %38)', 'Süre ver ya da kirala: Oyuncu 5'])
  })

  it('zaman çizelgesi Türkçe etiketlerle (WEB-BUG-17); başlıkta son içe aktarma tarihi', async () => {
    renderPage()
    const timeline = await screen.findByRole('region', { name: 'Zaman çizelgesi' })
    expect(await within(timeline).findByText(/Satış · Satılan Oyuncu/)).toBeInTheDocument()
    expect(within(timeline).queryByText(/SELL/)).toBeNull()
    expect(await screen.findByText(/Son içe aktarma 10\.10\.2026/)).toBeInTheDocument()
    // "Yeni kariyer" kariyer seçicinin yanında tek düğme (seçici bileşeninin kendi düğmesi; ikinci kopya yok).
    expect(screen.getAllByRole('button', { name: /Yeni kariyer/ })).toHaveLength(1)
  })

  it('Ayarlar ayrı sekme ve adres çubuğunda', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: 'Ayarlar' }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toContain('sekme=ayarlar'))
    expect(await screen.findByText('Kariyer ayarları ve yedek')).toBeInTheDocument()
  })

  it('yalnız v3: rol uyumu /fit/role v3; eski uçlar (fit/squad, advisor, gelişim) çağrılmaz', async () => {
    renderPage()
    await screen.findByRole('img', { name: /Takım uyumu/ })
    expect(vi.mocked(endpoints.fitRole).mock.calls.every(([b]) => b.engineVersion === 'v3')).toBe(true)
    for (const legacy of [endpoints.fitSquad, endpoints.recommendTactic, endpoints.development, endpoints.positionAdvice]) {
      expect(legacy).not.toHaveBeenCalled()
    }
  })
})
