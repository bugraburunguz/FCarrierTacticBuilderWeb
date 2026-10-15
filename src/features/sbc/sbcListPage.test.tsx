import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { EA_REWARD, EA_REWARD_NAME, REWARD_ITEM, sbcAssetNamesFixture, sbcFixture, sbcRewardItemsFixture, sbcVotesFixture } from '../../../tests/fixtures/sbcFixture'
import { SbcListPage } from './SbcListPage'

const auth = vi.hoisted(() => ({ authenticated: true }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../api/endpoints', () => ({
  endpoints: { kbSbc: vi.fn(), kbItems: vi.fn(), sbcVotes: vi.fn(), playerAssetNames: vi.fn() },
}))

function Where() {
  return <p data-testid="where">{useLocation().search}</p>
}

function renderPage(path = '/ut/sbc') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/ut/sbc" element={<><SbcListPage /><Where /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const grid = () => screen.getByRole('list', { name: 'SBC setleri' })
const cardOf = (name: string) => within(grid()).getAllByRole('listitem').find((li) => li.querySelector('h2')?.textContent === name)!

beforeEach(() => {
  auth.authenticated = true
  vi.mocked(endpoints.kbSbc).mockReset().mockResolvedValue(sbcFixture(Date.now()))
  vi.mocked(endpoints.kbItems).mockReset().mockImplementation(async (p: { resource?: number[] }) => sbcRewardItemsFixture(p.resource ?? []))
  vi.mocked(endpoints.sbcVotes).mockReset().mockResolvedValue(sbcVotesFixture())
  vi.mocked(endpoints.playerAssetNames).mockReset().mockImplementation(async (ids: number[]) => sbcAssetNamesFixture(ids))
})

describe('SBC listesi (v3)', () => {
  it('ızgara: her set kartında ad, görev sayısı, Çöz bağlantısı; aktif setler veriden', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'TOTW Haaland' })).toBeInTheDocument()
    expect(within(grid()).getAllByRole('listitem')).toHaveLength(14)
    const card = cardOf('TOTW Haaland')
    expect(within(card).getByText('3 görev')).toBeInTheDocument()
    // tek tıklama hedefi: kartın tamamı bağlantı, adı set adı; içinde başka etkileşimli öğe yok (nested-interactive 0)
    const link = within(card).getByRole('link', { name: 'TOTW Haaland' })
    expect(link).toHaveAttribute('href', '/ut/sbc/9302')
    expect(link).toHaveTextContent('Çöz →')
    expect(link.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0)
    expect(within(card).getAllByRole('link')).toHaveLength(1)
    expect(within(card).queryByRole('button')).toBeNull()
    expect(endpoints.kbSbc).toHaveBeenCalledWith({ active: true })
  })

  it('ödül kartı önce EA verisinden çizilir: reyting/mevki yakalamadan, ad katalogdan (assetId); ut_item sorulmaz', async () => {
    renderPage()
    const card = await screen.findByRole('img', { name: new RegExp(`^${EA_REWARD_NAME}, ${EA_REWARD.rating}`) })
    expect(card).toHaveAccessibleName(new RegExp(EA_REWARD.preferredPosition))
    await waitFor(() => expect(endpoints.playerAssetNames).toHaveBeenCalledWith([EA_REWARD.assetId]))
    const asked = vi.mocked(endpoints.kbItems).mock.calls.flatMap((c) => c[0].resource ?? [])
    expect(asked).not.toContain(EA_REWARD.resourceId)
  })

  it('ödül: ut_item\'daki oyuncu kendi kartımızla, bilinmeyen oyuncu ve paket rozetle', async () => {
    renderPage()
    expect(await screen.findByRole('img', { name: new RegExp(`^${REWARD_ITEM.name}, ${REWARD_ITEM.rating}`) })).toBeInTheDocument()
    await waitFor(() => expect(endpoints.kbItems).toHaveBeenCalled())
    expect(vi.mocked(endpoints.kbItems).mock.calls[0][0].resource).toEqual(expect.arrayContaining([REWARD_ITEM.eaResourceId]))
    expect(within(cardOf('Icon Moments Zidane — Ultimate Edition Hybrid Leagues and Nations Mega Challenge Set')).getByText('Oyuncu ödülü')).toBeInTheDocument()
    expect(within(cardOf('Marquee Matchups')).getByText('Paket')).toBeInTheDocument()
    expect(within(cardOf('Daily Bronze Upgrade')).getByText('2 paket')).toBeInTheDocument()
  })

  it('tekrar ∞ / N, geri sayım (title yerel tarih), oy yüzdesi yalnız oy varsa, Yeni / Değişti rozetleri', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'TOTW Haaland' })
    expect(within(cardOf('84+ Player Pick')).getByText('Tekrar ∞')).toBeInTheDocument()
    expect(within(cardOf('Daily Bronze Upgrade')).getByText('Tekrar 5')).toBeInTheDocument()
    expect(within(cardOf('TOTW Haaland')).queryByText(/^Tekrar/)).toBeNull()
    const timer = within(cardOf('Marquee Matchups')).getByText(/^(1 sa 5\d dk|2 sa)$/)
    expect(timer.closest('[title]')?.getAttribute('title')).toMatch(/\d{4}/)
    expect(within(cardOf('Foundations: First XI')).queryByText(/sa|gün|dk/)).toBeNull()
    await waitFor(() => expect(within(cardOf('Marquee Matchups')).getByText('%82')).toBeInTheDocument())
    expect(within(cardOf('Puzzle Master')).queryByText(/^%/)).toBeNull()
    expect(within(cardOf('TOTW Haaland')).getByText('Yeni')).toBeInTheDocument()
    expect(within(cardOf('84+ Player Pick')).getByText('Değişti')).toBeInTheDocument()
    expect(within(cardOf('Foundations: First XI')).queryByText(/Yeni|Değişti/)).toBeNull()
  })

  it('oturum yokken oy ucu çağrılmaz ve yüzde gösterilmez', async () => {
    auth.authenticated = false
    renderPage()
    await screen.findByRole('heading', { name: 'TOTW Haaland' })
    expect(endpoints.sbcVotes).not.toHaveBeenCalled()
    expect(screen.queryByText('%82')).toBeNull()
  })

  it('sekmeler: Bitiyor (≤ 24 saat) ve veriden gelen kategoriler (bilinmeyen ham adla); adres çubuğuna yazılır', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'TOTW Haaland' })
    fireEvent.click(screen.getByRole('tab', { name: 'Bitiyor' }))
    await waitFor(() => expect(within(grid()).getAllByRole('listitem')).toHaveLength(4))
    expect(screen.getByTestId('where').textContent).toBe('?sekme=bitiyor')
    fireEvent.click(screen.getByRole('tab', { name: 'Yükseltmeler' }))
    await waitFor(() => expect(within(grid()).getAllByRole('listitem')).toHaveLength(4))
    expect(screen.getByTestId('where').textContent).toBe('?kategori=Upgrades')
    expect(screen.getByRole('tab', { name: 'Seasonal Exchange' })).toBeInTheDocument()
  })

  it('arama set adında; sonuç yoksa boş durum', async () => {
    renderPage('/ut/sbc?kategori=Foundations')
    await screen.findByRole('heading', { name: 'Foundations: First XI' })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Ara' }), { target: { value: 'zzz' } })
    expect(await screen.findByText('Bu kategoride aktif SBC yok.')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Ara' }), { target: { value: 'pick' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Tümü' }))
    await waitFor(() => expect(within(grid()).getAllByRole('listitem')).toHaveLength(3))
  })

  it('bilgi tabanı tamamen boş: uzantıyla senkrona yönlendirir (EXT-07 sonrası yakalama çalışıyor)', async () => {
    vi.mocked(endpoints.kbSbc).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/Uzantı açıkken Web App'te SBC sekmesini aç; sonra İçe aktar'dan senkronla\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'İçe aktar' })).toHaveAttribute('href', '/ut/import')
    expect(document.body.textContent).not.toMatch(/engelliyor|HAR|DevTools/)
  })

  it('yükleniyor iskeleti ve hata durumu (Tekrar dene)', async () => {
    vi.mocked(endpoints.kbSbc).mockRejectedValueOnce(new Error('500'))
    renderPage()
    expect(screen.getByLabelText('Yükleniyor')).toBeInTheDocument()
    expect(await screen.findByText("SBC'ler yüklenemedi.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }))
    expect(await screen.findByRole('heading', { name: 'TOTW Haaland' })).toBeInTheDocument()
  })
})
