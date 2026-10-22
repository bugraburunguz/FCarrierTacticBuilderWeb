import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CareerPlayer, Formation, StarterTactic, UserTactic } from '../../api/types'
import { LAB_KEY, labStore } from '../../state/labStore'

const state: { main: UserTactic | null } = { main: null }

const formation: Formation = {
  id: '4-4-2', label: '4-4-2',
  slots: [
    { slotId: 'GK', position: 'GK', group: 'GK', defaultRole: 'goalkeeper_defend', x: 50, y: 92 },
    { slotId: 'LST', position: 'ST', group: 'ST', defaultRole: 'advanced_forward_attack', x: 40, y: 15 },
  ],
} as unknown as Formation

const starter: StarterTactic = {
  formationId: '4-4-2', setup: { buildUp: 'Balanced', depth: 50 }, squadFit: 71.4,
  slots: [{ slotId: 'GK', position: 'GK', roleId: 'goalkeeper_defend', roleName: 'Goalkeeper' }, { slotId: 'LST', position: 'ST', roleId: 'advanced_forward_attack', roleName: 'Advanced Forward' }],
  lineup: { GK: 1, LST: 9 }, alternatives: [{ formationId: '4-3-3', score: 70.1 }, { formationId: '4-2-3-1', score: 69.8 }],
}

const squad = [
  { player: { id: 1, name: 'Joe Keeper', overall: 66, positions: ['GK'] }, onLoan: false },
  { player: { id: 9, name: 'Mo Faal', overall: 63, positions: ['ST'] }, onLoan: false },
] as unknown as CareerPlayer[]

const saved = (slot: number, main: boolean, extra: Partial<UserTactic> = {}): UserTactic => ({
  slot, careerId: 7, name: 'Otomatik öneri', formation: '4-4-2', buildUp: 'Balanced', defensiveApproach: null, lineHeight: null,
  slots: starter.slots.map((s) => ({ slot: s.slotId, position: s.position, roleId: s.roleId, tags: [] })), eaCode: 'X', sourceReplicaId: null,
  main, lineup: starter.lineup, depth: 50, presetId: null, updatedAt: '2026-10-22T10:00:00Z', lineupDropped: 0, ...extra,
})

const endpoints = vi.hoisted(() => ({
  mainTactic: vi.fn(),
  starterTactic: vi.fn(),
  formations: vi.fn(),
  squad: vi.fn(),
  userTactics: vi.fn(),
  saveUserTactic: vi.fn(),
  setMainTactic: vi.fn(),
  lineup: vi.fn(),
}))
vi.mock('../../api/endpoints', () => ({ endpoints }))

import { StarterTacticPanel } from './StarterTacticPanel'
import { useMainTacticBinding } from './activeTactic'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
}

describe('ana taktik yokken otomatik başlangıç önerisi (D-31)', () => {
  beforeEach(() => {
    localStorage.clear()
    labStore.reload()
    state.main = null
    endpoints.mainTactic.mockImplementation(() => Promise.resolve(state.main))
    endpoints.starterTactic.mockResolvedValue(starter)
    endpoints.formations.mockResolvedValue([formation])
    endpoints.squad.mockResolvedValue(squad)
    endpoints.lineup.mockReset().mockResolvedValue({ slots: [{ slotId: 'GK', playerId: 1 }, { slotId: 'LST', playerId: 9 }] })
    endpoints.userTactics.mockImplementation(() => Promise.resolve(state.main ? [state.main] : []))
    endpoints.saveUserTactic.mockImplementation((slot: number) => Promise.resolve(saved(slot, false)))
    endpoints.setMainTactic.mockImplementation((slot: number) => {
      state.main = saved(slot, true)
      return Promise.resolve(state.main)
    })
  })

  it('öneri ekranı "Otomatik öneri" etiketini ve piyonlu sahayı gösterir; "Ana taktiğim yap" sonrası etiket "Kararın" olur', async () => {
    render(<StarterTacticPanel careerId={7} />, { wrapper })

    expect(await screen.findByText('Otomatik öneri · ana taktik değil')).toBeInTheDocument()
    expect(await screen.findByLabelText(/Mo Faal/)).toBeInTheDocument()
    expect(screen.getByText('4-4-2')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ana taktiğim yap' }))
    await userEvent.click(screen.getByRole('radio', { name: /Slot 1/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet ve ana taktik yap' }))

    expect(await screen.findByText('Kararın')).toBeInTheDocument()
    expect(screen.queryByText('Otomatik öneri · ana taktik değil')).toBeNull()
    expect(endpoints.saveUserTactic).toHaveBeenCalledWith(1, expect.objectContaining({ careerId: 7, tactic: expect.objectContaining({ formation: '4-4-2' }), lineup: { GK: 1, LST: 9 } }))
    expect(endpoints.setMainTactic).toHaveBeenCalledWith(1, 7)
  })

  it('"Lab\'da düzenle" öneriden auto kökenli yeni taslak açar', async () => {
    const onOpenLab = vi.fn()
    render(<StarterTacticPanel careerId={7} onOpenLab={onOpenLab} />, { wrapper })
    await userEvent.click(await screen.findByRole('button', { name: "Lab'da düzenle" }))
    expect(labStore.get(7).drafts).toHaveLength(1)
    expect(labStore.get(7).drafts[0].origin.kind).toBe('auto')
    expect(onOpenLab).toHaveBeenCalledWith(labStore.get(7).drafts[0].id)
  })

  it('göç eden taslak varsa "Önceki taslağı ana taktik yap" kısayolu çıkar', async () => {
    labStore.create(7, { name: 'Önceki taslak', origin: { kind: 'blank', ref: 'fc.tactic' }, tactic: { formation: '4-4-2', slots: {} }, lineup: {} })
    render(<StarterTacticPanel careerId={7} />, { wrapper })
    expect(await screen.findByRole('button', { name: 'Önceki taslağı ana taktik yap' })).toBeInTheDocument()
  })

  it('ana taktikten düşen oyuncuların yeri /fit/lineup ile dolar; dizilen oyuncular kilitli kalır (Q2)', async () => {
    state.main = saved(2, true, { lineupDropped: 2, lineup: { GK: 1 } })
    render(<StarterTacticPanel careerId={7} />, { wrapper })
    expect(await screen.findByText('Kararın')).toBeInTheDocument()
    expect(await screen.findByText('2 oyuncu kadroda yok, otomatik dolduruldu')).toBeInTheDocument()
    expect(endpoints.lineup).toHaveBeenCalledWith(7, expect.objectContaining({ formation: '4-4-2' }), { GK: 1 })
    expect(await screen.findByLabelText(/Mo Faal/)).toBeInTheDocument()
  })

  it('doldurma gelmezse metin boş slotu anlatır, "dolduruldu" demez', async () => {
    endpoints.lineup.mockRejectedValue(new Error('down'))
    state.main = saved(2, true, { lineupDropped: 2, lineup: { GK: 1 } })
    render(<StarterTacticPanel careerId={7} />, { wrapper })
    expect(await screen.findByText('2 oyuncu artık kadroda yok, slotları boş')).toBeInTheDocument()
    expect(screen.queryByText(/otomatik dolduruldu/)).toBeNull()
  })
})

describe('salt okunur ana taktik bağlaması (katman 2)', () => {
  beforeEach(() => {
    localStorage.clear()
    labStore.reload()
    state.main = saved(2, true)
    endpoints.mainTactic.mockImplementation(() => Promise.resolve(state.main))
    endpoints.starterTactic.mockResolvedValue(starter)
  })

  it('patch hiçbir depoya yazmaz; ana taktik kaynaklıdır', async () => {
    const { result } = renderHook(() => useMainTacticBinding(7, squad), { wrapper })
    await waitFor(() => expect(result.current.source).toEqual({ kind: 'decision' }))
    expect(result.current.binding.state.formationId).toBe('4-4-2')
    expect(result.current.binding.state.assigned).toEqual({ GK: 1, LST: 9 })

    const before = JSON.stringify(localStorage)
    act(() => result.current.binding.patch({ formationId: '4-3-3', assigned: {} }))
    expect(result.current.binding.state.formationId).toBe('4-4-2')
    expect(JSON.stringify(localStorage)).toBe(before)
    expect(localStorage.getItem(LAB_KEY)).toBeNull()
  })

  it('düşen oyuncu varsa bağlama doldurulmuş dizilişi görür (Masa takım uyumu ve zayıf halkalar buradan)', async () => {
    state.main = saved(2, true, { lineupDropped: 1, lineup: { GK: 1 } })
    endpoints.lineup.mockReset().mockResolvedValue({ slots: [{ slotId: 'GK', playerId: 1 }, { slotId: 'LST', playerId: 9 }] })
    const { result } = renderHook(() => useMainTacticBinding(7, squad), { wrapper })
    await waitFor(() => expect(result.current.binding.state.assigned).toEqual({ GK: 1, LST: 9 }))
    expect(result.current.filled).toBe(true)
    expect(result.current.dropped).toBe(1)
  })
})
