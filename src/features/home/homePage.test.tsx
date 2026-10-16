import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { lineupStore } from '../../state/lineupStore'
import { modeStore } from '../../state/modeStore'
import { utCardStore } from '../../state/utCardStore'
import { HomePage } from './HomePage'

let authenticated = true
let capture = true
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated, me: authenticated ? { subscriptionType: 'FREE' } : undefined }) }))
vi.mock('../../lib/features', async (orig) => ({ ...(await orig<typeof import('../../lib/features')>()), extensionCaptureEnabled: () => capture }))
vi.mock('../../api/endpoints', () => {
  const none = () => Promise.resolve([])
  return {
    endpoints: {
      careers: vi.fn(), squad: vi.fn(), snapshots: vi.fn(), formations: vi.fn(), fitRole: vi.fn(), lineup: vi.fn(() => Promise.resolve({ slots: [] })), playerTags: none, roles: none, eaRoles: none,
      resolveTactic: vi.fn(() => Promise.resolve({ formation: '4-3-3', slots: [] })), playerFacets: vi.fn(() => Promise.resolve({ contractData: false, loanData: false })),
      kbSbc: vi.fn(), kbItems: none, playerAssetNames: none, sbcVotes: vi.fn(() => Promise.resolve({ sets: [] })),
    },
  }
})

const slot = (slotId: string) => ({ slotId, position: 'CM', defaultRole: 'box_to_box_balanced', x: 0.5, y: 0.5 })
const member = (id: number, extra: object = {}) => ({ player: { id, name: `Oyuncu ${id}`, positions: ['CM'], overall: 60 + id, age: 25, valuationEstimated: false, ...extra }, onLoan: false })
const set = (id: number, firstSeenAt: string) => ({ id, name: `Set ${id}`, category: 'Upgrades', reward: {}, status: 'CONFIRMED', challengeCount: 1, firstSeenAt, endsAt: '2099-01-01T00:00:00Z' })

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><HomePage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  authenticated = true
  capture = true
  modeStore.set('career')
  careerStore.set(1)
  vi.mocked(endpoints.careers).mockResolvedValue([{ id: 1, name: 'Crewe 2026', clubName: 'Crewe Alexandra', gameVersionId: 27, clubId: 9, squadSize: 5, gameDate: '2027-01-15' }] as never)
  vi.mocked(endpoints.formations).mockResolvedValue([{ id: '4-3-3', name: '4-3-3', slots: [slot('CM1'), slot('CM2')] }] as never)
  vi.mocked(endpoints.squad).mockResolvedValue([member(1), member(2), member(3), member(4, { age: 19, overall: 58, potential: 76 })] as never)
  lineupStore.set(1, { CM1: 1, CM2: 2 })
  vi.mocked(endpoints.fitRole).mockImplementation(((b: { playerId: number }) => Promise.resolve({ roleFit: { playerId: b.playerId, roleId: 'r', roleName: 'Rol', projectedRating: 70, outOfPosition: false, reasons: [], weaponChecks: [], levelFit: b.playerId === 1 ? 30 : 70, score: 70, fitLabel: b.playerId === 1 ? 'WEAK' : 'GOOD' } })) as never)
  vi.mocked(endpoints.snapshots).mockResolvedValue([{ id: 5, takenAt: '2026-10-10T10:00:00Z', source: 'IMPORT', playerCount: 30 }] as never)
  vi.mocked(endpoints.kbSbc).mockResolvedValue([set(1, '2026-10-01'), set(2, '2026-10-05'), set(3, '2026-10-03'), set(4, '2026-10-09'), set(5, '2026-10-08'), set(6, '2026-10-02')] as never)
  utCardStore.set([])
})

describe('Ana sayfa (v3, mod başına)', () => {
  it('marka: FC Assist + mod alt başlığı', async () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'FC Assist' })).toBeInTheDocument()
    expect(screen.getByText('Kariyer', { selector: 'p' })).toBeInTheDocument()
  })

  it('kariyer, girişli: "Kariyerine devam et" (son içe aktarma, takım uyumu, 3 iş\'in ilki) + hızlı eylemler', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Kariyerine devam et' })
    expect(within(card).getByText('Crewe 2026')).toBeInTheDocument()
    expect(await within(card).findByText(/Son içe aktarma 10\.10\.2026/)).toBeInTheDocument()
    expect(await within(card).findByText('%50')).toBeInTheDocument()
    expect(await within(card).findByText(/CM: zayıf halka/)).toBeInTheDocument()
    const actions = screen.getByRole('navigation', { name: 'Hızlı eylemler' })
    expect(within(actions).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Masa', '/career/desk'], ['Transfer', '/career/transfer'], ['İçe aktar', '/career/import'], ['Yeni kariyer', '/career/new'],
    ])
  })

  it('kariyer, girişli ama kariyer yok: yeni kariyer çağrısı', async () => {
    vi.mocked(endpoints.careers).mockResolvedValue([] as never)
    careerStore.set(undefined)
    renderPage()
    expect(await screen.findByText(/Henüz kariyerin yok/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Kariyerine devam et' })).toBeNull()
  })

  it('kariyer, girişsiz: kısa tanıtım + Kayıt ol / Giriş yap; kariyer isteği yok', () => {
    authenticated = false
    renderPage()
    expect(screen.getByRole('link', { name: 'Kayıt ol' })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: 'Giriş yap' })).toHaveAttribute('href', '/login')
    expect(endpoints.careers).not.toHaveBeenCalled()
  })

  it('UT: bugünün SBC\'leri (en yeni 4 aktif set), kadrom özeti (yakalanmış kulüp varsa); izlenen oyuncu verisi yok → blok yok', async () => {
    modeStore.set('ut')
    utCardStore.set([{ key: 'a', source: 'club', name: 'Kart A', rating: 88 }, { key: 'b', source: 'club', name: 'Kart B', rating: 75 }] as never)
    renderPage()
    expect(screen.getByText('Ultimate Team', { selector: 'p' })).toBeInTheDocument()
    const sbc = await screen.findByRole('region', { name: "Bugünün SBC'leri" })
    await waitFor(() => expect(within(sbc).getAllByRole('heading').map((h) => h.textContent).filter((t) => t?.startsWith('Set '))).toEqual(['Set 4', 'Set 5', 'Set 2', 'Set 3']))
    const club = screen.getByRole('region', { name: 'Kadrom' })
    expect(club).toHaveTextContent('2 kart')
    expect(club).toHaveTextContent('en yüksek 88')
    expect(screen.queryByRole('region', { name: /İzlenen/ })).toBeNull()
  })

  it('UT, yakalama bayrağı kapalı: SBC ve kulüp blokları yok', async () => {
    modeStore.set('ut')
    capture = false
    utCardStore.set([{ key: 'a', source: 'club', name: 'Kart A', rating: 88 }] as never)
    renderPage()
    expect(screen.getByText('Ultimate Team', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: "Bugünün SBC'leri" })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Kadrom' })).toBeNull()
    expect(endpoints.kbSbc).not.toHaveBeenCalled()
  })
})
