import { describe, expect, it } from 'vitest'
import formations from './__fixtures__/formations.json'
import roles from './__fixtures__/roles.json'
import { buildRows, groupWidthOf, layoutPitch, overlaps } from './layout'
import { SHORT_ROLE_MAX_CHARS, fitRoleName, shortRoleLabel } from './shortRole'

// Q17 (11 §8): slot gruplarının sınır kutuları hiçbir formasyonda ve boyutta kesişmez.
const SIZES = [
  { name: '375', width: 330, height: undefined, narrow: true },
  { name: '768', width: 700, height: undefined, narrow: false },
  { name: '1280×800', width: 600, height: 630, narrow: false },
]

describe.each(SIZES)('saha yerleşimi — $name', ({ width, height, narrow }) => {
  it.each(formations.map((f) => [f.id, f]))('%s: gruplar kesişmez, sahada kalır', (_id, formation) => {
    const layout = layoutPitch({ slots: formation.slots, width, height, narrow })

    expect(layout.boxes).toHaveLength(formation.slots.length)
    layout.boxes.forEach((box) => {
      expect(box.cx - box.width / 2).toBeGreaterThanOrEqual(0)
      expect(box.cx + box.width / 2).toBeLessThanOrEqual(width)
      expect(box.top).toBeGreaterThanOrEqual(0)
      expect(box.top + box.height).toBeLessThanOrEqual(layout.fieldHeight)
    })
    layout.boxes.forEach((a, i) => layout.boxes.slice(i + 1).forEach((b) => expect(overlaps(a, b), `${a.slotId} × ${b.slotId}`).toBe(false)))
  })

  if (height !== undefined) {
    it('1280×800: tüm formasyonlar scroll gerektirmeden sığar, kart ≥ 40px', () => {
      const bad = formations.filter((f) => !layoutPitch({ slots: f.slots, width, height, narrow }).fits).map((f) => f.id)
      expect(bad).toEqual([])
    })
  }
})

describe('rol etiketi kısa formu (375)', () => {
  it('tüm rol adı/odak çiftleri tek satırlık sınıra sığar', () => {
    const labels = roles.map((r) => shortRoleLabel(`${r.name.replace(/\s*\(.*\)\s*$/, '')} · ${r.focus}`))
    labels.forEach((l) => expect(l.length, l).toBeLessThanOrEqual(SHORT_ROLE_MAX_CHARS))
    expect(shortRoleLabel('Advanced Forward · Attack')).toBe('Adv. Fwd · Atk')
  })
})

describe('bant kuralları', () => {
  it('kaleci kendi bandında kalır', () => {
    formations.forEach((f) => {
      const gk = f.slots.find((s) => s.position === 'GK')!
      const rows = buildRows(f.slots, groupWidthOf(50, 'two'), 600)
      expect(rows.find((r) => r.some((s) => s.slotId === gk.slotId))).toHaveLength(1)
    })
  })
})

describe('iki satırlı etiket (masaüstü/tablet)', () => {
  it('en uzun rol adı bile tek satıra sığar', () => {
    const longest = Math.max(...roles.map((r) => fitRoleName(r.name.replace(/\s*\(.*\)\s*$/, '')).length))
    expect(longest).toBeLessThanOrEqual(14)
  })
})
