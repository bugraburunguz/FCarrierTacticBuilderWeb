import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayer, PlayerSummary } from '../../api/types'
import type { UtCard } from '../../lib/utCard'
import { lineupStore } from '../../state/lineupStore'
import { DEFAULT_TACTIC, tacticStore } from '../../state/tacticStore'
import { utSquadStore } from '../../state/utSquadStore'
import { TacticCodeCard } from './TacticCodeCard'
import type { SquadMode } from './types'
import { useCareerBinding } from '../../pages/squad/useCareerBinding'
import { useSquadWorkspace, type SquadWorkspaceApi } from './useSquadWorkspace'
import { useUtBinding } from './useUtBinding'

// UT ve kariyer çekirdeği aynı hook/bileşenle çalışır (Q16): aşağıdaki her test iki modda koşar.
const slot = (slotId: string, position: string, defaultRole: string) => ({ slotId, position, x: 50, y: 50, defaultRole, group: position })
const f442 = { id: '4-4-2', label: '4-4-2', slots: [slot('GK', 'GK', 'goalkeeper_balanced'), slot('ST1', 'ST', 'poacher_attack'), slot('ST2', 'ST', 'poacher_attack')] }
const f433 = { id: '4-3-3', label: '4-3-3', slots: [slot('GK', 'GK', 'goalkeeper_balanced'), slot('ST', 'ST', 'poacher_attack')] }
const OUT = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY']
const GK = ['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS']

vi.mock('../../api/endpoints', () => ({
  endpoints: {
    formations: vi.fn(),
    roles: vi.fn(() => Promise.resolve([])),
    eaRoles: vi.fn(() => Promise.resolve([])),
    resolveTactic: vi.fn((t: { formation: string }) => Promise.resolve({ formation: t.formation, slots: [{ slotId: 'GK', roleId: 'goalkeeper_balanced', roleName: 'Goalkeeper' }] })),
    exportTacticCode: vi.fn(() => Promise.resolve({ code: 'ABCDEFGHIJKL', formation: '4-4-2', exact: true, warnings: [] })),
    importTacticCode: vi.fn(() => Promise.resolve({ formation: '4-3-3', buildUp: 'Counter', depth: 30, exact: true, warnings: [], slots: [{ slotId: 'ST', roleId: 'advanced_forward', roleName: 'Advanced Forward' }] })),
  },
}))

const utCard = (id: number, name: string, positions: string[], faceLabels: string[], faceStats: number[]): UtCard => ({ key: `c:${id}`, source: 'club', name, rating: 80, positions, assetId: id, faceLabels, faceStats })
const summary = (id: number, name: string, positions: string[], faceLabels: string[], faceStats: number[]) => ({ id, name, overall: 80, positions, valuationEstimated: false, faceLabels, faceStats }) as PlayerSummary

const UT_ITEMS = [utCard(1, 'Forvet A', ['ST'], OUT, [90, 80, 70, 60, 50, 40]), utCard(2, 'Forvet B', ['ST'], OUT, [70, 60, 50, 40, 30, 20]), utCard(3, 'Kaleci', ['GK'], GK, [99, 10, 10, 10, 10, 10])]
const CAREER_SQUAD = [summary(1, 'Forvet A', ['ST'], OUT, [90, 80, 70, 60, 50, 40]), summary(2, 'Forvet B', ['ST'], OUT, [70, 60, 50, 40, 30, 20]), summary(3, 'Kaleci', ['GK'], GK, [99, 10, 10, 10, 10, 10])].map((player) => ({ player, onLoan: false }) as CareerPlayer)

/** Modun kendi bağlayıcısı + tek tip yoklama arayüzü: çekirdek davranışı iki modda aynı düğmelerle sınanır. */
function Probe<T>({ ws, items }: { ws: SquadWorkspaceApi<T>; items: T[] }) {
  return (
    <div>
      <output data-testid="formation">{ws.formation?.id ?? ''}</output>
      <output data-testid="note">{ws.note ?? ''}</output>
      <output data-testid="selection">{ws.selection ? `${ws.selection.slotId}:${ws.selection.panel}` : ''}</output>
      <output data-testid="assigned">{Object.entries(ws.state.assigned).map(([slotId, item]) => `${slotId}=${ws.binding.keyOf(item)}`).sort().join(',')}</output>
      <output data-testid="averages">{ws.averages.map((a) => `${a.label}=${a.value ?? '-'}`).join(' ')}</output>
      <button onClick={() => ws.assign('ST1', items[0])}>forvet A → ST1</button>
      <button onClick={() => ws.assign('ST2', items[1])}>forvet B → ST2</button>
      <button onClick={() => ws.assign('GK', items[2])}>kaleci → GK</button>
      <button onClick={() => ws.assign('ST2', items[0])}>forvet A → ST2</button>
      <button onClick={() => ws.swap('ST1', 'ST2')}>yer değiştir</button>
      <button onClick={() => ws.select('ST1', 'role')}>rol seç</button>
      <button onClick={() => ws.changeFormation('4-3-3')}>4-3-3</button>
      <button onClick={() => ws.setRole('GK', 'goalkeeper_sweeper')}>rol ata</button>
      <TacticCodeCard mode={ws.mode} tactic={ws.tactic} resolved={ws.resolved.data} onLoaded={ws.applyImportedCode} />
    </div>
  )
}

function UtHarness() {
  const { binding } = useUtBinding()
  return <Probe ws={useSquadWorkspace('ut', binding)} items={UT_ITEMS} />
}
function CareerHarness() {
  const { binding } = useCareerBinding(1, CAREER_SQUAD)
  return <Probe ws={useSquadWorkspace('career', binding)} items={[1, 2, 3]} />
}

function renderMode(mode: SquadMode) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{mode === 'ut' ? <UtHarness /> : <CareerHarness />}</MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Eski/uyuşmayan kayıtlı durum: modun kendi deposuna yazılır. */
function seedStale(mode: SquadMode) {
  if (mode === 'ut') {
    utSquadStore.set({ formationId: 'yok-formasyon', setup: { buildUp: 'Balanced', depth: 55 }, picked: {}, roleOverride: { LWB: 'x_role' }, origin: 'manual' })
  } else {
    tacticStore.set({ formation: 'yok-formasyon', slots: { LWB: { tags: [], roleId: 'x_role' } } })
  }
}

function seedValid(mode: SquadMode, formationId: string) {
  if (mode === 'ut') {
    utSquadStore.set({ formationId, setup: { buildUp: 'Balanced', depth: 55 }, picked: {}, roleOverride: {}, origin: 'manual' })
  } else {
    tacticStore.set({ formation: formationId, slots: {} })
  }
}

describe.each<SquadMode>(['ut', 'career'])('kadro çekirdeği — %s modu', (mode) => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(endpoints.formations).mockResolvedValue([f442, f433] as never)
    utSquadStore.clear()
    tacticStore.set(DEFAULT_TACTIC)
    lineupStore.set(1, {})
    seedValid(mode, '4-4-2')
  })

  it('formasyon listesi gelmeden taktik çözme isteği gitmez', async () => {
    let release: (value: unknown) => void = () => undefined
    vi.mocked(endpoints.formations).mockReturnValue(new Promise((resolve) => { release = resolve }) as never)
    renderMode(mode)

    // REVIEW: sabit bekleme yerine olumlu sinyal (formasyon istendi) + efektlerin boşaltılması; yavaş CI'da yanlış geçmez.
    await waitFor(() => expect(endpoints.formations).toHaveBeenCalled())
    await act(async () => { await Promise.resolve() })
    expect(endpoints.resolveTactic).not.toHaveBeenCalled()

    release([f442, f433])
    await waitFor(() => expect(endpoints.resolveTactic).toHaveBeenCalled())
    for (const [tactic] of vi.mocked(endpoints.resolveTactic).mock.calls) {
      expect(tactic.formation).toBeTruthy()
    }
  })

  it('aynı taktik için tek çözme isteği gider; taktik kodu çözümü paylaşır', async () => {
    renderMode(mode)

    await waitFor(() => expect(screen.getByText('ABCDEFGHIJKL')).toBeInTheDocument())
    expect(endpoints.resolveTactic).toHaveBeenCalledTimes(1)
  })

  it('kayıtlı formasyon/rol formasyonla uyuşmuyorsa temizlenir, not gösterilir, hiç 400 isteği gitmez', async () => {
    seedStale(mode)
    renderMode(mode)

    await waitFor(() => expect(screen.getByTestId('note')).toHaveTextContent(/güncel formasyonla uyuşmadığı için sıfırlandı/))
    await waitFor(() => expect(endpoints.resolveTactic).toHaveBeenCalled())
    for (const [tactic] of vi.mocked(endpoints.resolveTactic).mock.calls) {
      expect(['4-4-2', '4-3-3']).toContain(tactic.formation)
      expect(tactic.slots).toEqual([])
    }
  })

  it('kayıtlı atamalardan formasyonda olmayan slot temizlenir', async () => {
    if (mode === 'ut') {
      utSquadStore.set({ formationId: '4-4-2', setup: { buildUp: 'Balanced', depth: 55 }, picked: { GK: UT_ITEMS[2], LWB: UT_ITEMS[0] }, roleOverride: {}, origin: 'manual' })
    } else {
      lineupStore.set(1, { GK: 3, LWB: 1 })
    }
    renderMode(mode)

    await waitFor(() => expect(screen.getByTestId('assigned').textContent).toBe('GK=3'))
  })

  it('kaleci yüz değeri saha ortalamalarına karışmaz (etiketle ortalama)', async () => {
    renderMode(mode)
    await screen.findByText('ABCDEFGHIJKL')

    fireEvent.click(screen.getByText('forvet A → ST1'))
    fireEvent.click(screen.getByText('forvet B → ST2'))
    fireEvent.click(screen.getByText('kaleci → GK'))

    await waitFor(() => expect(screen.getByTestId('averages')).toHaveTextContent('PAC=80 SHO=70 PAS=60 DRI=50 DEF=40 PHY=30'))
  })

  it('aynı kişi iki slota konamaz; yer değiştirme iki slotu da taşır', async () => {
    renderMode(mode)
    await screen.findByText('ABCDEFGHIJKL')

    fireEvent.click(screen.getByText('forvet A → ST1'))
    fireEvent.click(screen.getByText('forvet B → ST2'))
    fireEvent.click(screen.getByText('yer değiştir'))
    await waitFor(() => expect(screen.getByTestId('assigned')).toHaveTextContent('ST1=2,ST2=1'))

    fireEvent.click(screen.getByText('forvet A → ST2'))
    expect(screen.getByTestId('assigned').textContent).toBe(`ST1=2,ST2=1`)
  })

  it('slot seçimi yan paneli değiştirir; formasyon değişince seçim kapanır ve atamalar yeni slota taşınır', async () => {
    renderMode(mode)
    await screen.findByText('ABCDEFGHIJKL')

    fireEvent.click(screen.getByText('rol seç'))
    expect(screen.getByTestId('selection')).toHaveTextContent('ST1:role')

    fireEvent.click(screen.getByText('forvet A → ST1'))
    fireEvent.click(screen.getByText('4-3-3'))
    await waitFor(() => expect(screen.getByTestId('formation')).toHaveTextContent('4-3-3'))
    expect(screen.getByTestId('selection')).toHaveTextContent('')
    expect(screen.getByTestId('assigned').textContent).toBe('ST=1')
  })

  it('rol ataması taktik isteğine girer ve çözme tek sorguda yenilenir', async () => {
    renderMode(mode)
    await screen.findByText('ABCDEFGHIJKL')

    fireEvent.click(screen.getByText('rol ata'))
    await waitFor(() => expect(vi.mocked(endpoints.resolveTactic).mock.calls.some(([t]) => t.slots.some((s) => s.slotId === 'GK' && s.roleId === 'goalkeeper_sweeper'))).toBe(true))
  })

  it('EA kodu yüklenince formasyon, rol, Build-Up ve hat değişir; atamalar yalnız kariyerde kalır', async () => {
    renderMode(mode)
    await screen.findByText('ABCDEFGHIJKL')
    fireEvent.click(screen.getByText('forvet A → ST1'))
    fireEvent.click(screen.getByText('forvet B → ST2'))

    fireEvent.change(screen.getByLabelText('EA kodunu yapıştır'), { target: { value: 'abc123' } })
    await act(async () => fireEvent.click(screen.getByText('Yükle')))

    await waitFor(() => expect(screen.getByTestId('formation')).toHaveTextContent('4-3-3'))
    await waitFor(() => expect(vi.mocked(endpoints.resolveTactic).mock.calls.some(([t]) => t.formation === '4-3-3' && t.setup?.buildUp === 'Counter' && t.setup.depth === 30 && t.slots.some((s) => s.roleId === 'advanced_forward'))).toBe(true))
    expect(screen.getByText(/Taktik yüklendi: 4-3-3 · Counter · Hat 30/)).toBeInTheDocument()
    if (mode === 'ut') {
      expect(screen.getByTestId('assigned').textContent).toBe('')
    } else {
      // Kariyerde dizilim korunur; yalnız yeni formasyonda olmayan slotlar (ST1/ST2) temizlenir.
      expect(screen.getByTestId('assigned').textContent).not.toContain('ST1')
    }
  })
})
