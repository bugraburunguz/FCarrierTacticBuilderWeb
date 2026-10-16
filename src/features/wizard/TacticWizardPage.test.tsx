import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { Preset } from '../../api/types'
import { tacticStore } from '../../state/tacticStore'
import { TacticWizardPage } from './TacticWizardPage'

const preset = (id: string, patch: Partial<Preset>): Preset => ({ id, kind: 'STYLE', name: id, formation: '4-3-3', ...patch })
const PRESETS = [
  preset('Pres', { settings: { buildUp: 'Counter', depth: 85 }, slotTags: { ST: ['st_press'] } }),
  preset('Blok', { formation: '4-4-2', settings: { buildUp: 'Counter', depth: 30 }, slotTags: { ST: ['st_target'], RW: ['w_cross'] } }),
  preset('Topla oyun', { settings: { buildUp: 'Short', depth: 70 }, slotTags: { ST: ['st_drop_deep'] } }),
]

vi.mock('../../api/endpoints', () => ({ endpoints: { presets: vi.fn() } }))

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.pathname}</output>
}

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/tactics/wizard']}>
        <Routes>
          <Route path="/tactics/wizard" element={<TacticWizardPage />} />
          <Route path="*" element={null} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const next = () => fireEvent.click(screen.getByRole('button', { name: 'İleri' }))

/** V3-07b: taktik sihirbazı v3 Akış şablonunda — adım göstergesi, her adımda tek karar, geri/ileri; sonuç mevcut yoldan kadro kurucuya. */
describe('TacticWizardPage (v3 Akış)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('Sonuç: cevaplara en yakın taktikler; "Bu taktiği kur" taktiği yazar ve mevcut yoldan kadro kurucuya geçer', async () => {
    const set = vi.spyOn(tacticStore, 'set')
    renderPage()
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
    const first = within(results).getAllByRole('listitem')[0]
    expect(first).toHaveTextContent('Blok')
    expect(screen.queryByRole('button', { name: 'İleri' })).toBeNull()
    fireEvent.click(within(first).getByRole('button', { name: 'Bu taktiği kur' }))
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ formation: '4-4-2', presetId: 'Blok', setup: { buildUp: 'Counter', depth: 30 } }))
    expect(screen.getByTestId('where')).toHaveTextContent('/tactics/builder')
    set.mockRestore()
  })

  it('taktik listesi alınamazsa sebep ve yeniden dene', async () => {
    vi.mocked(endpoints.presets).mockRejectedValue(new Error('ağ'))
    renderPage()
    for (let i = 0; i < 5; i++) next()
    expect(await screen.findByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument()
  })
})
