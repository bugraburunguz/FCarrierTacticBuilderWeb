import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { CareerRecommendation, CareerRecommendationItem } from '../../api/types'
import { RecommendationPanel } from './RecommendationPanel'
import { RecommendationRow } from './RecommendationRow'

let premium = false

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ authenticated: true, me: { subscriptionType: premium ? 'PREMIUM' : 'FREE', creditBalance: 17, dailyCreditLimit: 20 } }),
}))

vi.mock('../../api/endpoints', () => ({
  endpoints: {
    careerRecommendations: vi.fn(),
    creditCosts: vi.fn(() => Promise.resolve({ recommend: 3, squadFit: 5, advisor: 8 })),
  },
}))

const player = (id: number, name: string) => ({ id, name, age: 24, overall: 78, positions: ['ST'], club: 'Arsenal', league: 'Premier League', valueEur: 25_000_000, valuationEstimated: false })

const item = (over: Partial<CareerRecommendationItem> = {}): CareerRecommendationItem => ({
  player: player(1, 'Ada Oyuncu'),
  roleId: 'advanced_forward_attack',
  roleName: 'Advanced Forward',
  focus: 'Attack',
  currentFit: 91.2,
  levelFit: 74.5,
  fitLabel: 'GOOD',
  futureFit: 93.4,
  projectedRating: 80,
  deltaVsCurrent: 4.5,
  clubStrength: 82.1,
  clubStrengthGap: -1.9,
  ovrGap: 2.1,
  bucket: 'ALINABILIR',
  bucketLabel: 'Alınabilir',
  bucketPoints: 1,
  bucketFactors: [
    { name: 'değer/bütçe', value: '0.40', points: 0, note: 'değer bütçenin %40 kadarı' },
    { name: 'OVR farkı', value: '+2.1', points: 0, note: 'oyuncu, ilk 11 ortalamasından +2.1 OVR yüksek: bu seviyeye iner' },
  ],
  pros: [],
  cons: [],
  tags: [],
  rankScore: 90,
  ...over,
})

const response = (items: CareerRecommendationItem[], over: Partial<CareerRecommendation> = {}): { result: CareerRecommendation; charged: number; balance: number } => ({
  result: { position: 'ST', roleId: 'advanced_forward_attack', roleName: 'Advanced Forward', focus: 'Attack', roleSource: 'REQUEST', profile: 'BALANCED', poolSize: 2000, scored: 800, items, ...over },
  charged: 3,
  balance: 14,
})

const renderRow = (node: React.ReactElement) => render(<MemoryRouter><ul>{node}</ul></MemoryRouter>)

function renderPanel(props: Partial<React.ComponentProps<typeof RecommendationPanel>> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <RecommendationPanel careerId={4} position="ST" slotId="ST1" roleId="advanced_forward_attack" {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  premium = false
  vi.mocked(endpoints.careerRecommendations).mockReset()
})

describe('RecommendationRow (E3-10)', () => {
  it('kova rozeti + gerekçe, yaş/kulüp/OVR farkı/değer, rozetli currentFit/levelFit, Δ mevcut ve futureFit görünür', () => {
    renderRow(<RecommendationRow item={item()} />)
    expect(screen.getByText('Alınabilir')).toBeInTheDocument()
    expect(screen.getByText(/24 yaş/)).toBeInTheDocument()
    expect(screen.getByText(/Arsenal \(Premier League\)/)).toBeInTheDocument()
    expect(screen.getByText(/OVR farkı \+2\.1/)).toBeInTheDocument()
    expect(screen.getByText(/€25,00 Mn/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Rol için uygun/ })).toBeInTheDocument()
    expect(screen.getByText(/91\.2/)).toBeInTheDocument()
    expect(screen.getByText(/Δ mevcut \+4\.5/)).toBeInTheDocument()
    expect(screen.getByText(/futureFit 93\.4/)).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('değer bütçenin %40 kadarı')
  })

  it('SCOUT_RANGE: futureFit ve projectedRating gelmediyse hiç gösterilmez; AT_LEVEL renksiz', () => {
    renderRow(<RecommendationRow item={item({ futureFit: undefined, projectedRating: undefined, fitLabel: 'AT_LEVEL' })} />)
    expect(screen.queryByText(/futureFit/)).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /seviyesinde/ })).toBeInTheDocument()
  })

  it('mevki dışı etiketi ve alternatif rol satırda yazılır; Δ yoksa gösterilmez', () => {
    renderRow(<RecommendationRow item={item({ positionLabel: 'Mevki dışı (CDM→CB)', deltaVsCurrent: undefined })} showRole />)
    expect(screen.getByText('Mevki dışı (CDM→CB)')).toBeInTheDocument()
    expect(screen.getByText(/Advanced Forward/)).toBeInTheDocument()
    expect(screen.queryByText(/Δ mevcut/)).not.toBeInTheDocument()
  })
})

describe('RecommendationPanel (E3-10)', () => {
  it('ücretli: açılışta istek atmaz; düğme kaç kredi düşeceğini yazar; onay olmadan çağrı yok', async () => {
    renderPanel()
    const start = await screen.findByRole('button', { name: /Önerileri getir · 3 kredi/ })
    expect(endpoints.careerRecommendations).not.toHaveBeenCalled()
    fireEvent.click(start)
    expect(screen.getByText(/3 kredi düşecek/)).toBeInTheDocument()
    expect(screen.getByText(/bakiye 17/i)).toBeInTheDocument()
    expect(endpoints.careerRecommendations).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }))
    expect(endpoints.careerRecommendations).not.toHaveBeenCalled()
  })

  it('onaylayınca slotun rolüyle çağrılır (forceRole), varsayılan filtreler dengeli ve yalnız ana liste istenir', async () => {
    vi.mocked(endpoints.careerRecommendations).mockResolvedValue(response([item(), item({ player: player(2, 'Bey Oyuncu') })]))
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /Önerileri getir · 3 kredi/ }))
    fireEvent.click(screen.getByRole('button', { name: /Onayla/ }))
    await waitFor(() => expect(endpoints.careerRecommendations).toHaveBeenCalledTimes(1))
    expect(vi.mocked(endpoints.careerRecommendations).mock.calls[0]).toEqual([
      4,
      expect.objectContaining({ position: 'ST', slotId: 'ST1', roleId: 'advanced_forward_attack', forceRole: true, profile: 'BALANCED', alternativeRoles: false, includeLongShots: false }),
    ])
    expect(await screen.findByText('Ada Oyuncu')).toBeInTheDocument()
    expect(screen.getByText('Bey Oyuncu')).toBeInTheDocument()
    expect(screen.getByText(/3 kredi harcandı/)).toBeInTheDocument()
  })

  it('PREMIUM: onay istemez, kredi yerine "PREMIUM\'da ücretsiz" yazar', async () => {
    premium = true
    vi.mocked(endpoints.careerRecommendations).mockResolvedValue({ ...response([item()]), charged: 0 })
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /Önerileri getir · PREMIUM/ }))
    await waitFor(() => expect(endpoints.careerRecommendations).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('button', { name: /Onayla/ })).not.toBeInTheDocument()
  })

  it('filtreler isteğe yansır: profil, maks yaş, bütçe bilinmiyor, alternatif roller, hayal transferler', async () => {
    premium = true
    vi.mocked(endpoints.careerRecommendations).mockResolvedValue(response([item()]))
    renderPanel()
    fireEvent.click(await screen.findByRole('radio', { name: 'Hemen şimdi' }))
    fireEvent.change(screen.getByLabelText('Maks. yaş'), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText('Bütçe'), { target: { value: 'unknown' } })
    fireEvent.click(screen.getByLabelText('Alternatif roller'))
    fireEvent.click(screen.getByLabelText('Hayal transferlerini göster'))
    fireEvent.click(screen.getByRole('button', { name: /Önerileri getir/ }))
    await waitFor(() => expect(endpoints.careerRecommendations).toHaveBeenCalled())
    expect(vi.mocked(endpoints.careerRecommendations).mock.calls[0][1]).toEqual(
      expect.objectContaining({ profile: 'NOW', ageMax: 30, budgetUnknown: true, alternativeRoles: true, includeLongShots: true, forceRole: true }),
    )
  })

  it('hayal transferler ana listeden ayrı bölümde, en çok 3', async () => {
    premium = true
    const long = [1, 2, 3, 4].map((i) => item({ player: player(10 + i, `Hayal ${i}`), bucket: 'HAYAL', bucketLabel: 'Hayal' }))
    vi.mocked(endpoints.careerRecommendations).mockResolvedValue(response([item()], { longShots: long }))
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /Önerileri getir/ }))
    const section = await screen.findByRole('region', { name: 'Hayal transferler' })
    expect(within(section).getAllByRole('link')).toHaveLength(3)
    expect(screen.getByText('Ada Oyuncu').closest('[role="region"]')).not.toBe(section)
  })

  it('kredi yetersizse yönlendirir; eşleşmeyen filtre değişince "yenile" ipucu çıkar', async () => {
    premium = true
    const { ApiError } = await import('../../api/client')
    vi.mocked(endpoints.careerRecommendations).mockRejectedValueOnce(new ApiError('Yetersiz kredi', 'fc.exception.0004', 402))
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /Önerileri getir/ }))
    expect(await screen.findByText(/Günlük krediler yarın yenilenir/)).toBeInTheDocument()
  })

  it('kariyer yokken istek atılmaz', async () => {
    renderPanel({ careerId: undefined })
    expect(await screen.findByText(/kariyer seç/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Önerileri getir/ })).not.toBeInTheDocument()
  })
})
