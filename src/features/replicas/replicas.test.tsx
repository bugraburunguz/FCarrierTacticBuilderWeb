import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { ReplicaApplyResult, ReplicaApplySlot, ReplicaSummary, TacticAnalysis } from '../../api/types'
import { ApplyTab } from './ApplyTab'
import { AttentionPoints } from './AttentionPoints'
import { ReplicasPage } from './ReplicasPage'
import type { useReplicaApply } from './useReplicaApply'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))

vi.mock('../../api/endpoints', () => ({
  endpoints: {
    replicas: vi.fn(),
    formations: vi.fn(() => Promise.resolve([{ id: '4-3-3 (2)', slots: [{ slotId: 'GK', position: 'GK', group: 'GK', defaultRole: 'x', x: 50, y: 95 }] }])),
    userTactics: vi.fn(() => Promise.resolve([{ slot: 2, careerId: null, name: 'Eski taktik', formation: '4-4-2', buildUp: null, defensiveApproach: null, lineHeight: null, slots: [], eaCode: null, sourceReplicaId: null }])),
    saveUserTactic: vi.fn(() => Promise.resolve({ slot: 2, name: 'Pep Guardiola — FC Barcelona 2010-11' })),
  },
}))

const replica = (over: Partial<ReplicaSummary>): ReplicaSummary => ({
  id: 'r', category: 'UCL_WINNER', club: 'FC Barcelona', coach: 'Pep Guardiola', season: '2010-11', formationId: '4-3-3 (2)', eaFormation: '4-3-3 (2)', buildUp: 'SHORT_PASSING', defensiveApproach: 'AGGRESSIVE', lineHeight: 92,
  fidelity: 4, tacticCode: 'JBiHyZ597xmL', slots: [], eaOrderedSlots: [], attentionCount: 0, ...over,
})

const LIST = [
  replica({ id: 'a', attentionCount: 3 }),
  replica({ id: 'b', club: 'AC Milan', coach: 'Arrigo Sacchi', season: '1988-89', category: 'LEGENDARY_COACH', eaFormation: '4-4-2', formationId: '4-4-2', buildUp: 'BALANCED' }),
]

function renderPage(path = '/replicas') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/replicas" element={<ReplicasPage />} />
          <Route path="/replicas/:id" element={<p>detay</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(endpoints.replicas).mockResolvedValue(LIST)
})

describe('replika listesi', () => {
  it('kartları takım, sezon, hoca, rozetler ve dikkat noktası sayısıyla gösterir', async () => {
    renderPage()
    expect(await screen.findByRole('link', { name: /FC Barcelona 2010-11/ })).toHaveAttribute('href', '/replicas/a')
    expect(screen.getByText('3 dikkat noktası')).toBeInTheDocument()
    const card = screen.getByRole('link', { name: /FC Barcelona 2010-11/ }).closest('li')!
    expect(within(card).getByText('Kısa pas')).toBeInTheDocument()
    expect(within(card).getByText('Agresif hat · 92')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /Formasyon/ }).length).toBeGreaterThan(0)
    expect(screen.queryByText(/0 dikkat noktası/)).toBeNull()
  })

  it('kategori ve arama süzer; sonuç yoksa süzgeçleri temizletir', async () => {
    renderPage()
    await screen.findByText(/AC Milan/)
    fireEvent.click(screen.getByRole('button', { name: 'Efsane hoca' }))
    expect(screen.queryByText(/FC Barcelona/)).toBeNull()
    expect(screen.getByText(/AC Milan/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Ara'), { target: { value: 'zzz' } })
    expect(await screen.findByText('Bu süzgeçlere uyan replika yok.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Süzgeçleri temizle' }))
    expect(await screen.findByText(/FC Barcelona/)).toBeInTheDocument()
  })

  it('süzgeçler adres çubuğundan gelir (filtreli liste paylaşılabilir)', async () => {
    renderPage('/replicas?kategori=LEGENDARY_COACH')
    expect(await screen.findByText(/AC Milan/)).toBeInTheDocument()
    expect(screen.queryByText(/FC Barcelona/)).toBeNull()
  })

  it('yüklenirken iskelet, hatada yeniden dene gösterir', async () => {
    vi.mocked(endpoints.replicas).mockRejectedValueOnce(new Error('x'))
    renderPage()
    expect(screen.getByLabelText('Yükleniyor')).toBeInTheDocument()
    expect(await screen.findByText('Replikalar yüklenemedi.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument()
  })

  it('taktik kodunu panoya kopyalar', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: /Taktik kodunu kopyala/ }))[0])
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('JBiHyZ597xmL'))
    expect(await screen.findByText('Kopyalandı')).toBeInTheDocument()
  })
})

const analysis: TacticAnalysis = {
  metrics: { band: 'HIGH', depth: 70 },
  notEvaluated: [{ code: 'x', reason: 'oyuncu' }],
  findings: [
    {
      code: 'corridor_no_width', title: 'Koridorda genişlik yok', severity: 'WARN', instance: { side: 'LEFT', sideTr: 'sol' },
      evidence: [{ metric: 'SIDE_WINGER_CUTIN_MAX', params: { side: 'LEFT' }, value: 0.9, op: 'GTE', threshold: 0.6 }],
      recommendation: { code: 'X', text: 'Beki Wingback yap.' }, text: 'sol koridorda genişlik yok.',
    },
    { code: 'striker_line_no_runner', title: 'Forvet hattında koşucu yok', severity: 'INFO', instance: {}, evidence: [{ metric: 'STRIKER_RUNBEHIND_MAX', params: {}, value: 0.15, op: 'LT', threshold: 0.4 }], text: 'Arkaya koşan yok.' },
  ],
}

describe('dikkat noktaları', () => {
  it('nötr başlıkla gösterilir; hata/uyarı/risk dili ve iç kod yok; kanıt "Neden?" altında', () => {
    render(<AttentionPoints analysis={analysis} />)
    expect(screen.getByRole('heading', { name: /Bu taktiğin dikkat noktaları/ })).toBeInTheDocument()
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/hata|uyarı|risk/i)
    expect(text).not.toMatch(/[A-Z]{3,}_[A-Z]/)
    const item = screen.getByText('Koridorda genişlik yok').closest('li')!
    expect(within(item).getByText('Neden?')).toBeInTheDocument()
    expect(within(item).getByText(/Kanadın içe kesmesi: 0.9/)).toBeInTheDocument()
    expect(screen.getByText('Oyuncu atayınca 1 kontrol daha yapılır.')).toBeInTheDocument()
  })

  it('bulgu yoksa boş durum', () => {
    render(<AttentionPoints analysis={{ ...analysis, findings: [], notEvaluated: [] }} />)
    expect(screen.getByText('Dikkat çeken bir nokta yok.')).toBeInTheDocument()
  })
})

const player = (id: number, name: string) => ({ id, name, overall: 80, positions: ['ST'], valuationEstimated: false })
const slot = (over: Partial<ReplicaApplySlot>): ReplicaApplySlot => ({
  slotId: 'ST', position: 'ST', roleId: 'false_9_build_up', roleName: 'False 9', focus: 'Build-Up', player: player(1, 'Ada Santrfor'), currentFit: 82, levelFit: 74, state: 'GOOD', badgeText: null, suggest: false, ...over,
})

function applyOf(source: ReplicaApplyResult['source'], slots: ReplicaApplySlot[], mode: 'career' | 'ut' = 'career'): ReturnType<typeof useReplicaApply> {
  const data: ReplicaApplyResult = { replicaId: 'a', source, squadFit: 71.4, slots, analysis }
  return {
    mode, authenticated: true, career: undefined, addCard: vi.fn(), loading: false,
    plan: { source, body: source === 'CAREER' ? { careerId: 5 } : {}, skipped: 0 },
    result: { data, isError: false, error: null } as unknown as ReturnType<typeof useReplicaApply>['result'],
  }
}

function renderApply(apply: ReturnType<typeof useReplicaApply>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ApplyTab replicaId="a" apply={apply} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('kadromla uygula', () => {
  it('kariyerde seviyeye göre %, boş ve zayıf slotlar "Öner" bağlantısı alır', () => {
    renderApply(applyOf('CAREER', [slot({}), slot({ slotId: 'LW', position: 'LW', state: 'WEAK', suggest: true, player: player(2, 'Bora Kanat'), levelFit: 41 }), slot({ slotId: 'RW', position: 'RW', state: 'EMPTY', suggest: true, player: null, currentFit: null, levelFit: null })]))
    expect(screen.getByText('Kariyer kadron')).toBeInTheDocument()
    expect(screen.getByText('Seviyesine göre %74')).toBeInTheDocument()
    const suggest = screen.getAllByRole('link', { name: /için oyuncu öner/ })
    expect(suggest.map((a) => a.getAttribute('href'))).toEqual(['/career/transfer?pos=LW', '/career/transfer?pos=RW'])
    expect(screen.getByText('Boş')).toBeInTheDocument()
  })

  it('UT kartlarında rol puanı gösterilir ve "Öner" kart seçimini açar', () => {
    renderApply(applyOf('UT', [slot({ levelFit: null, state: 'WEAK', suggest: true })], 'ut'))
    expect(screen.getByText('Kulüp kartların')).toBeInTheDocument()
    expect(screen.getByText('Rol puanı 82')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ST için oyuncu öner' })).toBeInTheDocument()
  })

  it('oyunculu bulgular aynı nötr bölümde, örnek kadroda kaynak açıkça yazılır', () => {
    renderApply(applyOf('SAMPLE', [slot({})], 'ut'))
    expect(screen.getByText('Örnek kadro')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Bu taktiğin dikkat noktaları/ })).toBeInTheDocument()
    expect(screen.queryByText(/kontrol daha yapılır/)).toBeNull()
  })

  it('dolu slotun üzerine yazmak ikinci onay ister, kayıt kaynağı replikayı taşır', async () => {
    renderApply(applyOf('CAREER', [slot({})]))
    fireEvent.click(await screen.findByRole('button', { name: /^2 · dolu/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }))
    expect(await screen.findByText(/Slot 2 dolu \(Eski taktik\)/)).toBeInTheDocument()
    expect(endpoints.saveUserTactic).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Evet, üzerine yaz' }))
    await waitFor(() => expect(endpoints.saveUserTactic).toHaveBeenCalledWith(2, { careerId: 5, replicaId: 'a' }))
    expect(await screen.findByText(/Slot 2'e kaydedildi/)).toBeInTheDocument()
  })

  it('slot seçilmeden kaydet kapalı ve nedeni yazar', async () => {
    renderApply(applyOf('CAREER', [slot({})]))
    expect(await screen.findByText('Önce bir slot seç.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeDisabled()
  })
})
