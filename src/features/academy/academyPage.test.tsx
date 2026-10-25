import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Academy, AcademyPlayer, YouthDetail } from '../../api/types'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { AcademyPage } from './AcademyPage'
import { AcademyPlayerPage } from './AcademyPlayerPage'

const mobile = vi.hoisted(() => ({ value: false }))
vi.mock('../../design/components/MobileSheet', async (orig) => ({ ...(await orig<object>()), useIsMobile: () => mobile.value }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))
vi.mock('../../api/endpoints', () => ({
  endpoints: { careers: vi.fn(), academy: vi.fn(), youthDetail: vi.fn(), snapshots: vi.fn() },
}))

const row = (id: number, extra: Partial<AcademyPlayer> = {}): AcademyPlayer => ({
  playerId: id, name: `Genç ${id}`, age: 16, positions: ['CM'], overall: 55, potential: 70, potentialRange: null, monthsInSquad: 3, youthVerified: false,
  bestPosition: 'CM', sideReason: null, conversionPosition: null, plan: { name: 'Dengeli', label: 'Dengeli', text: 't', balanced: true }, promote: null,
  status: 'GROWING', loanedOut: false, potentialVariance: 5, playerTier: 2, swingLowPotential: 0, ...extra,
})
const KYLE = row(41, { name: 'Kyle Preston', age: 15, overall: 55, potential: 73, conversionPosition: 'CDM', status: 'READY',
  plan: { name: 'Holding', label: 'CDM · Holding', text: 'gerekçe', balanced: false },
  promote: { position: 'CDM', strength1: 62, backupName: 'Smith', backupStrength: 60, text: 'Kyle Preston · 1 sezon sonra tahmini CDM gücü 62, yedek Smith 60. Bu bir tahmin; A takıma alma oyunda yapılır.' } })
const WING = row(42, { name: 'Sol Kanat', age: 17, positions: ['LW'], bestPosition: 'RW', sideReason: 'Orta profili baskın + sağ ayak → RW', status: 'WAITING', potential: 78 })
const ACADEMY: Academy = { found: true, teamId: 112264, name: 'Port Vale Youth Academy', message: null, players: [KYLE, WING, row(43, { bestPosition: 'CB', positions: ['CB'] })] }
const DETAIL: YouthDetail = {
  playerId: 41, name: 'Kyle Preston', age: 15, positions: ['CM'], overall: 55, potential: 73, potentialRange: null, monthsInSquad: 3, academy: true,
  advice: { sentence: 'CDM · Holding planını seç: 2 sezonda CDM OVR 64 (Dengeli 61).', estimated: true, plans: [
    { label: 'Dengeli', kind: 'GENERAL', position: 'CDM', overall1: 58, overall2: 61 },
    { label: 'CDM · Holding', kind: 'ROLE', position: 'CDM', overall1: 60, overall2: 64 },
    { label: 'CDM mevki', kind: 'POSITION', position: 'CDM', overall1: 59, overall2: 63 }] },
  position: { bestPosition: 'CM', bestOverall: 55, listedPositions: ['CM'], conversionText: 'CM listeli ama CDM\'de daha etkili: CDM gücü 62, CM 58.', sideReason: null },
  team: { position: 'CDM', source: 'AUTO', slots: 1, starterName: 'Yıldız', starterStrength: 70, backupName: 'Smith', backupStrength: 60, strengths: [62, 66, 71], passBackupSeason: 1, passStarterSeason: 3 },
}

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.pathname + location.search}</output>
}

const rowButton = async (name: RegExp) => within(await screen.findByRole('list', { name: 'Oyuncular' })).getByRole('button', { name })

const renderAt = (url = '/career/academy') => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/career/academy" element={<AcademyPage />} />
        <Route path="/career/academy/:playerId" element={<AcademyPlayerPage />} />
      </Routes>
      <Where />
    </MemoryRouter>
  </QueryClientProvider>,
)

/** ACADEMY-b §2: Altyapı ekranı ("Altyapımda kim var, ne yapmalıyım?"). */
describe('AcademyPage', () => {
  beforeEach(() => {
    mobile.value = false
    careerStore.set(7)
    vi.mocked(endpoints.careers).mockResolvedValue([{ id: 7, name: 'K', clubId: 1, clubName: 'Port Vale', budgetEur: 1, season: 1, squadSize: 30, gender: 0 }] as never)
    vi.mocked(endpoints.academy).mockResolvedValue(ACADEMY)
    vi.mocked(endpoints.youthDetail).mockResolvedValue(DETAIL)
    vi.mocked(endpoints.snapshots).mockResolvedValue([{ id: 1, takenAt: '2027-09-19T10:00:00Z', source: 'IMPORT', playerCount: 40 }] as never)
  })

  it('başlık: sayfa adı Altyapı, altyapı adı · oyuncu sayısı, kayıt verisi etiketi', async () => {
    renderAt()
    expect(await screen.findByRole('heading', { level: 1, name: 'Altyapı' })).toBeInTheDocument()
    expect(await screen.findByText('Port Vale Youth Academy · 3 oyuncu')).toBeInTheDocument()
    expect(document.querySelector('[data-source="record"]')).toHaveTextContent('Kayıt verisi')
  })

  it('öne çıkanlar: en çok 3 kart; "A takıma hazır" tahmin etiketli', async () => {
    renderAt()
    const region = await screen.findByRole('region', { name: 'Öne çıkanlar' })
    const cards = within(region).getAllByRole('article')
    expect(cards.length).toBeLessThanOrEqual(3)
    expect(within(cards[0]).getByText('A takıma hazır')).toBeInTheDocument()
    expect(within(cards[0]).getByText(/Kyle Preston · 15 · CM/)).toBeInTheDocument()
    expect(within(cards[0]).getByText('1 sezon sonra CDM yedeğini geçer')).toBeInTheDocument()
    expect(within(cards[0]).getByText('tahmin')).toBeInTheDocument()
    expect(within(region).getByText('En yüksek potansiyel')).toBeInTheDocument()
    expect(within(region).getByRole('link', { name: /1 oyuncunun planı Dengeli değil/ })).toHaveAttribute('href', '#oyuncular')
  })

  it('satır: iki satırlık kart (tablo yok); dönüşüm "CM → CDM önerilir", OVR → POT çubuğu metinle, plan etiketi, durum metinle', async () => {
    renderAt()
    const list = await screen.findByRole('list', { name: 'Oyuncular' })
    expect(document.querySelector('table')).toBeNull()
    const kyle = within(list).getByRole('button', { name: /Kyle Preston/ })
    expect(kyle).toHaveTextContent('CM → CDM önerilir')
    expect(within(kyle).getByRole('img', { name: 'OVR 55, POT 73' })).toBeInTheDocument()
    expect(kyle).toHaveTextContent('55 → 73')
    expect(kyle).toHaveTextContent('Önerilen plan: CDM · Holding')
    expect(kyle).toHaveTextContent('Durum: Hazır')
    const wing = within(list).getByRole('button', { name: /Sol Kanat/ })
    expect(wing).toHaveTextContent('Durum: Bekliyor')
    expect(within(wing).getByTitle('Orta profili baskın + sağ ayak → RW')).toBeInTheDocument()
    // Karar 3: belirsizlik / seviye alanları görünmez.
    expect(list.textContent).not.toMatch(/±|Tier|seviye/)
  })

  it('sıralama ve hat filtresi adreste: ?sirala=yas&hat=hucum', async () => {
    renderAt()
    fireEvent.click(await screen.findByRole('radio', { name: 'Yaş' }))
    expect(screen.getByTestId('where')).toHaveTextContent('sirala=yas')
    fireEvent.click(screen.getByRole('radio', { name: 'Hücum' }))
    expect(screen.getByTestId('where')).toHaveTextContent('hat=hucum')
    const names = within(screen.getByRole('list', { name: 'Oyuncular' })).getAllByRole('button').map((b) => b.textContent)
    expect(names).toHaveLength(1)
    expect(names[0]).toContain('Sol Kanat')
  })

  it('adresten okunur: ?sirala=yas → en genç başta', async () => {
    renderAt('/career/academy?sirala=yas')
    const list = await screen.findByRole('list', { name: 'Oyuncular' })
    expect(within(list).getAllByRole('button')[0]).toHaveTextContent('Kyle Preston')
  })

  it('masaüstü: satır sağ paneli açar (?oyuncu=); üç bölüm, plan karşılaştırması ve "Otomatik öneri"', async () => {
    renderAt()
    fireEvent.click(await rowButton(/Kyle Preston/))
    expect(screen.getByTestId('where')).toHaveTextContent('/career/academy?oyuncu=41')
    const panel = await screen.findByRole('complementary', { name: 'Kyle Preston' })
    expect(await within(panel).findByRole('heading', { name: 'Ne yapmalıyım?' })).toBeInTheDocument()
    expect(within(panel).getByRole('heading', { name: 'Hangi mevkide?' })).toBeInTheDocument()
    expect(within(panel).getByRole('heading', { name: 'Takımdaki yeri' })).toBeInTheDocument()
    expect(await within(panel).findByText('CDM · Holding planını seç: 2 sezonda CDM OVR 64 (Dengeli 61).')).toBeInTheDocument()
    const comparison = within(panel).getByRole('list', { name: 'Plan karşılaştırması' })
    expect(within(comparison).getAllByRole('listitem')).toHaveLength(3)
    expect(comparison).toHaveTextContent('1 sezon 60 · 2 sezon 64')
    expect(within(panel).getByText('tahmin · kalibre edilmedi')).toBeInTheDocument()
    expect(within(panel).getByText(/Otomatik öneri/)).toBeInTheDocument()
    expect(panel).toHaveTextContent('Yedeği (Smith) 1. sezonda, ilk 11\'i (Yıldız) 3. sezonda geçer')
    expect(panel.textContent).not.toMatch(/levelFit|currentFit|curve/)
  })

  it('mobil: satır ayrı sayfayı açar (/career/academy/:playerId)', async () => {
    mobile.value = true
    renderAt()
    fireEvent.click(await rowButton(/Kyle Preston/))
    expect(screen.getByTestId('where')).toHaveTextContent('/career/academy/41')
    expect(await screen.findByRole('heading', { name: 'Ne yapmalıyım?' })).toBeInTheDocument()
  })

  it('mobil oyuncu sayfası: kapsam dışı oyuncu (404) kalıcı boş durum, yeniden dene yok', async () => {
    vi.mocked(endpoints.youthDetail).mockRejectedValue(Object.assign(new Error('yok'), { status: 404 }))
    renderAt('/career/academy/999')
    expect(await screen.findByText('Bu oyuncu altyapıda ya da kadroda değil.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tekrar dene/ })).toBeNull()
  })

  it('başlık sırası: Öne çıkanlar ve Oyuncular h2', async () => {
    renderAt()
    expect(await screen.findByRole('heading', { level: 2, name: 'Öne çıkanlar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Oyuncular' })).toBeInTheDocument()
  })

  it('aralık modu: POT bant olarak', async () => {
    vi.mocked(endpoints.academy).mockResolvedValue({ ...ACADEMY, players: [row(50, { name: 'Bantlı', potential: null, potentialRange: '70–74' })] })
    renderAt()
    const item = await rowButton(/Bantlı/)
    expect(item).toHaveTextContent('55 → 70–74')
  })

  it('boş durum: altyapı bulunamadı → export yönlendirmesi ve İçe aktar bağlantısı', async () => {
    vi.mocked(endpoints.academy).mockResolvedValue({ found: false, teamId: null, name: null, message: 'x', players: [] })
    renderAt()
    expect(await screen.findByText("Bu export'ta altyapı görünmüyor. Kariyer içinden export al.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'İçe aktar' })).toHaveAttribute('href', '/career/import')
  })

  it('boş durum: takım var, oyuncu yok', async () => {
    vi.mocked(endpoints.academy).mockResolvedValue({ found: false, teamId: 9, name: 'Kulüp Youth Academy', message: 'x', players: [] })
    renderAt()
    expect(await screen.findByText('Altyapıda oyuncu yok. Oyunda gençlik scoutlarının getirdiği oyuncular burada görünür.')).toBeInTheDocument()
  })

  it('hata boş durum gibi görünmez', async () => {
    vi.mocked(endpoints.academy).mockRejectedValue(new Error('x'))
    renderAt()
    expect(await screen.findByText('Altyapı yüklenemedi.')).toBeInTheDocument()
  })
})
