import { describe, expect, it } from 'vitest'
import formations from './__fixtures__/formations.json'
import roles from './__fixtures__/roles.json'
import { buildRows, groupWidthOf, layoutPitch, overlaps } from './layout'
import { SHORT_ROLE_MAX_CHARS, shortRoleLabel } from './shortRole'

// Q17 (11 §8): slot gruplarının sınır kutuları hiçbir formasyonda ve boyutta kesişmez.
const SIZES = [
  { name: '375', width: 330, height: undefined, narrow: true, minCard: 48 },
  { name: '768', width: 700, height: undefined, narrow: false, minCard: 52 },
  { name: '1280×800', width: 700, height: 640, narrow: false, minCard: 56 },
  { name: '1440×900', width: 800, height: 740, narrow: false, minCard: 56 },
]

describe.each(SIZES)('saha yerleşimi — $name', ({ width, height, narrow, minCard }) => {
  it.each(formations.map((f) => [f.id, f]))('%s: gruplar kesişmez, sahada kalır', (_id, formation) => {
    const layout = layoutPitch({ slots: formation.slots, width, height, narrow, minCard })

    expect(layout.boxes).toHaveLength(formation.slots.length)
    layout.boxes.forEach((box) => {
      expect(box.cx - box.width / 2).toBeGreaterThanOrEqual(0)
      expect(box.cx + box.width / 2).toBeLessThanOrEqual(width)
      expect(box.top).toBeGreaterThanOrEqual(0)
      expect(box.top + box.height).toBeLessThanOrEqual(layout.fieldHeight)
    })
    layout.boxes.forEach((a, i) => layout.boxes.slice(i + 1).forEach((b) => expect(overlaps(a, b), `${a.slotId} × ${b.slotId}`).toBe(false)))
  })

  it('okunabilirlik (Q18): kart asla minimumun altına inmez; sığmazsa saha uzar', () => {
    formations.forEach((f) => {
      const layout = layoutPitch({ slots: f.slots, width, height, narrow, minCard })
      expect(layout.cardWidth, f.id).toBeGreaterThanOrEqual(minCard)
      if (!layout.fits) {
        expect(layout.fieldHeight, f.id).toBeGreaterThan(height ?? 0)
      }
    })
  })
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
      const rows = buildRows(f.slots, groupWidthOf(56, 'full'), 600)
      expect(rows.find((r) => r.some((s) => s.slotId === gk.slotId))).toHaveLength(1)
    })
  })
})

