import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { compareStore } from '../state/compareStore'
import { CompareButton } from './CompareButton'
import { CompareTray } from './CompareTray'

const entry = { id: 1, name: 'Ada Santrfor', overall: 91, position: 'ST' }

function setViewport(mobile: boolean) {
  window.matchMedia = ((query: string) => ({ matches: mobile && query.includes('max-width: 819px'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }) as unknown as MediaQueryList) as typeof window.matchMedia
}

const renderTray = (path = '/players') => render(<MemoryRouter initialEntries={[path]}><CompareTray /></MemoryRouter>)

beforeEach(() => {
  compareStore.clear()
  setViewport(false)
})
afterEach(() => compareStore.clear())

describe('karşılaştırma tepsisi', () => {
  it('boşken DOM\'da hiç yok (oyuncular sayfasında da), ilk oyuncu eklenince çıkar', () => {
    const { container } = renderTray('/players')
    expect(container.innerHTML).toBe('')
    act(() => compareStore.add(entry))
    expect(screen.getByRole('link', { name: 'Karşılaştır (1)' })).toHaveAttribute('href', '/compare')
    act(() => compareStore.clear())
    expect(container.innerHTML).toBe('')
  })

  it('masaüstünde altta sabit çubuk + eşit yükseklikte yer tutucu (içeriği kapatmaz); sürükle-bırak metni yok', () => {
    act(() => compareStore.add(entry))
    const { container } = renderTray()
    expect(container.querySelector('[data-compare-spacer]')).not.toBeNull()
    expect(screen.getByRole('region', { name: 'Karşılaştırma' }).className).toContain('fixed')
    expect(document.body.textContent).not.toMatch(/sürükle/i)
  })

  it('mobilde çubuk yok; küçük yüzen "Karşılaştır (n)" düğmesi alttan sheet açar', () => {
    setViewport(true)
    act(() => compareStore.add(entry))
    const { container } = renderTray()
    expect(screen.queryByRole('region', { name: 'Karşılaştırma' })).toBeNull()
    expect(container.querySelector('[data-compare-spacer]')).toBeNull()
    const fab = screen.getByRole('button', { name: 'Karşılaştır (1)' })
    expect(fab.className).toContain('fixed')
    expect(fab.className).not.toContain('inset-x-0')
    fireEvent.click(fab)
    expect(screen.getByRole('dialog', { name: 'Karşılaştırma' })).toBeInTheDocument()
    expect(screen.getByText('Ada Santrfor')).toBeInTheDocument()
  })

  it('/compare sayfasında görünmez', () => {
    act(() => compareStore.add(entry))
    const { container } = renderTray('/compare')
    expect(container.innerHTML).toBe('')
  })
})

describe('karttaki karşılaştır düğmesi', () => {
  it('eklenmemişken "Karşılaştırmaya ekle" (etiket + tooltip), eklenince ✓ ve "Karşılaştırmadan çıkar"', () => {
    render(<CompareButton entry={entry} compact />)
    const add = screen.getByRole('button', { name: 'Karşılaştırmaya ekle' })
    expect(add).toHaveAttribute('title', 'Karşılaştırmaya ekle')
    fireEvent.click(add)
    const remove = screen.getByRole('button', { name: 'Karşılaştırmadan çıkar' })
    expect(remove).toHaveAttribute('title', 'Karşılaştırmadan çıkar')
    expect(remove.querySelector('svg.lucide-check')).not.toBeNull()
  })
})
