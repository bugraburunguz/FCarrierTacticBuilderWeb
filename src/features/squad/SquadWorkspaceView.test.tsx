/// <reference types="node" />
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SquadWorkspaceView, type SquadViewProps } from './SquadWorkspaceView'

export const baseProps: SquadViewProps = {
  title: 'Test Kadro',
  slots: [{ slotId: 'GK', position: 'GK', x: 50, y: 90, roleLabel: 'Goalkeeper · Defend' }],
  onPickPlayer: () => undefined,
  onPickRole: () => undefined,
  onRemove: () => undefined,
  formations: [{ id: '4-3-3', label: '4-3-3' }],
  formationsLoading: false,
  formationId: '4-3-3',
  onFormation: () => undefined,
  setup: { buildUp: 'Balanced', depth: 50 },
  onSetup: () => undefined,
  stats: [],
  averages: [],
  tacticCode: <div>kod</div>,
  onClear: () => undefined,
  clearDisabled: true,
}

describe('F5: tek satırlık, kapatılabilir not', () => {
  beforeEach(() => localStorage.clear())

  it('not sahanın üstünde değil yan panelde durur ve kapatılınca kalıcı olarak gizlenir', () => {
    const { unmount } = render(<MemoryRouter><SquadWorkspaceView {...baseProps} notice={{ id: 'ut-no-cards', text: 'Kulüp kartların yok' }} /></MemoryRouter>)
    const note = screen.getByText('Kulüp kartların yok').closest('[role=note]') as HTMLElement
    expect(note.closest('aside')).not.toBeNull()
    expect(screen.queryByLabelText('Saha')?.contains(note)).toBe(false)

    fireEvent.click(screen.getByLabelText('Notu kapat'))
    expect(screen.queryByText('Kulüp kartların yok')).not.toBeInTheDocument()
    unmount()
    render(<MemoryRouter><SquadWorkspaceView {...baseProps} notice={{ id: 'ut-no-cards', text: 'Kulüp kartların yok' }} /></MemoryRouter>)
    expect(screen.queryByText('Kulüp kartların yok')).not.toBeInTheDocument()
  })
})

describe('F2: mobil sheet', () => {
  function Harness() {
    const [open, setOpen] = useState(false)
    return (
      <MemoryRouter>
        <button onClick={() => setOpen(true)}>aç</button>
        <SquadWorkspaceView {...baseProps} selectedSlotId={open ? 'GK' : undefined} slotPanel={open ? { title: 'GK — Kart seç', onClose: () => setOpen(false), body: <p>liste</p> } : undefined} />
      </MemoryRouter>
    )
  }
  const mobile = () => vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }))

  beforeEach(() => {
    localStorage.clear()
    mobile()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('arkadaki saha erişilebilirlik ağacından gizlenir; Esc kapatır; odak slota döner', async () => {
    render(<Harness />)
    const slot = document.querySelector<HTMLElement>('[data-pitch-slot="GK"]')!
    slot.focus()
    fireEvent.click(screen.getByText('aç'))

    expect(await screen.findByRole('dialog', { name: 'GK — Kart seç' })).toBeInTheDocument()
    expect(document.querySelector('section[aria-label="Saha"]')!.closest('[aria-hidden="true"]')).not.toBeNull()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(slot))
  })

  it('sheet yüzeyi opak token kullanır (alpha ≥ 0,92)', () => {
    const css = readFileSync('src/design/tokens.css', 'utf8')
    const values = [...css.matchAll(/--sheet-bg:\s*([^;]+);/g)].map((m) => m[1])
    expect(values.length).toBeGreaterThanOrEqual(2)
    values.forEach((v) => {
      const alpha = /rgba\([^)]*,\s*([\d.]+)\)/.exec(v)?.[1]
      expect(alpha === undefined || Number(alpha) >= 0.92, v).toBe(true)
    })
  })
})

describe('F6/F8: kadro bilgisi eksikleri ve dokunmatik ipucu', () => {
  beforeEach(() => localStorage.clear())

  it('kadro adı localStorage\'a yazılır ve yenilemede geri gelir; erişilemezse çökmez', () => {
    const { unmount } = render(<MemoryRouter><SquadWorkspaceView {...baseProps} squadNameKey="fc.squadName.test" /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Kadro adı'), { target: { value: 'Hafta Sonu 11' } })
    expect(localStorage.getItem('fc.squadName.test')).toBe('Hafta Sonu 11')
    unmount()

    render(<MemoryRouter><SquadWorkspaceView {...baseProps} squadNameKey="fc.squadName.test" /></MemoryRouter>)
    expect(screen.getByLabelText('Kadro adı')).toHaveValue('Hafta Sonu 11')
  })

  it('squad rating yıldızı, "Tüm kadro ortalamaları" açılır bölümü ve boş durumlar görünür', () => {
    render(<MemoryRouter><SquadWorkspaceView {...baseProps} ratingStars={90} chem={{ value: 10, max: 33 }} allAverages={[{ label: 'Ort. OVR', value: 84 }]} averages={[{ label: 'PAC', value: 80, approximate: false }]} /></MemoryRouter>)

    expect(screen.getByRole('img', { name: /Squad rating yıldızı: 4.5 \/ 5/ })).toBeInTheDocument()
    expect(screen.getByText('Tüm kadro ortalamaları')).toBeInTheDocument()
    expect(screen.getByText('Ort. OVR')).toBeInTheDocument()
    expect(screen.getByText(/Kimya dökümü .* henüz hesaplanmıyor/)).toBeInTheDocument()
  })

  it('dokunmatikte "Mevkiye dokun → kart seç" ipucu bulunur', () => {
    render(<MemoryRouter><SquadWorkspaceView {...baseProps} /></MemoryRouter>)
    expect(screen.getByText(/Mevkiye dokun → kart seç/)).toBeInTheDocument()
  })
})
