import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserTactic } from '../../api/types'
import { careerStore } from '../../state/careerStore'
import { LAB_DRAFT_LIMIT, labStore } from '../../state/labStore'
import { lineupFromFitRole } from '../../test/lineupFromFitRole'

const SLOTS = ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'RCM', 'RM', 'LST', 'RST']
const POSITIONS = ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST']
const f442 = { id: '4-4-2', label: '4-4-2', slots: SLOTS.map((slotId, i) => ({ slotId, position: POSITIONS[i], x: 10 + i * 7, y: 10 + i * 7, defaultRole: 'r', group: POSITIONS[i] })) }
const SQUAD = [...POSITIONS, 'CM'].map((position, i) => ({ player: { id: i + 1, name: `Oyuncu ${i + 1}`, overall: 70, positions: [position], age: 24, valuationEstimated: false }, onLoan: false }))
const REPLICA = {
  id: 'barca-2011', category: 'CLUB', club: 'Barcelona', coach: 'Guardiola', season: '2010/11', formationId: '4-4-2', eaFormation: '4-4-2', buildUp: 'SHORT_PASSING',
  defensiveApproach: 'HIGH', lineHeight: 72, fidelity: null, tacticCode: 'BARCA', attentionCount: 0, eaOrderedSlots: [],
  slots: SLOTS.map((s, i) => ({ slotId: s, position: POSITIONS[i], role: 'Rol', focus: 'Dengeli', roleId: 'r' })),
}
const LINEUP = Object.fromEntries(SLOTS.map((s, i) => [s, i + 1]))
const mainTactic = (name: string, slot = 2): UserTactic => ({
  slot, careerId: 7, name, formation: '4-4-2', buildUp: 'Balanced', defensiveApproach: null, lineHeight: null, eaCode: 'X', sourceReplicaId: null,
  slots: SLOTS.map((s, i) => ({ slot: s, position: POSITIONS[i], roleId: 'r', tags: [] })), main: true, lineup: LINEUP, depth: 50, presetId: null,
  updatedAt: '2026-10-20T10:00:00Z', lineupDropped: 0,
}) as UserTactic

const state: { main: UserTactic | null } = { main: null }
const endpoints = vi.hoisted(() => ({
  careers: vi.fn(), squad: vi.fn(), mainTactic: vi.fn(), starterTactic: vi.fn(), formations: vi.fn(), presets: vi.fn(), behaviorTags: vi.fn(),
  roles: vi.fn(), eaRoles: vi.fn(), resolveTactic: vi.fn(), fitRole: vi.fn(), lineup: vi.fn(), exportTacticCode: vi.fn(), importTacticCode: vi.fn(),
  userTactics: vi.fn(), saveUserTactic: vi.fn(), setMainTactic: vi.fn(), playerTags: vi.fn(), events: vi.fn(), positionAdvice: vi.fn(), careerMoves: vi.fn(), snapshots: vi.fn(),
  replicas: vi.fn(), replicaApply: vi.fn(),
}))
vi.mock('../../api/endpoints', () => ({ endpoints }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))

import { CareerSquadPage } from '../careerSquad/CareerSquadPage'
import { TacticsLabPage } from './TacticsLabPage'

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.pathname + location.search}</output>
}

function renderAt(url = '/career/tactics-lab', extra?: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes><Route path="/career/tactics-lab" element={<><TacticsLabPage />{extra}</>} /><Route path="*" element={null} /></Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const draft = (name: string, dirty = true) => {
  const created = labStore.create(7, { name, origin: { kind: 'main', ref: '2' }, tactic: { formation: '4-4-2', slots: {} }, lineup: LINEUP })
  if (!created.ok) throw new Error(created.message)
  if (!dirty) labStore.markSaved(7, created.draft.id, 2)
  return created.draft
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  labStore.reload()
  careerStore.set(7)
  state.main = mainTactic('Eski ana')
  endpoints.careers.mockResolvedValue([{ id: 7, name: 'Kariyer', clubId: 1, clubName: 'Kulüp', budgetEur: 0, squadSize: 11, gameDate: '2027-01-15' }])
  endpoints.squad.mockResolvedValue(SQUAD)
  endpoints.mainTactic.mockImplementation(() => Promise.resolve(state.main))
  endpoints.starterTactic.mockResolvedValue({ formationId: '4-4-2', setup: { buildUp: 'Balanced', depth: 50 }, squadFit: 60, alternatives: [], lineup: LINEUP,
    slots: SLOTS.map((s, i) => ({ slotId: s, position: POSITIONS[i], roleId: 'r', roleName: 'Rol' })) })
  endpoints.formations.mockResolvedValue([f442])
  endpoints.presets.mockResolvedValue([])
  endpoints.behaviorTags.mockResolvedValue([])
  endpoints.roles.mockResolvedValue([])
  endpoints.eaRoles.mockResolvedValue([])
  endpoints.resolveTactic.mockImplementation((t: { formation: string }) => Promise.resolve({ formation: t.formation, slots: [] }))
  endpoints.fitRole.mockImplementation((b: { playerId: number }) => Promise.resolve({ roleFit: { playerId: b.playerId, roleId: 'r', roleName: 'Rol', score: 70, reasons: [], weaponChecks: [], projectedRating: 70, outOfPosition: false,
    ...(b.playerId === 12 ? { levelFit: 40, fitLabel: 'WEAK' } : { levelFit: 70, fitLabel: 'GOOD' }) } }))
  // Kilitsiz çağrı = otomatik dizme; kilitli çağrı = rol uyumu (FAZ 4b toplu uyum), fitRole fikstüründen.
  const fits = lineupFromFitRole(endpoints.fitRole as never, (slotId) => POSITIONS[SLOTS.indexOf(slotId)] ?? 'CM')
  endpoints.lineup.mockImplementation((c: number, t: unknown, locked?: Record<string, number>) => (locked
    ? fits(c, t, locked)
    : Promise.resolve({ slots: SLOTS.map((slotId, i) => ({ slotId, playerId: i + 1 })) })))
  endpoints.replicas.mockResolvedValue([REPLICA])
  endpoints.replicaApply.mockResolvedValue({ replicaId: REPLICA.id, source: 'CAREER', squadFit: 70, analysis: { findings: [] },
    slots: SLOTS.map((slotId, i) => ({ slotId, position: POSITIONS[i], roleId: 'r', roleName: 'Rol', focus: 'Dengeli', player: { id: i + 1, name: `Oyuncu ${i + 1}` } })) })
  endpoints.importTacticCode.mockResolvedValue({ formation: '4-4-2', buildUp: 'Counter', depth: 30, exact: true, warnings: [], slots: [{ slotId: 'LST', roleId: 'poacher_attack', roleName: 'Poacher' }] })
  endpoints.exportTacticCode.mockResolvedValue({ code: 'ABCDEFGHIJKL', formation: '4-4-2', exact: true, warnings: [] })
  endpoints.userTactics.mockImplementation(() => Promise.resolve(state.main ? [state.main] : []))
  endpoints.saveUserTactic.mockImplementation((slot: number, body: { name: string }) => Promise.resolve({ ...mainTactic(body.name, slot), main: false }))
  endpoints.setMainTactic.mockImplementation((slot: number) => {
    state.main = mainTactic(labStore.get(7).drafts.find((d) => d.id === labStore.get(7).activeId)?.name ?? 'yeni', slot)
    return Promise.resolve(state.main)
  })
  endpoints.playerTags.mockResolvedValue([])
  endpoints.events.mockResolvedValue([])
  endpoints.positionAdvice.mockResolvedValue([])
  endpoints.careerMoves.mockResolvedValue([])
  endpoints.snapshots.mockResolvedValue([])
})

describe('Taktik Laboratuvarı (/career/tactics-lab, KARIYER-UX FAZ 4a)', () => {
  it('taslak yokken boş durum; "Yeni taslak" ana taktikten taslak açar ve kurucu gelir', async () => {
    renderAt()
    expect(await screen.findByText('Henüz taslak yok')).toBeInTheDocument()
    const button = await screen.findByRole('button', { name: /Yeni taslak/ })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(labStore.get(7).drafts).toHaveLength(1))
    expect(labStore.get(7).drafts[0]).toMatchObject({ name: 'Eski ana', origin: { kind: 'main' } })
    expect(await screen.findByRole('button', { name: "En iyi 11'i diz" })).toBeInTheDocument()
    expect(screen.getByText('Taslak · kaydedilmedi')).toBeInTheDocument()
  })

  it('ana taktik yoksa yeni taslak başlangıç önerisinden', async () => {
    state.main = null
    renderAt()
    const button = await screen.findByRole('button', { name: /Yeni taslak/ })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(labStore.get(7).drafts[0]?.origin.kind).toBe('auto'))
  })

  it('taslak çubuğu: seçicide ad ve kirli "•"; kopyala, yeniden adlandır', async () => {
    draft('Kayıtlı', false)
    draft('Deneme')
    renderAt()
    const picker = await screen.findByRole('combobox', { name: 'Taslak' })
    expect(within(picker).getAllByRole('option').map((o) => o.textContent)).toEqual(['Kayıtlı', 'Deneme •'])
    fireEvent.click(screen.getByRole('button', { name: 'Kopyala' }))
    expect(labStore.get(7).drafts.map((d) => d.name)).toEqual(['Kayıtlı', 'Deneme', 'Deneme (kopya)'])
    fireEvent.click(screen.getByRole('button', { name: 'Yeniden adlandır' }))
    fireEvent.change(screen.getByLabelText('Taslak adı'), { target: { value: 'Pres denemesi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adı kaydet' }))
    expect(labStore.get(7).drafts[2].name).toBe('Pres denemesi')
  })

  it('sil onaylı; kirli taslakta ikinci onay', async () => {
    draft('Kayıtlı', false)
    renderAt()
    fireEvent.click(await screen.findByRole('button', { name: 'Sil' }))
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Taslağı sil' })).getByRole('button', { name: 'Sil' }))
    await waitFor(() => expect(labStore.get(7).drafts).toHaveLength(0))

    draft('Kirli')
    fireEvent.click(await screen.findByRole('button', { name: 'Sil' }))
    const dialog = await screen.findByRole('dialog', { name: 'Taslağı sil' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sil' }))
    expect(labStore.get(7).drafts).toHaveLength(1)
    expect(within(dialog).getByText(/kaydedilmemiş değişiklik/i)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yine de sil' }))
    await waitFor(() => expect(labStore.get(7).drafts).toHaveLength(0))
  })

  it('sınır dolunca yeni taslak açılmaz, FAZ 1 mesajı', async () => {
    for (let i = 0; i < LAB_DRAFT_LIMIT; i += 1) draft(`T${i}`)
    renderAt()
    const button = await screen.findByRole('button', { name: /Yeni taslak/ })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    expect(await screen.findByText(`Taslak sınırı (${LAB_DRAFT_LIMIT}). Birini sil ya da ana taktik yap.`)).toHaveAttribute('role', 'alert')
    expect(labStore.get(7).drafts).toHaveLength(LAB_DRAFT_LIMIT)
  })

  it('"Ana taktiğim yap": slota kaydeder, ana yapar; taslak kaydedildi olur; Kadro yeni ana taktiği gösterir', async () => {
    draft('Pres 4-4-2')
    renderAt('/career/tactics-lab', <CareerSquadPage />)
    expect(await screen.findByRole('heading', { name: 'Eski ana' })).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Ana taktiğim yap' }))
    await userEvent.click(screen.getByRole('radio', { name: /Slot 1/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet ve ana taktik yap' }))
    await waitFor(() => expect(endpoints.setMainTactic).toHaveBeenCalledWith(1, 7))
    expect(endpoints.saveUserTactic).toHaveBeenCalledWith(1, expect.objectContaining({ careerId: 7, name: 'Pres 4-4-2', tactic: expect.objectContaining({ formation: '4-4-2' }), lineup: LINEUP }))
    await waitFor(() => expect(labStore.get(7).drafts[0]).toMatchObject({ dirty: false, savedTo: { slot: 1 } }))
    expect(await screen.findByText('Taslak · Slot 1')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Pres 4-4-2' })).toBeInTheDocument()
  })

  it('?slot= ana taktikten yeni taslak açar ve o slot seçili gelir; adres çubuğundan slot düşer', async () => {
    renderAt('/career/tactics-lab?sekme=kurucu&slot=LCM')
    await waitFor(() => expect(labStore.get(7).drafts).toHaveLength(1))
    expect(labStore.get(7).drafts[0].origin.kind).toBe('main')
    expect(await screen.findByText(/^CM — /)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('where').textContent).not.toContain('slot='))
  })

  it('saha cyber ve varsayılan kart; piyona geçilir', async () => {
    draft('Deneme')
    renderAt()
    await screen.findByRole('button', { name: "En iyi 11'i diz" })
    expect(document.querySelector('[data-field="cyber"]')).not.toBeNull()
    expect(document.querySelector('[data-pitch-marker="pawn"]')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Piyon' }))
    await waitFor(() => expect(document.querySelector('[data-pitch-marker="pawn"]')).not.toBeNull())
  })

  it('FAZ 4b sekmeleri: Kurucu · Sihirbaz · Replikalar · Kod · Karşılaştır; ?sekme= ile açılır', async () => {
    draft('Deneme')
    renderAt('/career/tactics-lab?sekme=kod')
    expect(await screen.findByRole('tab', { name: 'Kod', selected: true })).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Kurucu', 'Sihirbaz', 'Replikalar', 'Kod', 'Karşılaştır'])
  })

  it('Sihirbaz sekmesi: "Bu taktiği kur" sihirbaz kökenli yeni taslak açar ve Kurucu sekmesine geçer', async () => {
    endpoints.presets.mockResolvedValue([{ id: 'Blok', kind: 'STYLE', name: 'Blok', formation: '4-4-2', settings: { buildUp: 'Counter', depth: 30 }, slotTags: {} }])
    renderAt('/career/tactics-lab?sekme=sihirbaz')
    for (let i = 0; i < 5; i += 1) fireEvent.click(await screen.findByRole('button', { name: 'İleri' }))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Bu taktiği kur' }))[0])
    await waitFor(() => expect(labStore.get(7).drafts[0]?.origin).toEqual({ kind: 'wizard', ref: 'Blok' }))
    expect(await screen.findByRole('tab', { name: 'Kurucu', selected: true })).toBeInTheDocument()
  })

  it('Replikalar sekmesi: "Klonla → taslak" replika taktiği + kadromla diziliş, kurucuya geçer', async () => {
    renderAt('/career/tactics-lab?sekme=replikalar')
    fireEvent.click(await screen.findByRole('button', { name: /Klonla → taslak/ }))
    await waitFor(() => expect(labStore.get(7).drafts).toHaveLength(1))
    expect(endpoints.replicaApply).toHaveBeenCalledWith('barca-2011', { careerId: 7 })
    expect(labStore.get(7).drafts[0]).toMatchObject({ name: 'Barcelona 2010/11', origin: { kind: 'replica', ref: 'barca-2011' }, lineup: LINEUP,
      tactic: { formation: '4-4-2', setup: { buildUp: 'Short', depth: 72 } } })
    expect(await screen.findByRole('tab', { name: 'Kurucu', selected: true })).toBeInTheDocument()
  })

  it('Kod sekmesi: dışa aktar aktif taslağın kodu, ana taktik seçilince saklı kodu; içe aktar yeni taslak açar', async () => {
    draft('Deneme')
    renderAt('/career/tactics-lab?sekme=kod')
    expect(await screen.findByDisplayValue('ABCDEFGHIJKL')).toBeInTheDocument()
    expect(endpoints.exportTacticCode).toHaveBeenCalledWith(expect.objectContaining({ formation: '4-4-2' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Ana taktik' }))
    expect(await screen.findByDisplayValue('X')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('EA kodunu yapıştır'), { target: { value: 'KODKODKODKOD' } })
    fireEvent.click(screen.getByRole('button', { name: 'Taslak olarak aç' }))
    await waitFor(() => expect(labStore.get(7).drafts).toHaveLength(2))
    expect(labStore.get(7).drafts[1]).toMatchObject({ origin: { kind: 'code' }, tactic: { formation: '4-4-2', setup: { buildUp: 'Counter', depth: 30 } } })
  })

  it('Karşılaştır: taslak ↔ ana taktik; slot slot fark işaretli ve metinli, etiket değişimi, toplam takım uyumu farkı', async () => {
    const d = draft('Deneme')
    labStore.patch(7, d.id, () => ({ lineup: { ...LINEUP, LCM: 12 } }))
    renderAt('/career/tactics-lab?sekme=karsilastir')
    const lcm = await screen.findByRole('listitem', { name: /^LCM/ })
    expect(lcm).toHaveTextContent('Oyuncu 7')
    expect(lcm).toHaveTextContent('Oyuncu 12')
    expect(lcm).toHaveTextContent('−30')
    expect(lcm).toHaveTextContent('düştü')
    expect(lcm).toHaveTextContent('Rol için uygun → Rol için sınırda')
    const total = screen.getByRole('region', { name: 'Takım uyumu farkı' })
    expect(within(total).getByText('−3')).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: /^GK/ })).toHaveTextContent('aynı')
  })

  it('kurucu yalnız taslağa yazar; eski tek kopya depo yazılmaz', async () => {
    const d = draft('Deneme')
    labStore.patch(7, d.id, () => ({ lineup: {} }))
    renderAt()
    await waitFor(() => expect(Object.keys(labStore.get(7).drafts[0].lineup)).toHaveLength(11))
    expect(localStorage.getItem('fc.tactic')).toBeNull()
    expect(localStorage.getItem('fc.lineup')).toBeNull()
  })
})
