import { describe, expect, it } from 'vitest'
import formations from './__fixtures__/formations.json'
import roles from './__fixtures__/roles.json'
import { buildRows, groupWidthOf, layoutPitch, markerBox, overlaps, PAWN_TOUCH } from './layout'
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

// KARIYER-UX FAZ 1: piyon işareti (Cyber-Pitch). Aynı matris; rol etiketli ve etiketsiz.
describe.each(SIZES.flatMap((s) => [{ ...s, showRole: false }, { ...s, showRole: true }]))('piyon yerleşimi — $name, rol $showRole', ({ width, height, narrow, minCard, showRole }) => {
  it.each(formations.map((f) => [f.id, f]))('%s: gruplar kesişmez, sahada kalır', (_id, formation) => {
    const layout = layoutPitch({ slots: formation.slots, width, height, narrow, minCard, marker: 'pawn', showRole })

    expect(layout.boxes).toHaveLength(formation.slots.length)
    layout.boxes.forEach((box) => {
      expect(box.cx - box.width / 2).toBeGreaterThanOrEqual(0)
      expect(box.cx + box.width / 2).toBeLessThanOrEqual(width)
      expect(box.top + box.height).toBeLessThanOrEqual(layout.fieldHeight)
    })
    layout.boxes.forEach((a, i) => layout.boxes.slice(i + 1).forEach((b) => expect(overlaps(a, b), `${a.slotId} × ${b.slotId}`).toBe(false)))
  })
})

describe('piyon işaret kutusu', () => {
  it('daire en az 32px (≥1024: 40), dokunma alanı en az 44px; kart kutusu değişmez', () => {
    expect(markerBox('pawn', 48).diameter).toBeGreaterThanOrEqual(32)
    expect(markerBox('pawn', 56).diameter).toBeGreaterThanOrEqual(40)
    expect(markerBox('pawn', 48).height).toBeGreaterThanOrEqual(PAWN_TOUCH)
    expect(markerBox('pawn', 48).width).toBeGreaterThanOrEqual(PAWN_TOUCH)
    expect(markerBox('card', 60)).toEqual({ width: 60, height: Math.round(60 * 1.39) + 12, diameter: 0 })
  })

  it('piyon sahası aynı formasyonda kart sahasından kısa (daha az kaydırma)', () => {
    const f = formations[0]
    const card = layoutPitch({ slots: f.slots, width: 330, narrow: true, minCard: 48 })
    const pawn = layoutPitch({ slots: f.slots, width: 330, narrow: true, minCard: 48, marker: 'pawn' })
    expect(pawn.fieldHeight).toBeLessThan(card.fieldHeight)
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

