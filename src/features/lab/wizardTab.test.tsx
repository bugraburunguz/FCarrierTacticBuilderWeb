import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { Preset } from '../../api/types'
import { careerStore } from '../../state/careerStore'
import { LAB_DRAFT_LIMIT, labStore } from '../../state/labStore'
import { tacticStore } from '../../state/tacticStore'
import { WizardTab } from './WizardTab'

const preset = (id: string, patch: Partial<Preset>): Preset => ({ id, kind: 'STYLE', name: id, formation: '4-3-3', ...patch })
const PRESETS = [
  preset('Pres', { settings: { buildUp: 'Counter', depth: 85 }, slotTags: { ST: ['st_press'] } }),
  preset('Blok', { formation: '4-4-2', settings: { buildUp: 'Counter', depth: 30 }, slotTags: { ST: ['st_target'], RW: ['w_cross'] } }),
  preset('Topla oyun', { settings: { buildUp: 'Short', depth: 70 }, slotTags: { ST: ['st_drop_deep'] } }),
]

vi.mock('../../api/endpoints', () => ({ endpoints: { presets: vi.fn() } }))

const onApplied = vi.fn()

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <WizardTab careerId={7} onApplied={onApplied} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const next = () => fireEvent.click(screen.getByRole('button', { name: 'İleri' }))

/** V3-07b → FAZ 4b: taktik sihirbazı Lab sekmesi — adım göstergesi, her adımda tek karar, geri/ileri; sonuç yeni Lab taslağı. */
describe('WizardTab (Lab › Sihirbaz)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    labStore.reload()
    careerStore.set(7)
    vi.mocked(endpoints.presets).mockResolvedValue(PRESETS as never)
  })

  it('adım göstergesi: 5 soru + Sonuç; geçerli adım aria-current="step"; her adımda tek karar', () => {
    renderPage()
    const steps = within(screen.getByRole('list', { name: 'Adımlar' })).getAllByRole('listitem')
    expect(steps.map((s) => s.textContent)).toEqual(['1Oyun kurulumu', '2Savunma', '3Hücum yolu', '4Forvet tipi', '5Formasyon', '6Sonuç'])
    expect(steps[0]).toHaveAttribute('aria-current', 'step')
    expect(screen.getAllByRole('radiogroup')).toHaveLength(1)
    expect(screen.getByRole('radiogroup', { name: 'Oyun kurulumu' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Geri' })).toBeDisabled()
  })

  it('ileri/geri: seçim adımlar arasında korunur', () => {
    renderPage()
    fireEvent.click(screen.getByRole('radio', { name: /Kontra/ }))
    next()
    expect(screen.getByRole('radiogroup', { name: 'Rakip topu kurarken savunman' })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Adımlar' })).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step')
    fireEvent.click(screen.getByRole('button', { name: 'Geri' }))
    expect(screen.getByRole('radio', { name: /Kontra/ })).toBeChecked()
  })

  const toResults = async () => {
    fireEvent.click(screen.getByRole('radio', { name: /Kontra/ }))
    next()
    fireEvent.click(screen.getByRole('radio', { name: /Geride bekle/ }))
    next()
    fireEvent.click(screen.getByRole('radio', { name: /Kanatlardan/ }))
    next()
    fireEvent.click(screen.getByRole('radio', { name: /Hedef forvet/ }))
    next()
    next()
    const results = await screen.findByRole('list', { name: 'Sana en yakın taktikler' })
    return within(results).getAllByRole('listitem')[0]
  }

  it('Sonuç: "Bu taktiği kur" yeni Lab taslağı (sihirbaz kökenli) açar, aktif yapar ve Lab kurucusuna geçer; eski depoya yazmaz', async () => {
    const set = vi.spyOn(tacticStore, 'set')
    renderPage()
    const first = await toResults()
    expect(first).toHaveTextContent('Blok')
    expect(screen.queryByRole('button', { name: 'İleri' })).toBeNull()
    fireEvent.click(within(first).getByRole('button', { name: 'Bu taktiği kur' }))
    const lab = labStore.get(7)
    expect(lab.drafts).toHaveLength(1)
    expect(lab.drafts[0]).toMatchObject({ name: 'Blok', origin: { kind: 'wizard', ref: 'Blok' }, tactic: { formation: '4-4-2', presetId: 'Blok', setup: { buildUp: 'Counter', depth: 30 } }, lineup: {} })
    expect(lab.activeId).toBe(lab.drafts[0].id)
    expect(set).not.toHaveBeenCalled()
    expect(onApplied).toHaveBeenCalledTimes(1)
    set.mockRestore()
  })

  it('taslak sınırı doluysa sınır mesajı, yönlendirme yok', async () => {
    for (let i = 0; i < LAB_DRAFT_LIMIT; i += 1) labStore.create(7, { name: `T${i}`, origin: { kind: 'blank' }, tactic: { formation: '4-4-2', slots: {} }, lineup: {} })
    renderPage()
    fireEvent.click(within(await toResults()).getByRole('button', { name: 'Bu taktiği kur' }))
    expect(screen.getByRole('alert')).toHaveTextContent(`Taslak sınırı (${LAB_DRAFT_LIMIT})`)
    expect(labStore.get(7).drafts).toHaveLength(LAB_DRAFT_LIMIT)
    expect(onApplied).not.toHaveBeenCalled()
  })

  it('taktik listesi alınamazsa sebep ve yeniden dene', async () => {
    vi.mocked(endpoints.presets).mockRejectedValue(new Error('ağ'))
    renderPage()
    for (let i = 0; i < 5; i++) next()
    expect(await screen.findByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument()
  })
})
