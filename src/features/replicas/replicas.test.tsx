import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { ReplicaApplyResult, ReplicaApplySlot, ReplicaDetail, ReplicaSummary, TacticAnalysis } from '../../api/types'
import { careerStore } from '../../state/careerStore'
import { labStore } from '../../state/labStore'
import { modeStore } from '../../state/modeStore'
import { ApplyTab } from './ApplyTab'
import { AttentionPoints } from './AttentionPoints'
import { ReplicasPage } from './ReplicasPage'
import { StoryTab } from './ReplicaTabs'
import type { useReplicaApply } from './useReplicaApply'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))

vi.mock('../../api/endpoints', () => ({
  endpoints: {
    replicas: vi.fn(),
    formations: vi.fn(() => Promise.resolve([{ id: '4-3-3 (2)', slots: [{ slotId: 'GK', position: 'GK', group: 'GK', defaultRole: 'x', x: 50, y: 95 }] }])),
    userTactics: vi.fn(() => Promise.resolve([{ slot: 2, careerId: null, name: 'Eski taktik', formation: '4-4-2', buildUp: null, defensiveApproach: null, lineHeight: null, slots: [], eaCode: null, sourceReplicaId: null }])),
    saveUserTactic: vi.fn(() => Promise.resolve({ slot: 2, name: 'Pep Guardiola — FC Barcelona 2010-11' })),
    replicaApply: vi.fn(() => Promise.resolve({ replicaId: 'a', source: 'CAREER', squadFit: 70, analysis: { findings: [] }, slots: [{ slotId: 'GK', position: 'GK', roleId: 'x', roleName: 'Kaleci', focus: 'Dengeli', player: { id: 5, name: 'Kaleci' } }] })),
  },
}))

const replica = (over: Partial<ReplicaSummary>): ReplicaSummary => ({
  id: 'r', category: 'UCL_WINNER', club: 'FC Barcelona', coach: 'Pep Guardiola', season: '2010-11', league: 'ES_LALIGA', formationId: '4-3-3 (2)', eaFormation: '4-3-3 (2)', buildUp: 'SHORT_PASSING', defensiveApproach: 'AGGRESSIVE', lineHeight: 92,
  fidelity: 4, tacticCode: 'JBiHyZ597xmL', slots: [], eaOrderedSlots: [], attentionCount: 0, verified: false, ...over,
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
          <Route path="/career/tactics-lab" element={<p>lab kurucu</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(endpoints.replicas).mockResolvedValue(LIST)
})

/** KARIYER-UX 6: tek başına /replicas listesi de kariyer modunda "Klonla → taslak" sunar (Lab › Replikalar ile aynı akış). */
describe('replika listesi › klon (kariyer modu)', () => {
  afterEach(() => {
    modeStore.set('ut')
    careerStore.set(undefined)
    localStorage.clear()
    labStore.reload()
  })

  it('kariyer modunda kartta "Klonla → taslak": replika + kadromla diziliş yeni taslak olur, Lab kurucusu açılır', async () => {
    modeStore.set('career')
    careerStore.set(7)
    renderPage()
    // Kart sırası lig/kategori gruplamasına bağlı (REP-d); Barcelona kartını adıyla seç.
    await screen.findAllByRole('button', { name: /Klonla → taslak/ })
    const barca = screen.getAllByRole('listitem').find((li) => li.textContent?.includes('FC Barcelona') && within(li).queryByRole('button', { name: /Klonla → taslak/ }))!
    fireEvent.click(within(barca).getByRole('button', { name: /Klonla → taslak/ }))
    expect(await screen.findByText('lab kurucu')).toBeInTheDocument()
    expect(endpoints.replicaApply).toHaveBeenCalledWith('a', { careerId: 7 })
    expect(labStore.get(7).drafts[0]).toMatchObject({ name: 'FC Barcelona 2010-11', origin: { kind: 'replica', ref: 'a' }, lineup: { GK: 5 } })
  })

  it('UT modunda klon düğmesi yok', async () => {
    modeStore.set('ut')
    renderPage()
    await screen.findAllByText('FC Barcelona')
    expect(screen.queryByRole('button', { name: /Klonla → taslak/ })).toBeNull()
  })
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

describe('mobil replika listesi', () => {
  const original = window.matchMedia
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({ matches: query.includes('max-width: 819px'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }) as unknown as MediaQueryList) as typeof window.matchMedia
  })
  afterEach(() => {
    window.matchMedia = original
  })

  it('formasyon, build-up ve dönem tek "Filtreler" düğmesiyle alttan sheet olarak açılır; liste çubuğun altında görünür', async () => {
    renderPage()
    await screen.findByText(/AC Milan/)
    expect(screen.queryByLabelText('Formasyon')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Filtreler/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Filtreler' })
    fireEvent.change(within(sheet).getByLabelText('Formasyon'), { target: { value: '4-4-2' } })
    expect(within(sheet).getByRole('button', { name: '1 replikayı göster' })).toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole('button', { name: '1 replikayı göster' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Filtreler (1)' })).toBeInTheDocument()
    expect(screen.queryByText(/FC Barcelona/)).toBeNull()
  })

  it('kategori çipleri yatay kaydırılan tek satırdır', async () => {
    renderPage()
    await screen.findByText(/AC Milan/)
    const row = screen.getByRole('group', { name: 'Kategori' })
    expect(row.className).toContain('max-[819px]:flex-nowrap')
    expect(row.className).toContain('max-[819px]:overflow-x-auto')
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
  slotId: 'ST', position: 'ST', roleId: 'false_9_build_up', roleName: 'False 9', focus: 'Build-Up', player: player(1, 'Ada Santrfor'), currentFit: 82, levelFit: 74, state: 'GOOD', badgeText: null, suggest: false, outOfPosition: false, playerPosition: 'ST', ...over,
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

  it('mevki dışı atama listede "ST→LW" etiketiyle işaretlenir; doğal atamada etiket yok', () => {
    renderApply(applyOf('CAREER', [slot({ slotId: 'LW', position: 'LW', outOfPosition: true, playerPosition: 'ST' }), slot({ slotId: 'ST', position: 'ST' })]))
    expect(screen.getByText('ST→LW')).toBeInTheDocument()
    expect(screen.getByLabelText('Mevki dışı: ST oyuncusu LW mevkisinde')).toBeInTheDocument()
    expect(screen.queryByText('ST→ST')).toBeNull()
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

  it('KARIYER-UX FAZ 4b: kariyerde "Klonla → taslak" replika taktiği + bu dizilişle Lab taslağı açar ve Lab kurucusuna geçer', async () => {
    localStorage.clear()
    labStore.reload()
    const replica = { id: 'a', club: 'Ajax', season: '1994/95', formationId: '4-3-3', buildUp: 'SHORT_PASSING', lineHeight: 75, slots: [{ slotId: 'ST', position: 'ST', role: 'False 9', focus: 'Build-Up', roleId: 'false_9_build_up' }] } as unknown as ReplicaSummary
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const apply = applyOf('CAREER', [slot({})])
    client.setQueryData(['replica-apply', 'a', JSON.stringify({ careerId: 5 })], apply.result.data)
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/replicas/a?sekme=uygula']}>
          <Routes>
            <Route path="/replicas/a" element={<ApplyTab replicaId="a" apply={apply} replica={replica} />} />
            <Route path="/career/tactics-lab" element={<p>lab açıldı</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Klonla → taslak/ }))
    expect(await screen.findByText('lab açıldı')).toBeInTheDocument()
    expect(labStore.get(5).drafts[0]).toMatchObject({ name: 'Ajax 1994/95', origin: { kind: 'replica', ref: 'a' }, lineup: { ST: 1 }, tactic: { formation: '4-3-3' } })
  })

  it('UT modunda "Klonla → taslak" yok (UT davranışı değişmez)', () => {
    renderApply(applyOf('UT', [slot({})], 'ut'))
    expect(screen.queryByRole('button', { name: /Klonla → taslak/ })).toBeNull()
  })

  it('slot seçilmeden kaydet kapalı ve nedeni yazar', async () => {
    renderApply(applyOf('CAREER', [slot({})]))
    expect(await screen.findByText('Önce bir slot seç.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeDisabled()
  })
})

describe('hikâye sekmesi', () => {
  const base = { id: 'a', category: 'UCL_WINNER', club: 'x', coach: 'y', season: '2010-11', fc27: { formation: '4-3-3', buildUp: 'SHORT_PASSING', defensiveApproach: 'HIGH', lineHeight: 70, slots: [] }, tacticCode: 'A', analysis }
  it('iç notlar kullanıcıya görünmez; yalnız kısa dipnot', () => {
    render(<StoryTab detail={{ ...base, whyIconic: 'Neden.', verified: false } as unknown as ReplicaDetail} />)
    const text = document.body.textContent ?? ''
    expect(text).toContain('Kaynak: doğrulanmadı')
    expect(text).not.toMatch(/VERIFY|Doğrulanması gerekenler|model bilgisi/)
    expect(screen.queryByText('Yönetici notları')).toBeNull()
  })

  it('yönetici görünümünde ayrıntı açılır bölümde durur', () => {
    render(<StoryTab detail={{ ...base, verified: false, sources: ['model bilgisi — VERIFY'], verify: ['Final XI doğrulanmalı'] } as unknown as ReplicaDetail} />)
    expect(screen.getByText('Yönetici notları')).toBeInTheDocument()
    expect(screen.getByText('Final XI doğrulanmalı')).toBeInTheDocument()
  })
})
