import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserTactic } from '../../api/types'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { labStore } from '../../state/labStore'
import { lineupFromFitRole } from '../../test/lineupFromFitRole'
import { DashboardPage } from './DashboardPage'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: 'FREE', creditBalance: 17, dailyCreditLimit: 20 } }) }))
vi.mock('../../api/endpoints', () => {
  const none = () => Promise.resolve([])
  return {
    endpoints: {
      careers: vi.fn(), squad: vi.fn(), mainTactic: vi.fn(), starterTactic: vi.fn(), lineup: vi.fn(), formations: vi.fn(), roles: none, eaRoles: none,
      resolveTactic: vi.fn(() => Promise.resolve({ formation: '4-3-3', slots: [] })), fitRole: vi.fn(), playerFacets: vi.fn(),
      snapshots: vi.fn(), events: vi.fn(), updateCareer: vi.fn(), managerProfile: vi.fn(), careerBackup: vi.fn(), careerRestore: vi.fn(), deleteCareer: vi.fn(),
      userTactics: none, saveUserTactic: vi.fn(), setMainTactic: vi.fn(), playerTags: none, snapshotDiff: vi.fn(() => Promise.resolve({ rows: [] })),
      fitSquad: vi.fn(), recommendTactic: vi.fn(), development: vi.fn(), positionAdvice: vi.fn(), setupCheck: vi.fn(() => Promise.resolve([])), tacticAnalysis: vi.fn(() => Promise.resolve({ metrics: { band: 'BALANCED', depth: 50 }, findings: [], notEvaluated: [] })),
    },
  }
})

const slot = (slotId: string) => ({ slotId, position: 'CM', defaultRole: 'box_to_box_balanced', x: 0.5, y: 0.5 })
const member = (id: number, extra: object = {}, player: object = {}) => ({ player: { id, name: `Oyuncu ${id}`, positions: ['CM'], overall: 60 + id, age: 25, ...player }, onLoan: false, ...extra })
const FITS: Record<number, object> = {
  1: { levelFit: 38.4, score: 65.2, fitLabel: 'WEAK', reasons: ['ShortPassing -6.1'] },
  2: { levelFit: 12.0, score: 40, fitLabel: 'WRONG_ROLE', reasons: ['SprintSpeed +9.0', 'Stamina -12.5'] },
  3: { levelFit: 80, score: 90, fitLabel: 'GOOD', reasons: [] },
  5: { levelFit: 50, score: 70, fitLabel: 'AT_LEVEL', reasons: ['Vision +1.0'] },
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
  vi.mocked(endpoints.fitRole).mockReset().mockImplementation(((b: { playerId: number }) => Promise.resolve({ roleFit: { playerId: b.playerId, playerName: `Oyuncu ${b.playerId}`, roleId: 'box_to_box_balanced', roleName: 'Box-to-Box (Balanced)', projectedRating: 70, outOfPosition: false, weaponChecks: [], ...FITS[b.playerId] } })) as never)
  // FAZ 4b: rol uyumu tek /fit/lineup (dizilenler kilitli) — yanıt aynı fikstürden.
  vi.mocked(endpoints.lineup).mockReset().mockImplementation(lineupFromFitRole(endpoints.fitRole as never) as never)
  vi.mocked(endpoints.playerFacets).mockResolvedValue({ gameDate: '2027-01-15', contractData: true, loanData: true })
  vi.mocked(endpoints.snapshots).mockResolvedValue([
    { id: 9, takenAt: '2026-10-19T12:00:00Z', source: 'IMPORT', playerCount: 30, budgetEur: 5_000_000 },
    { id: 7, takenAt: '2026-10-10T12:00:00Z', source: 'IMPORT', playerCount: 30, budgetEur: 4_000_000 },
  ] as never)
  vi.mocked(endpoints.events).mockResolvedValue([{ id: 3, type: 'SELL', playerId: 4, playerName: 'Satılan Oyuncu', feeEur: 2_000_000, createdAt: '2026-10-12T10:00:00Z' }] as never)
  vi.mocked(endpoints.updateCareer).mockReset().mockResolvedValue(CAREER as never)
  vi.mocked(endpoints.managerProfile).mockReset().mockResolvedValue(null)
})

/** MGR-b §3: kariyer varken Masa'nın üstünde küçük menajer satırı; tıklayınca profil. Profil yoksa satır yok. */
describe('Masa menajer satırı (MGR-b)', () => {
  it('profil varsa "Menajer: {ad} · itibar {bant}" profili açar', async () => {
    vi.mocked(endpoints.managerProfile).mockResolvedValue({
      profile: { name: 'Buğra', licence: 'PRO', background: 'WORLD_CLASS', style: 'POSSESSION', priorities: [], difficulty: 'EASY' }, reputation: 100, band: 'Dünya çapında',
    })
    renderPage()
    const link = await screen.findByRole('link', { name: 'Menajer: Buğra · itibar Dünya çapında' })
    expect(link).toHaveAttribute('href', '/career/manager?sonra=masa')
  })

  it('profil yoksa satır çıkmaz', async () => {
    renderPage()
    expect((await screen.findAllByRole('heading', { name: 'Kariyer Masası' })).length).toBeGreaterThan(0)
    await waitFor(() => expect(endpoints.managerProfile).toHaveBeenCalled())
    expect(screen.queryByRole('link', { name: /^Menajer:/ })).toBeNull()
  })

  it('kariyer yokken boş durum kulüp önerilerine (Yeni kariyer) yönlendirir', async () => {
    vi.mocked(endpoints.careers).mockResolvedValue([] as never)
    renderPage()
    expect(await screen.findByRole('link', { name: 'Kulüp önerilerini gör' })).toHaveAttribute('href', '/career/new')
  })
})

/** REVIEW Y5: hata boş durum gibi görünmez ("kariyerin yok", "kadro boş" değil); tekrar denenebilir. */
describe('Kariyer Masası hata durumları', () => {
  it('kariyer listesi alınamazsa "yüklenemedi" + Tekrar dene; "Henüz kariyerin yok" yazmaz', async () => {
    vi.mocked(endpoints.careers).mockRejectedValue(new Error('ağ'))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Kariyerler yüklenemedi.')
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument()
    expect(screen.queryByText(/Henüz kariyerin yok/)).toBeNull()
  })

  it('veri varken arka plan yenilemesi başarısız olursa sayfa hata ekranına düşmez; eldeki veri kalır', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/career/dashboard']}>
          <Routes><Route path="/career/dashboard" element={<DashboardPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect((await screen.findAllByRole('heading', { name: 'Kariyer Masası' })).length).toBeGreaterThan(0)
    vi.mocked(endpoints.careers).mockRejectedValue(new Error('ağ'))
    await client.refetchQueries({ queryKey: ['careers'] }).catch(() => undefined)
    await waitFor(() => expect(client.getQueryState(['careers'])?.status).toBe('error'))
    expect(screen.queryByText('Kariyerler yüklenemedi.')).toBeNull()
    expect(screen.getAllByRole('heading', { name: 'Kariyer Masası' }).length).toBeGreaterThan(0)
  })

  it('kadro alınamazsa üstte "Kadro yüklenemedi" + Tekrar dene', async () => {
    vi.mocked(endpoints.squad).mockRejectedValue(new Error('ağ'))
    renderPage()
    expect(await screen.findByText('Kadro yüklenemedi.')).toBeInTheDocument()
  })
})

describe('Kariyer Masası (KARIYER-UX FAZ 2)', () => {
  it('ana taktik varsa: takım uyumu ve zayıf halkalar ana taktikten, "Kararın" etiketiyle; saha yok', async () => {
    renderPage()
    const fit = await screen.findByRole('region', { name: 'Takım gücü' })
    expect(await within(fit).findByRole('img', { name: /Takım gücü %65/ })).toBeInTheDocument()
    expect(within(fit).getByText('Kararın')).toBeInTheDocument()
    expect(screen.queryByText('Otomatik öneri · ana taktik değil')).toBeNull()
    expect(endpoints.starterTactic).not.toHaveBeenCalled()
  })

  it('zayıf halkalar: sunucu etiketi metniyle, levelFit yüzdesi ve en büyük negatif katkı; çözüm bağlantıları', async () => {
    renderPage()
    const weak = await screen.findByRole('region', { name: 'Zayıf halkalar' })
    const cards = await within(weak).findAllByRole('listitem')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Oyuncu 2')
    expect(cards[0]).toHaveTextContent('Rol için eksik')
    expect(cards[0]).toHaveTextContent('%12')
    expect(cards[0]).toHaveTextContent('Dayanıklılık −12,5')
    expect(cards[0]).not.toHaveTextContent('Sprint hızı')
    expect(cards[1]).toHaveTextContent('Rol için sınırda')
    expect(within(cards[0]).getByRole('link', { name: /Transferde aday bul/ })).toHaveAttribute('href', '/career/transfer?ihtiyac=slot-CM2&pos=CM&rol=box_to_box_balanced')
  })

  it('KARIYER-UX 6: zayıf halka oyuncusunun sözleşmesi ≤ 12 ay ise kartta kalan ay (birleşik uyarı)', async () => {
    vi.mocked(endpoints.squad).mockResolvedValue([
      member(1, { wageEur: 5_000 }, { contractUntil: '2027-10-20' }), member(2, { wageEur: 5_000 }, { contractUntil: '2030-06-30' }), member(3, { wageEur: 5_000 }),
      member(4, { wageEur: 2_000 }, { age: 32, contractUntil: '2027-05-01' }), member(5, { onLoan: true, loanUntil: '2027-02-05' }),
    ] as never)
    renderPage()
    const weak = await screen.findByRole('region', { name: 'Zayıf halkalar' })
    const [wrongRole, weakCard] = await within(weak).findAllByRole('listitem')
    expect(weakCard).toHaveTextContent('Sözleşmesi 9 ay içinde bitiyor')
    expect(wrongRole).not.toHaveTextContent('Sözleşmesi')
  })

  it('WRONG_ROLE kartı: birincil "Rolü değiştir" (Lab, slot seçili), ikincil aday; WEAK kartı: birincil aday, ikincil "Lab\'da dene"', async () => {
    renderPage()
    const weak = await screen.findByRole('region', { name: 'Zayıf halkalar' })
    const [wrongRole, weakCard] = await within(weak).findAllByRole('listitem')
    const change = within(wrongRole).getByRole('link', { name: /Rolü değiştir/ })
    expect(change).toHaveAttribute('data-variant', 'primary')
    expect(change).toHaveAttribute('href', '/career/tactics-lab?sekme=kurucu&slot=CM2')
    expect(within(wrongRole).getByRole('link', { name: /Transferde aday bul/ })).toHaveAttribute('data-variant', 'secondary')
    expect(within(weakCard).getByRole('link', { name: /Transferde aday bul/ })).toHaveAttribute('data-variant', 'primary')
    expect(within(weakCard).getByRole('link', { name: /Lab'da dene/ })).toHaveAttribute('href', '/career/tactics-lab?sekme=kurucu&slot=CM1')
  })

  it('"Bu dönemin 3 işi" Masa\'nın en üstünde; kaynak yalnız panel başlığında ("Ana taktiğe göre"), satırlarda etiket yok (FAZ 6a-D)', async () => {
    renderPage()
    const jobs = await screen.findByRole('region', { name: 'Bu dönemin 3 işi' })
    const panel = screen.getByRole('tabpanel')
    expect(panel.querySelector('section')).toBe(jobs)
    const items = await within(jobs).findAllByRole('listitem')
    expect(items.length).toBeGreaterThan(0)
    await waitFor(() => expect(jobs.querySelector('header [data-source="decision"]')?.textContent).toContain('Ana taktiğe göre'))
    items.forEach((li) => expect(li.querySelector('[data-source]')).toBeNull())
    expect(within(jobs).queryByText('Kararın')).toBeNull()
  })

  it('FAZ 6a-D: aynı türden tek iş; kalanlar "+N benzer" ile açılır', async () => {
    vi.mocked(endpoints.squad).mockResolvedValue([
      member(1, { wageEur: 5_000 }), member(2, { wageEur: 5_000 }), member(3, { wageEur: 5_000 }),
      member(21, {}, { age: 19, overall: 60, potential: 80 }), member(22, {}, { age: 20, overall: 59, potential: 79 }), member(23, {}, { age: 18, overall: 58, potential: 78 }),
    ] as never)
    renderPage()
    const jobs = await screen.findByRole('region', { name: 'Bu dönemin 3 işi' })
    await waitFor(() => expect(within(jobs).getAllByText('Kiralık')).toHaveLength(1))
    const more = within(jobs).getByRole('button', { name: '+2 benzer' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    expect(within(jobs).getByRole('list', { name: 'Benzer işler · Kiralık' }).querySelectorAll('li')).toHaveLength(2)
  })

  it('tek IMPORT varsa Δ çipi hiç gösterilmez', async () => {
    vi.mocked(endpoints.snapshots).mockResolvedValue([{ id: 9, takenAt: '2026-10-19T12:00:00Z', source: 'IMPORT', playerCount: 30, budgetEur: 5_000_000 }] as never)
    renderPage()
    const box = await screen.findByRole('region', { name: 'Finansal sağlık' })
    expect(await within(box).findByText('€5,00 Mn')).toBeInTheDocument()
    expect(box.querySelector('[data-delta]')).toBeNull()
  })

  it('ana taktik yoksa: başlangıç önerisi paneli "Otomatik öneri" etiketiyle; uyum ve zayıf halka yerine boş durum', async () => {
    vi.mocked(endpoints.mainTactic).mockResolvedValue(null as never)
    vi.mocked(endpoints.starterTactic).mockResolvedValue({
      formationId: '4-3-3', setup: { buildUp: 'Balanced', depth: 50 }, squadFit: 61, lineup: { CM1: 1, CM2: 2, CM3: 3 }, alternatives: [],
      slots: ['CM1', 'CM2', 'CM3'].map((s) => ({ slotId: s, position: 'CM', roleId: 'box_to_box_balanced', roleName: 'Box-to-Box' })),
    } as never)
    renderPage()
    expect((await screen.findAllByText('Otomatik öneri · ana taktik değil')).length).toBeGreaterThan(0)
    const weak = await screen.findByRole('region', { name: 'Zayıf halkalar' })
    expect(within(weak).getByText('Ana taktik seçilmedi')).toBeInTheDocument()
    expect(within(weak).getByRole('link', { name: "Lab'a git" })).toHaveAttribute('href', '/career/tactics-lab')
    // 3 iş başlangıç önerisine göre hesaplanır ve "Otomatik öneri" etiketi taşır.
    const jobs = await screen.findByRole('region', { name: 'Bu dönemin 3 işi' })
    await waitFor(() => expect(jobs.querySelector('header [data-source="auto"]')).not.toBeNull())
    expect(screen.getByRole('button', { name: "Lab'da düzenle" })).toBeInTheDocument()
  })

  it('başlangıç önerisi hata verirse istek döngüye girmez (panel bağlanıp sökülmez)', async () => {
    vi.mocked(endpoints.mainTactic).mockResolvedValue(null as never)
    vi.mocked(endpoints.starterTactic).mockRejectedValue(new Error('429'))
    renderPage()
    expect(await screen.findByText('Taktik yüklenemedi.')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 300))
    expect(vi.mocked(endpoints.starterTactic).mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('dizilişten düşen oyuncu: /fit/lineup kilitli doldurur, metin "otomatik dolduruldu"', async () => {
    vi.mocked(endpoints.mainTactic).mockResolvedValue({ ...MAIN, lineup: { CM1: 1, CM2: 2 }, lineupDropped: 1 } as never)
    const fits = lineupFromFitRole(endpoints.fitRole as never)
    // Doldurma isteği (2 kilitli) üçüncü slotu doldurur; uyum isteği (3 kilitli) fikstürden.
    vi.mocked(endpoints.lineup).mockImplementation(((c: number, t: unknown, locked?: Record<string, number>) => Object.keys(locked ?? {}).length === 2
      ? Promise.resolve({ slots: [{ slotId: 'CM1', playerId: 1 }, { slotId: 'CM2', playerId: 2 }, { slotId: 'CM3', playerId: 3 }] })
      : fits(c, t, locked)) as never)
    renderPage()
    expect(await screen.findByText('1 oyuncu kadroda yok, otomatik dolduruldu')).toBeInTheDocument()
    expect(endpoints.lineup).toHaveBeenCalledWith(1, expect.objectContaining({ formation: '4-3-3' }), { CM1: 1, CM2: 2 })
    const fit = screen.getByRole('region', { name: 'Takım gücü' })
    expect(await within(fit).findByRole('img', { name: /Takım gücü %65/ })).toBeInTheDocument()
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
    // FAZ 6a-E: kadro bilgisi olmayan görüntüde yalnız tür (dünya oyuncu sayısı yazılmaz).
    expect(within(box).getAllByText(/^İçe aktarma$/).length).toBeGreaterThan(0)
  })

  it('FAZ 6a-A: kayıt verisi eksikse tek bant (ne eksik, neyi etkiliyor, nasıl tamamlanır); boş kutular yerine yalnız mevcut veri', async () => {
    vi.mocked(endpoints.careers).mockResolvedValue([{ ...CAREER, gameDate: undefined }] as never)
    vi.mocked(endpoints.playerFacets).mockResolvedValue({ contractData: false, loanData: false })
    vi.mocked(endpoints.squad).mockResolvedValue([member(1), member(2), member(3)] as never)
    renderPage()
    const banner = await screen.findByRole('region', { name: 'Kayıt verisi eksik' })
    await waitFor(() => expect(within(banner).getAllByRole('listitem')).toHaveLength(3))
    expect(banner).toHaveTextContent('Oyun tarihi')
    expect(banner).toHaveTextContent('Maaş ve sözleşme')
    expect(within(banner).getByRole('link', { name: /Kariyer içinden yeniden içe aktar/ })).toHaveAttribute('href', '/career/import')
    expect(screen.queryByRole('region', { name: 'Acil uyarılar' })).toBeNull()
    const finance = screen.getByRole('region', { name: 'Finansal sağlık' })
    expect(within(finance).queryByText('Maaş bütçesi kullanımı')).toBeNull()
    expect(within(finance).queryByText('Dönem sonuna')).toBeNull()
    expect(within(finance).getByText('Transfer bütçesi')).toBeInTheDocument()
    const timeline = screen.getByRole('region', { name: 'Zaman çizelgesi' })
    expect(within(timeline).queryByText('Yaklaşan')).toBeNull()
    expect(screen.queryByText(/Oyun tarihi yok/)).toBeNull()
  })

  it('FAZ 6a-A: veri tamsa bant yok', async () => {
    renderPage()
    await screen.findByRole('region', { name: 'Acil uyarılar' })
    expect(screen.queryByRole('region', { name: 'Kayıt verisi eksik' })).toBeNull()
  })

  it('FAZ 6a-E: geçmişte aynı gün içe aktarmalar tek satır, kadro sayısıyla (dünya oyuncu sayısı yok)', async () => {
    vi.mocked(endpoints.snapshots).mockResolvedValue([
      { id: 9, takenAt: '2026-10-19T12:00:00Z', source: 'IMPORT', playerCount: 21668, squadCount: 31, squadJoined: ['Yeni Oyuncu'], squadLeft: [] },
      { id: 8, takenAt: '2026-10-19T09:00:00Z', source: 'IMPORT', playerCount: 21668, squadCount: 30 },
    ] as never)
    renderPage()
    const box = await screen.findByRole('region', { name: 'Zaman çizelgesi' })
    expect(await within(box).findByText(/İçe aktarma ×2 · kadro: 31 oyuncu · giren: Yeni Oyuncu/)).toBeInTheDocument()
    expect(within(box).queryByText(/21668/)).toBeNull()
  })

  it('FIT-2 madde 6: ROL_UYUMSUZ kartı daha uygun rolü yazar; "Rolü değiştir" önerilen rolle Lab\'da yeni taslak açar', async () => {
    const better = { roleId: 'inside_forward_attack', roleName: 'Inside Forward (Attack)', currentFit: 70, levelFit: 71 }
    vi.mocked(endpoints.lineup).mockImplementation(((c: number, t: unknown, locked?: Record<string, number>) =>
      lineupFromFitRole(endpoints.fitRole as never)(c, t as never, locked).then((r: { slots: { slotId: string }[] }) => ({
        ...r, slots: r.slots.map((s) => (s.slotId === 'CM2' ? { ...s, weakClass: 'ROL_UYUMSUZ', betterRole: better } : { ...s, weakClass: 'UYGUN' })),
      }))) as never)
    renderPage()
    const weak = await screen.findByRole('region', { name: 'Zayıf halkalar' })
    const [card] = await within(weak).findAllByRole('listitem')
    expect(card).toHaveTextContent('Daha uygun rol: Inside Forward (Attack) · oturma %71')
    const href = '/career/tactics-lab?sekme=kurucu&slot=CM2&rol=inside_forward_attack'
    expect(within(card).getByRole('link', { name: /Rolü değiştir/ })).toHaveAttribute('href', href)
  })

  it('FIT-1: Takım gücü (Güç ortalaması) ve Rol oturması ayrı adlarla; zayıf halka kartında iki sayı adıyla ve sınıf başlığı', async () => {
    vi.mocked(endpoints.lineup).mockImplementation(((c: number, t: unknown, locked?: Record<string, number>) =>
      lineupFromFitRole(endpoints.fitRole as never)(c, t as never, locked).then((r: { slots: { slotId: string }[] }) => ({
        ...r, slots: r.slots.map((s) => ({ ...s, weakClass: s.slotId === 'CM2' ? 'IKISI' : 'UYGUN' })),
      }))) as never)
    renderPage()
    const fit = await screen.findByRole('region', { name: 'Takım gücü' })
    expect(await within(fit).findByRole('img', { name: /Takım gücü %65/ })).toBeInTheDocument()
    expect(within(fit).getByText('Rol oturması %43')).toBeInTheDocument()
    const weak = await screen.findByRole('region', { name: 'Zayıf halkalar' })
    const cards = await within(weak).findAllByRole('listitem')
    expect(cards).toHaveLength(1)
    expect(cards[0]).toHaveTextContent('Kalite açığı + rol uyumsuz')
    expect(cards[0]).toHaveTextContent('Rol oturması %12 · Güç 40')
    expect(cards[0]).toHaveTextContent('Rol için eksik')
  })

  it('FIT-1 madde 5: ana taktiğin taktik riski sayısı Masa\'da küçük satır; Lab bağlantısı', async () => {
    vi.mocked(endpoints.setupCheck).mockResolvedValue([
      { title: 'Yüksek hat: stoperlerde hız', status: 'RED', detail: 'x', advice: 'y', players: [] },
      { title: 'Kısa pasla çıkış: pas güvenliği', status: 'YELLOW', detail: 'x', advice: 'y', players: [] },
      { title: 'Kısa pasla çıkış: kaleci dağıtımı', status: 'GREEN', detail: 'x', advice: 'y', players: [] },
    ] as never)
    renderPage()
    const fit = await screen.findByRole('region', { name: 'Takım gücü' })
    const link = await within(fit).findByRole('link', { name: /2 taktik riski/ })
    expect(link).toHaveAttribute('href', '/career/tactics-lab?sekme=kurucu')
    expect(endpoints.setupCheck).toHaveBeenCalledWith(expect.objectContaining({ careerId: 1 }))
  })

  it('FIT-2 madde 7: Masa\'daki sayı Lab ile aynı liste — kurulum kontrolleri + ana taktiğin diziliş kuralları (bilgi sayılmaz)', async () => {
    vi.mocked(endpoints.setupCheck).mockResolvedValue([{ title: 'Yüksek hat: stoperlerde hız', status: 'RED', detail: 'x', advice: 'y', players: [] }] as never)
    vi.mocked(endpoints.tacticAnalysis).mockResolvedValue({ metrics: { band: 'BALANCED', depth: 50 }, notEvaluated: [], findings: [
      { code: 'striker_isolated', title: 'Santrfor yalnız', severity: 'WARN', instance: {}, evidence: [], text: 't' },
      { code: 'midfield_thin', title: 'Orta saha ince', severity: 'INFO', instance: {}, evidence: [], text: 't' },
    ] } as never)
    renderPage()
    const fit = await screen.findByRole('region', { name: 'Takım gücü' })
    expect(await within(fit).findByRole('link', { name: /2 taktik riski/ })).toBeInTheDocument()
    expect(endpoints.tacticAnalysis).toHaveBeenCalledWith(expect.objectContaining({ careerId: 1, assigned: expect.objectContaining({}) }))
  })

  it('FAZ 6a-F: göçten gelen "Önceki taslak" adı ana taktik adı olarak görünmez', async () => {
    vi.mocked(endpoints.mainTactic).mockResolvedValue({ ...MAIN, name: 'Önceki taslak' } as never)
    renderPage()
    const fit = await screen.findByRole('region', { name: 'Takım gücü' })
    expect(await within(fit).findByText('Ana taktik · 4-3-3')).toBeInTheDocument()
    expect(screen.queryByText(/Önceki taslak/)).toBeNull()
  })

  it('FAZ 6a-G / FIT-1: zayıf halka başlığında iki sayının anlamı (bilgi ikonu + title)', async () => {
    renderPage()
    const weak = await screen.findByRole('region', { name: 'Zayıf halkalar' })
    const note = within(weak).getByText('Rol oturması ve Güç')
    expect(note.closest('[title]')).toHaveAttribute('title', expect.stringContaining('seviyesindeki oyunculara göre'))
    expect(note.closest('[title]')).toHaveAttribute('title', expect.stringContaining('ne kadar etkili'))
  })

  it('FAZ 6a-C: ≥1280 px üç sütun (sol: 3 iş + zayıf halkalar · orta: uyum · sağ: finans + uyarılar + zaman çizelgesi)', async () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({ matches: query.includes('1280'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as never
    try {
      renderPage()
      await screen.findByRole('region', { name: 'Zayıf halkalar' })
      const columns = [...document.querySelectorAll('[data-masa-col]')]
      expect(columns.map((c) => c.getAttribute('data-masa-col'))).toEqual(['left', 'middle', 'right'])
      const names = (col: Element) => [...col.querySelectorAll(':scope > section[aria-label]')].map((s) => s.getAttribute('aria-label'))
      expect(names(columns[0])).toEqual(['Bu dönemin 3 işi', 'Zayıf halkalar'])
      expect(names(columns[1])).toEqual(['Takım gücü'])
      expect(names(columns[2])).toEqual(['Finansal sağlık', 'Acil uyarılar', 'Zaman çizelgesi'])
    } finally {
      window.matchMedia = original
    }
  })

  it('her panelin başlığında veri katmanı etiketi', async () => {
    renderPage()
    for (const name of ['Finansal sağlık', 'Acil uyarılar', 'Takım gücü', 'Zayıf halkalar', 'Zaman çizelgesi']) {
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
    expect(vi.mocked(endpoints.lineup).mock.calls.map(([, , locked]) => locked)).toContainEqual({ CM1: 1, CM2: 2, CM3: 3 })
    read.mockRestore()
  })
})
