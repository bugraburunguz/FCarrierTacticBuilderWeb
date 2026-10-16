import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { KbItem, PlayerDetail, PlayerRoleFit } from '../../api/types'
import { ROLES_HELP } from '../../lib/fitLabels'
import { UtPlayerPage } from './UtPlayerPage'

vi.mock('../../api/endpoints', () => ({
  endpoints: { playerByAsset: vi.fn(), kbItems: vi.fn(), playerRoles: vi.fn(), kbPrices: vi.fn() },
}))

const detail = (): PlayerDetail => ({
  summary: { id: 1, name: 'Kylian Mbappé', age: 27, overall: 91, positions: ['ST', 'LW'], club: 'Real Madrid', league: 'LALIGA', nationality: 'France', faceAssetId: 231747, valuationEstimated: false },
  weakFoot: 4, skillMoves: 5, preferredFoot: 'Right', attrs: { Finishing: 95, Acceleration: 97, Strength: 76 }, playstyles: { 'Rapid': 2, 'Finesse Shot': 1 },
})

const role = (over: Partial<PlayerRoleFit>): PlayerRoleFit => ({
  position: 'ST', roleId: 'advanced_forward_attack', roleName: 'Advanced Forward (Attack)', focus: 'Attack', score: 94, projectedRating: 92, badgeText: '', reasons: [], gaps: [], engineVersion: 'v3', currentFit: 94.6, levelFit: 88, fitLabel: 'GOOD',
  narrative: { headline: 'Bu role çok iyi oturuyor.', tailored: true, strengths: [{ term: 'attr', key: 'Finishing', text: 'Bitiricilik çok güçlü.', points: 5 }], weaknesses: [] }, ...over,
})

const kbItem = (over: Partial<KbItem>): KbItem => ({ id: 10, eaAssetId: 231747, eaResourceId: 231747, name: 'Mbappé', rating: 91, position: 'ST', altPositions: [], cardType: 'NORMAL', rare: false, untradeableOnly: false, status: 'ACTIVE', ...over })

function Where() {
  return <p data-testid="where">{useLocation().search}</p>
}

function renderPage(path = '/ut/players/231747') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/ut/players/:assetId" element={<><UtPlayerPage /><Where /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(endpoints.playerByAsset).mockReset().mockResolvedValue(detail())
  vi.mocked(endpoints.kbItems).mockReset().mockResolvedValue([])
  vi.mocked(endpoints.playerRoles).mockReset().mockResolvedValue([role({}), role({ roleId: 'poacher_attack', roleName: 'Poacher (Attack)', levelFit: 55, fitLabel: 'WEAK', currentFit: 70, narrative: undefined })])
  vi.mocked(endpoints.kbPrices).mockReset().mockResolvedValue([])
})

describe('UT oyuncu sayfası', () => {
  it('başlık, mevkiler ve statlar (renkli değerler) gelir; kimlik EA assetId ile çözülür', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Kylian Mbappé' })).toBeInTheDocument()
    expect(endpoints.playerByAsset).toHaveBeenCalledWith(231747)
    const stats = screen.getByRole('tabpanel')
    expect(within(stats).getByText('Bitiricilik')).toBeInTheDocument()
    expect(within(stats).getByText('Rapid+')).toBeInTheDocument()
  })

  it('bilgi tabanı boşken versiyon şeridinde yalnız base kart ve açıklama', async () => {
    renderPage()
    expect(await screen.findByRole('radio', { name: 'Base 91' })).toBeChecked()
    expect(screen.getAllByRole('radio')).toHaveLength(1)
    expect(screen.getByText('Bu oyuncu için başka kart versiyonu kayıtlı değil.')).toBeInTheDocument()
  })

  it('?v= ile versiyon seçilir ve ←/→ ile gezilir (adres çubuğu güncellenir)', async () => {
    vi.mocked(endpoints.kbItems).mockResolvedValue([kbItem({ id: 11, eaResourceId: 50563395, rating: 93, promo: 'TOTW' })])
    renderPage('/ut/players/231747?v=50563395')
    const totw = await screen.findByRole('radio', { name: 'TOTW 93' })
    expect(totw).toBeChecked()
    fireEvent.keyDown(totw.parentElement!, { key: 'ArrowLeft' })
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Base 91' })).toBeChecked())
    expect(screen.getByTestId('where').textContent).not.toContain('v=')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Base 91' }).parentElement!, { key: 'ArrowRight' })
    await waitFor(() => expect(screen.getByTestId('where').textContent).toContain('v=50563395'))
  })

  it('Roller sekmesi v3 ister: rozette seviyesine göre % (tek kez), rol puanı ve "Neden?" altında anlatım', async () => {
    renderPage('/ut/players/231747?sekme=roller')
    expect(await screen.findByText('Advanced Forward (Attack)')).toBeInTheDocument()
    expect(endpoints.playerRoles).toHaveBeenCalledWith(1, undefined, 'v3')
    // aynı sayı iki kez gösterilmez: yüzde yalnız rozette
    expect(screen.getByText('%88')).toBeInTheDocument()
    expect(screen.queryByText(/Seviyesine göre/)).toBeNull()
    expect(screen.getByText('Rol puanı 95')).toBeInTheDocument()
    expect(screen.getAllByText('Biçilmiş kaftan')).toHaveLength(1)
    expect(screen.getByText('Neden?')).toBeInTheDocument()
    expect(screen.getByText('Bitiricilik çok güçlü.')).toBeInTheDocument()
    // sıra: seviyesine göre uyum azalan
    const names = screen.getAllByRole('listitem').map((li) => li.textContent ?? '')
    expect(names.findIndex((t) => t.includes('Advanced Forward'))).toBeLessThan(names.findIndex((t) => t.includes('Poacher')))
  })

  it('Roller: sekme başında tek yardım; rozet ve rol puanı açıklaması fitLabels sözlüğünden', async () => {
    renderPage('/ut/players/231747?sekme=roller')
    await screen.findByText('Advanced Forward (Attack)')
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getAllByRole('note')).toHaveLength(1)
    expect(within(panel).getByRole('note')).toHaveTextContent(ROLES_HELP.badge)
    expect(within(panel).getByRole('note')).toHaveTextContent(ROLES_HELP.rolePoints)
  })

  it('"Biçilmiş kaftan" her mevkide yalnız en iyi role ve yalnız sunucu tailored derse', async () => {
    const tailored = (roleId: string, levelFit: number, position = 'ST') => role({ roleId, roleName: roleId, levelFit, position })
    vi.mocked(endpoints.playerRoles).mockResolvedValue([
      tailored('st_a', 96), tailored('st_b', 94), tailored('st_c', 92), tailored('st_d', 90), tailored('st_e', 88),
      role({ position: 'LW', roleId: 'lw_best', roleName: 'lw_best', levelFit: 93, narrative: { headline: '', tailored: false, strengths: [], weaknesses: [] } }),
      tailored('lw_second', 80, 'LW'),
    ])
    renderPage('/ut/players/231747?sekme=roller')
    const st = await screen.findByRole('region', { name: 'ST rolleri' })
    expect(within(st).getAllByText('Biçilmiş kaftan')).toHaveLength(1)
    expect(within(st).getAllByRole('listitem')[0]).toHaveTextContent('Biçilmiş kaftan')
    // en iyi rol tailored değilse mevkide çip yok (ikinci rol tailored olsa da)
    expect(within(screen.getByRole('region', { name: 'LW rolleri' })).queryByText('Biçilmiş kaftan')).toBeNull()
  })

  it('Statlar: etiketler kesilmez (ellipsis yok, iki satıra inebilir)', async () => {
    renderPage()
    const label = await screen.findByText('Bitiricilik')
    expect(label.className).not.toContain('truncate')
    expect(label.className).not.toContain('whitespace-nowrap')
  })

  it('mobilde (<820px) kart en çok 200px ve ortalı; versiyon şeridi opak yapışkan yüzey', async () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({ matches: query.includes('max-width: 819px'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }) as unknown as MediaQueryList) as typeof window.matchMedia
    try {
      renderPage()
      const card = await screen.findByRole('img', { name: /^Kylian Mbappé, 91/ })
      expect(parseFloat(card.style.width)).toBeLessThanOrEqual(200)
      const strip = screen.getByRole('radiogroup', { name: 'Kart versiyonları' }).closest('.glass-sticky')!
      expect(strip.className).toContain('sticky')
      // yapışkan satır kart bölümünün doğrudan çocuğu: sticky'nin hareket alanı tüm bölüm
      expect(strip.parentElement).toBe(screen.getByRole('region', { name: 'Kart' }))
    } finally {
      window.matchMedia = original
    }
  })

  it('Fiyat: kart bilgi tabanında yoksa dürüst boş durum, uydurma sayı yok', async () => {
    renderPage('/ut/players/231747?sekme=fiyat')
    expect(await screen.findByText(/Bu kart için fiyat kaydı yok/)).toBeInTheDocument()
    expect(endpoints.kbPrices).not.toHaveBeenCalled()
  })

  it('Fiyat: kaydı olan kartta son nokta ve platform anahtarı; veri yoksa ayrı boş durum', async () => {
    vi.mocked(endpoints.kbItems).mockResolvedValue([kbItem({ id: 10 })])
    vi.mocked(endpoints.kbPrices).mockResolvedValueOnce([{ bucket: '2026-10-14T10:00:00Z', p50: 1_200_000, minBin: 1_150_000, samples: 12 }])
    renderPage('/ut/players/231747?sekme=fiyat')
    expect((await screen.findAllByText('1,2M')).length).toBeGreaterThan(0)
    expect(endpoints.kbPrices).toHaveBeenCalledWith(10, 'CONSOLE', '7d')
    fireEvent.click(screen.getByRole('radio', { name: 'PC' }))
    expect(await screen.findByText('Son 7 günde bu platformda fiyat verisi yok.')).toBeInTheDocument()
  })

  it('Nasıl alınır: veri yok → dürüst boş durum', async () => {
    renderPage('/ut/players/231747?sekme=alinis')
    expect(await screen.findByText(/nasıl alınacağına dair kayıt yok/)).toBeInTheDocument()
  })

  it('bulunamayan oyuncu hata durumu; yükleniyor iskeleti', async () => {
    vi.mocked(endpoints.playerByAsset).mockRejectedValueOnce(new Error('404'))
    renderPage('/ut/players/1')
    expect(screen.getByLabelText('Yükleniyor')).toBeInTheDocument()
    expect(await screen.findByText('Bu oyuncu bulunamadı.')).toBeInTheDocument()
  })

  it('sekme değişimi adres çubuğuna yazılır, klavye ok tuşlarıyla', async () => {
    renderPage()
    const tab = await screen.findByRole('tab', { name: 'Statlar' })
    fireEvent.keyDown(tab.parentElement!, { key: 'ArrowRight' })
    await waitFor(() => expect(screen.getByTestId('where').textContent).toContain('sekme=fiyat'))
  })
})
