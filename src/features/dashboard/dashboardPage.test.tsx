import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserTactic } from '../../api/types'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { labStore } from '../../state/labStore'
import { DashboardPage } from './DashboardPage'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: 'FREE', creditBalance: 17, dailyCreditLimit: 20 } }) }))
vi.mock('../../api/endpoints', () => {
  const none = () => Promise.resolve([])
  return {
    endpoints: {
      careers: vi.fn(), squad: vi.fn(), mainTactic: vi.fn(), starterTactic: vi.fn(), lineup: vi.fn(), formations: vi.fn(), roles: none, eaRoles: none,
      resolveTactic: vi.fn(() => Promise.resolve({ formation: '4-3-3', slots: [] })), fitRole: vi.fn(), playerFacets: vi.fn(),
      snapshots: vi.fn(), events: vi.fn(), updateCareer: vi.fn(), careerBackup: vi.fn(), careerRestore: vi.fn(), deleteCareer: vi.fn(),
      userTactics: none, saveUserTactic: vi.fn(), setMainTactic: vi.fn(), playerTags: none, snapshotDiff: vi.fn(() => Promise.resolve({ rows: [] })),
      fitSquad: vi.fn(), recommendTactic: vi.fn(), development: vi.fn(), positionAdvice: vi.fn(),
    },
  }
})

const slot = (slotId: string) => ({ slotId, position: 'CM', defaultRole: 'box_to_box_balanced', x: 0.5, y: 0.5 })
const member = (id: number, extra: object = {}, player: object = {}) => ({ player: { id, name: `Oyuncu ${id}`, positions: ['CM'], overall: 60 + id, age: 25, ...player }, onLoan: false, ...extra })
const FITS: Record<number, object> = {
  1: { levelFit: 38.4, score: 65.2, fitLabel: 'WEAK', reasons: ['Pas isabeti düşük'] },
  2: { levelFit: 12.0, score: 40, fitLabel: 'WRONG_ROLE', reasons: ['Dayanıklılık düşük'] },
  3: { levelFit: 80, score: 90, fitLabel: 'GOOD', reasons: [] },
  5: { levelFit: 50, score: 70, fitLabel: 'AT_LEVEL', reasons: ['Seviyesinde'] },
}
const CAREER = { id: 1, name: 'Crewe', clubName: 'Crewe Alexandra', season: 1, budgetEur: 5_000_000, wageBudgetEur: 20_000, gameDate: '2027-01-15', windowEndsOn: '2027-01-31', gameVersionId: 27, clubId: 9, squadSize: 5, spoilerMode: 'SHOW' }
const MAIN: UserTactic = {
  slot: 2, careerId: 1, name: 'Ana 4-3-3', formation: '4-3-3', buildUp: 'Balanced', defensiveApproach: null, lineHeight: null,
  slots: ['CM1', 'CM2', 'CM3'].map((s) => ({ slot: s, position: 'CM', roleId: 'box_to_box_balanced', tags: [] })), eaCode: 'X', sourceReplicaId: null,
  main: true, lineup: { CM1: 1, CM2: 2, CM3: 3 }, depth: 50, presetId: null, updatedAt: '2026-10-20T10:00:00Z', lineupDropped: 0,
} as UserTactic

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname}{location.search}</p>
}

function renderPage(path = '/career/dashboard') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/career/dashboard" element={<><DashboardPage /><Where /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  labStore.reload()
  careerStore.set(1)
  vi.mocked(endpoints.careers).mockResolvedValue([CAREER] as never)
  vi.mocked(endpoints.formations).mockResolvedValue([{ id: '4-3-3', name: '4-3-3', slots: [slot('CM1'), slot('CM2'), slot('CM3')] }] as never)
  vi.mocked(endpoints.squad).mockResolvedValue([
    member(1, { wageEur: 5_000 }), member(2, { wageEur: 5_000 }), member(3, { wageEur: 5_000 }),
    member(4, { wageEur: 2_000 }, { age: 32, contractUntil: '2027-05-01' }),
    member(5, { onLoan: true, loanUntil: '2027-02-05' }),
  ] as never)
  vi.mocked(endpoints.mainTactic).mockResolvedValue(MAIN as never)
  vi.mocked(endpoints.starterTactic).mockReset()
  vi.mocked(endpoints.lineup).mockReset()
  vi.mocked(endpoints.fitRole).mockReset().mockImplementation(((b: { playerId: number }) => Promise.resolve({ roleFit: { playerId: b.playerId, playerName: `Oyuncu ${b.playerId}`, roleId: 'box_to_box_balanced', roleName: 'Box-to-Box (Balanced)', projectedRating: 70, outOfPosition: false, weaponChecks: [], ...FITS[b.playerId] } })) as never)
  vi.mocked(endpoints.playerFacets).mockResolvedValue({ gameDate: '2027-01-15', contractData: true, loanData: true })
  vi.mocked(endpoints.snapshots).mockResolvedValue([
    { id: 9, takenAt: '2026-10-19T12:00:00Z', source: 'IMPORT', playerCount: 30, budgetEur: 5_000_000 },
    { id: 7, takenAt: '2026-10-10T12:00:00Z', source: 'IMPORT', playerCount: 30, budgetEur: 4_000_000 },
  ] as never)
  vi.mocked(endpoints.events).mockResolvedValue([{ id: 3, type: 'SELL', playerId: 4, playerName: 'Satılan Oyuncu', feeEur: 2_000_000, createdAt: '2026-10-12T10:00:00Z' }] as never)
  vi.mocked(endpoints.updateCareer).mockReset().mockResolvedValue(CAREER as never)
})

describe('Kariyer Masası (KARIYER-UX FAZ 2)', () => {
  it('ana taktik varsa: takım uyumu ve zayıf halkalar ana taktikten, "Kararın" etiketiyle; saha yok', async () => {
    renderPage()
    const fit = await screen.findByRole('region', { name: 'Takım uyumu' })
    expect(await within(fit).findByRole('img', { name: /Takım uyumu %43/ })).toBeInTheDocument()
    expect(within(fit).getByText('Kararın')).toBeInTheDocument()
    expect(screen.queryByText('Otomatik öneri · ana taktik değil')).toBeNull()
    expect(endpoints.starterTactic).not.toHaveBeenCalled()
  })

  it('zayıf halkalar: sunucu etiketi metniyle, levelFit yüzdesi ve ilk neden; çözüm bağlantıları', async () => {
    renderPage()
    const weak = await screen.findByRole('region', { name: 'Zayıf halkalar' })
    const cards = await within(weak).findAllByRole('listitem')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Oyuncu 2')
    expect(cards[0]).toHaveTextContent('Rol için eksik')
    expect(cards[0]).toHaveTextContent('%12')
    expect(cards[0]).toHaveTextContent('Dayanıklılık düşük')
    expect(cards[1]).toHaveTextContent('Rol için sınırda')
    expect(within(cards[0]).getByRole('link', { name: /Transferde aday bul/ })).toHaveAttribute('href', '/career/transfer?ihtiyac=slot-CM2&pos=CM&rol=box_to_box_balanced&role=box_to_box_balanced')
    expect(within(cards[0]).getByRole('link', { name: /Lab'da dene/ })).toHaveAttribute('href', '/squad/builder?slot=CM2')
  })

  it('ana taktik yoksa: başlangıç önerisi paneli "Otomatik öneri" etiketiyle; uyum ve zayıf halka yerine boş durum', async () => {
    vi.mocked(endpoints.mainTactic).mockResolvedValue(null as never)
    vi.mocked(endpoints.starterTactic).mockResolvedValue({
      formationId: '4-3-3', setup: { buildUp: 'Balanced', depth: 50 }, squadFit: 61, lineup: { CM1: 1, CM2: 2, CM3: 3 }, alternatives: [],
      slots: ['CM1', 'CM2', 'CM3'].map((s) => ({ slotId: s, position: 'CM', roleId: 'box_to_box_balanced', roleName: 'Box-to-Box' })),
    } as never)
    renderPage()
    expect(await screen.findByText('Otomatik öneri · ana taktik değil')).toBeInTheDocument()
    const weak = await screen.findByRole('region', { name: 'Zayıf halkalar' })
    expect(within(weak).getByText('Ana taktik seçilmedi')).toBeInTheDocument()
    expect(within(weak).getByRole('link', { name: "Lab'a git" })).toBeInTheDocument()
  })

  it('dizilişten düşen oyuncu: /fit/lineup kilitli doldurur, metin "otomatik dolduruldu"', async () => {
    vi.mocked(endpoints.mainTactic).mockResolvedValue({ ...MAIN, lineup: { CM1: 1, CM2: 2 }, lineupDropped: 1 } as never)
    vi.mocked(endpoints.lineup).mockResolvedValue({ slots: [{ slotId: 'CM1', playerId: 1 }, { slotId: 'CM2', playerId: 2 }, { slotId: 'CM3', playerId: 3 }] } as never)
    renderPage()
    expect(await screen.findByText('1 oyuncu kadroda yok, otomatik dolduruldu')).toBeInTheDocument()
    expect(endpoints.lineup).toHaveBeenCalledWith(1, expect.objectContaining({ formation: '4-3-3' }), { CM1: 1, CM2: 2 })
    const fit = screen.getByRole('region', { name: 'Takım uyumu' })
    expect(await within(fit).findByRole('img', { name: /Takım uyumu %43/ })).toBeInTheDocument()
  })

  it('finansal sağlık: bütçe Δ önceki IMPORT\'a göre, maaş kullanımı, bilinmeyen maaş notu, döneme kalan gün', async () => {
    renderPage()
    const box = await screen.findByRole('region', { name: 'Finansal sağlık' })
    expect(await within(box).findByText('€5,00 Mn')).toBeInTheDocument()
    expect(within(box).getByText(/\+€1,00 Mn/)).toBeInTheDocument()
    expect(within(box).getByText('16 gün')).toBeInTheDocument()
    expect(await within(box).findByText('1 oyuncunun maaşı bilinmiyor')).toBeInTheDocument()
    expect(within(box).getByText(/Kayıt verisi · 19 Eki/)).toBeInTheDocument()
  })

  it('dönem sonu girilmemişse "–" ve Ayarlar bağlantısı', async () => {
    vi.mocked(endpoints.careers).mockResolvedValue([{ ...CAREER, windowEndsOn: undefined }] as never)
    renderPage()
    const box = await screen.findByRole('region', { name: 'Finansal sağlık' })
    const link = await within(box).findByRole('link', { name: /Dönem sonunu gir/ })
    fireEvent.click(link)
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/career/dashboard?sekme=ayarlar'))
  })

  it('acil uyarılar: sözleşme ≤ 6 ay, kiralık ≤ 30 gün (kadro satırındaki loanUntil), sakatlık "Veri yok"', async () => {
    renderPage()
    const box = await screen.findByRole('region', { name: 'Acil uyarılar' })
    expect(await within(box).findByText('Oyuncu 5 kiralık süresi bitiyor · 21 gün')).toBeInTheDocument()
    expect(within(box).getByText('Oyuncu 4 · sözleşme 3 ay')).toBeInTheDocument()
    expect(within(box).getByText('Sakatlık')).toBeInTheDocument()
    expect(within(box).getByText('Veri yok')).toBeInTheDocument()
  })

  it('zaman çizelgesi: yaklaşan (türetilmiş) ve geçmiş (hamle, içe aktarma)', async () => {
    renderPage()
    const box = await screen.findByRole('region', { name: 'Zaman çizelgesi' })
    expect(await within(box).findByText('Transfer dönemi sonu')).toBeInTheDocument()
    expect(within(box).getByText('Oyuncu 5 · kiralık bitiyor')).toBeInTheDocument()
    expect(await within(box).findByText(/Satış · Satılan Oyuncu/)).toBeInTheDocument()
    expect(within(box).getAllByText(/İçe aktarma · 30 oyuncu/).length).toBeGreaterThan(0)
  })

  it('her panelin başlığında veri katmanı etiketi', async () => {
    renderPage()
    for (const name of ['Finansal sağlık', 'Acil uyarılar', 'Takım uyumu', 'Zayıf halkalar', 'Zaman çizelgesi']) {
      const box = await screen.findByRole('region', { name })
      await waitFor(() => expect(box.querySelector('[data-source]')).not.toBeNull())
    }
  })

  it('Ayarlar sekmesi: ad, bütçe, sezon, maaş bütçesi, dönem sonu, spoiler tek kayıtta; yedek ve sil burada', async () => {
    renderPage('/career/dashboard?sekme=ayarlar')
    const name = await screen.findByLabelText('Ad')
    fireEvent.change(name, { target: { value: 'Crewe 2' } })
    fireEvent.change(screen.getByLabelText('Sezon'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Transfer dönemi bitişi'), { target: { value: '2027-02-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }))
    await waitFor(() => expect(endpoints.updateCareer).toHaveBeenCalledWith(1, expect.objectContaining({
      name: 'Crewe 2', season: 3, budgetEur: 5_000_000, wageBudgetEur: 20_000, windowEndsOn: '2027-02-01', spoilerMode: 'SHOW',
    })))
    expect(screen.getByLabelText('Potansiyel gösterimi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'JSON yedeği indir' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kariyeri sil/ })).toBeInTheDocument()
  })

  it('Masa taslak (katman 3) okumaz: Lab taslağı varken bile gösterilen diziliş ana taktikten', async () => {
    labStore.create(1, { name: 'Deneme', origin: { kind: 'blank' }, tactic: { formation: '4-4-2', slots: {} }, lineup: { CM1: 4 } })
    const read = vi.spyOn(labStore, 'get')
    renderPage()
    const weak = await screen.findByRole('region', { name: 'Zayıf halkalar' })
    expect(await within(weak).findAllByRole('listitem')).toHaveLength(2)
    expect(read).not.toHaveBeenCalled()
    expect(vi.mocked(endpoints.fitRole).mock.calls.map(([b]) => b.playerId).sort()).toEqual([1, 2, 3])
    read.mockRestore()
  })
})
