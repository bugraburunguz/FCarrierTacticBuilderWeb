import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CareerPlayer, Formation } from '../../../api/types'
import { DepthMap, RegionSummary } from './DepthMap'

const formation = {
  id: '4-1-3-2', label: '4-1-3-2',
  slots: [
    { slotId: 'GK', position: 'GK', x: 50, y: 92 }, { slotId: 'CDM', position: 'CDM', x: 50, y: 60 }, { slotId: 'CM', position: 'CM', x: 50, y: 50 },
    { slotId: 'LST', position: 'ST', x: 38, y: 15 }, { slotId: 'RST', position: 'ST', x: 62, y: 15 },
  ].map((s) => ({ ...s, defaultRole: 'r', group: s.position })),
} as unknown as Formation
const squad = [{ player: { id: 1, name: 'A', overall: 70, positions: ['CM'] }, onLoan: false }] as unknown as CareerPlayer[]

/** KARIYER-UX FAZ 3 (Kadro › Derinlik): hücre yüzeyi opak (açık temada saha üstünde yarı saydam renk okunmuyordu); hatlar satır, çakışma yok. */
describe('DepthMap', () => {
  it('taktiğe göre harita hat satırlarıyla; hücre yüzeyi opak, durum kenar ve metinle', () => {
    const { container } = render(<DepthMap squad={squad} needs={[]} formation={formation} />)
    expect([...container.querySelectorAll('[data-depth-row]')].map((r) => r.querySelectorAll('[data-depth-cell]').length)).toEqual([2, 1, 1, 1])
    const cells = [...container.querySelectorAll('[data-depth-cell]')]
    expect(cells.length).toBe(5)
    cells.forEach((c) => {
      expect(c.className).toContain('bg-[var(--sheet-bg)]')
      expect(c.className).not.toMatch(/bg-\[var\(--\w+-soft\)\]/)
    })
  })

  it('FAZ 6a-I: taktiğe göre saha Cyber-Pitch zemininde (eski yeşil çim token\'ı yok)', () => {
    const { container } = render(<DepthMap squad={squad} needs={[]} formation={formation} />)
    const field = container.querySelector('[data-depth-field]') as HTMLElement
    expect(field.getAttribute('style')).toContain('--cyber-pitch-1')
    expect(field.getAttribute('style')).not.toContain('--pitch-1')
  })

  it('FAZ 6a-B: hücre listelenen tüm mevkileri sayar (birincil + ikincil); ikincil oyuncusu olan mevki "Oyuncu yok" demez', () => {
    const wide = [
      { player: { id: 11, name: 'Ouazane', overall: 66, positions: ['RM', 'RB', 'RW'] }, onLoan: false },
      { player: { id: 12, name: 'Gutiérrez', overall: 64, positions: ['RB'] }, onLoan: false },
    ] as unknown as CareerPlayer[]
    const { container } = render(<DepthMap squad={wide} needs={[]} />)
    const cell = (pos: string) => [...container.querySelectorAll('[data-depth-cell]')].find((c) => c.querySelector('strong')?.textContent === pos)!
    expect(cell('RW').textContent).not.toContain('Oyuncu yok')
    expect(cell('RW').querySelector('[data-depth-total]')?.textContent).toBe('1')
    expect(cell('RW').textContent).toContain('0 birincil · 1 ikincil')
    expect(cell('RB').querySelector('[data-depth-total]')?.textContent).toBe('2')
    expect(cell('LW').textContent).toContain('Oyuncu yok')
    // Durum, gösterilen toplamla aynı sayıdan (RW: 0 birincil + 1 ikincil = 1, rehber 1–2 → "Yeterli", "Az" değil).
    expect(cell('RW').textContent).toContain('Yeterli')
  })

  it('FAZ 6a: taktiğe göre modda da durum gösterilen sayıdan (2 / 2 "Az" demez)', () => {
    const wide = [
      { player: { id: 21, name: 'Sol Bek', overall: 63, positions: ['LB'] }, onLoan: false },
      { player: { id: 22, name: 'Yedek', overall: 60, positions: ['CB', 'LB'] }, onLoan: false },
    ] as unknown as CareerPlayer[]
    const needs = [{ position: 'LB', starters: 1, demanding: 0, required: 2, natural: [], flex: [], state: 'thin', reason: '', coverCandidates: [] }] as never
    const { container } = render(<DepthMap squad={wide} needs={needs} />)
    const lb = [...container.querySelectorAll('[data-depth-cell]')].find((c) => c.querySelector('strong')?.textContent === 'LB')!
    expect(lb.querySelector('[data-depth-total]')?.textContent).toBe('2')
    expect(lb.textContent).toContain('Yeterli')
  })

  it('FAZ 6a: bölge özeti de kiralık gönderilenleri saymaz (hücrelerle aynı kural)', () => {
    const squadWithLoan = [
      { player: { id: 1, name: 'A', overall: 70, positions: ['CB'] }, onLoan: false },
      { player: { id: 2, name: 'B', overall: 70, positions: ['CB'] }, onLoan: true, loanedOut: true },
    ] as unknown as CareerPlayer[]
    render(<RegionSummary squad={squadWithLoan} needs={[]} />)
    expect(screen.getByText('Defans').closest('li')).toHaveTextContent('1 oyuncu')
  })
})
