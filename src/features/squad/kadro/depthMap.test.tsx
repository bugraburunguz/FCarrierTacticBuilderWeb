import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CareerPlayer, Formation } from '../../../api/types'
import { DepthMap } from './DepthMap'

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
})
