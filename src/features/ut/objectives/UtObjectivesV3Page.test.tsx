import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../../api/endpoints'
import type { Objective } from '../../../lib/objectives'
import { objectiveStore } from '../../../state/objectiveStore'
import { UtObjectivesV3Page } from './UtObjectivesV3Page'

vi.mock('../../../api/endpoints', () => ({ endpoints: { kbObjectives: vi.fn() } }))

const KB = [{ id: 5, name: 'Founders Path', status: 'CONFIRMED', objectives: [{ id: 51, name: 'Gol at', total: 3, lockedBy: [], rewards: [] }, { id: 52, name: 'Asist yap', total: 2, lockedBy: [51], rewards: [] }] }]
const sub = (id: string, subIndex: number, extra: Partial<Objective> = {}): Objective => ({
  id, name: `Alt ${subIndex}`, group: 'Weekly', requirements: [], rewardValue: 500, sp: 0, webAppDoable: false,
  parentId: 'g1', parentName: 'Haftalık Ustalık', parentReward: 5000, subIndex, subTotal: 3, subDone: 1, expiresAt: '2026-10-30', ...extra,
})

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><UtObjectivesV3Page /></MemoryRouter>
    </QueryClientProvider>,
  )
}

/** V3-07c: /ut/objectives v3 — grup kartları (ödül, bitiş, ilerleme veride varsa), görev listesi, planlayıcı; boş/dolu/hata. */
describe('UtObjectivesV3Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    objectiveStore.clear()
    vi.mocked(endpoints.kbObjectives).mockResolvedValue([] as never)
  })

  it('boş: kulüp senkronu öneren durum', async () => {
    renderPage()
    expect(await screen.findByRole('link', { name: 'Kulübümü senkronla' })).toHaveAttribute('href', '/ut/import')
  })

  it('güncel gruplar (KB): grup kartı, görev listesi, planlayıcıya aktar', async () => {
    vi.mocked(endpoints.kbObjectives).mockResolvedValue(KB as never)
    const replace = vi.spyOn(objectiveStore, 'replaceImported')
    renderPage()
    const group = await screen.findByRole('article', { name: 'Founders Path' })
    expect(within(group).getByText('2 görev')).toBeInTheDocument()
    expect(within(group).getByRole('list', { name: 'Görevler' })).toHaveTextContent('Gol at')
    fireEvent.click(screen.getByRole('button', { name: 'Planlayıcıya aktar' }))
    expect(replace).toHaveBeenCalled()
    replace.mockRestore()
  })

  it('senin grupların: ilerleme (alt görev), ana ödül ve bitiş; görev silinebilir', async () => {
    ;[sub('a', 1), sub('b', 2), sub('c', 3)].forEach((o) => objectiveStore.add(o))
    renderPage()
    const group = await screen.findByRole('article', { name: 'Haftalık Ustalık' })
    expect(within(group).getByRole('progressbar', { name: 'İlerleme' })).toHaveAttribute('aria-valuenow', '1')
    expect(within(group).getByText(/5\.000/)).toBeInTheDocument()
    expect(within(group).getByText(/30\.10\.2026|2026-10-30/)).toBeInTheDocument()
    fireEvent.click(within(group).getAllByRole('button', { name: /Sil/ })[0])
    expect(objectiveStore.get()).toHaveLength(2)
    expect(screen.getByRole('heading', { name: /^Önerilen plan/ })).toBeInTheDocument()
  })

  it('objective ekle: biçim hatası gösterilir, geçerli şart eklenir', async () => {
    renderPage()
    fireEvent.click(await screen.findByText('Objective ekle'))
    fireEvent.change(screen.getByLabelText('Ad'), { target: { value: 'Elle görev' } })
    fireEvent.change(screen.getByLabelText(/Şartlar/), { target: { value: 'yanlış biçim' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ekle' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Şart satırı biçimi')
    fireEvent.change(screen.getByLabelText(/Şartlar/), { target: { value: 'GOALS:3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ekle' }))
    expect(objectiveStore.get().map((o) => o.name)).toEqual(['Elle görev'])
  })

  it('hata: güncel gruplar alınamazsa sebep + tekrar dene (planlayıcı yine çalışır)', async () => {
    vi.mocked(endpoints.kbObjectives).mockRejectedValue(new Error('ağ'))
    renderPage()
    expect(await screen.findByText('Güncel objective grupları yüklenemedi.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument()
  })
})
