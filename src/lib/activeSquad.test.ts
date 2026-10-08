import { describe, expect, it } from 'vitest'
import type { CaptureCard, Formation } from '../api/types'
import { findFormation, mapActiveSquad } from './activeSquad'

const card = (assetId: number, position: string, rating = 80): CaptureCard =>
  ({ instanceId: assetId, assetId, name: `P${assetId}`, rating, position, positions: [position], untradeable: false, duplicate: false, pile: 'club' }) as unknown as CaptureCard

const formation = (id: string, label: string, positions: string[]): Formation => ({
  id,
  label,
  slots: positions.map((position, i) => ({ slotId: `${position}${i}`, position, group: position, defaultRole: '', x: 0, y: 0 })),
})

const formations = [formation('4-4-2', '4-4-2', ['GK', 'ST', 'ST']), formation('4-2-3-1 (2)', '4-2-3-1 (2) (LM-CAM-RM)', ['GK', 'CAM', 'ST'])]

describe('aktif kadro eşleme', () => {
  it('formasyonu ad ya da etiketle bulur', () => {
    expect(findFormation({ formation: '4-4-2', slots: [] }, formations)?.id).toBe('4-4-2')
    expect(findFormation({ formationLabel: '4-2-3-1 (2)', slots: [] }, formations)?.id).toBe('4-2-3-1 (2)')
    expect(findFormation({ formation: '3-5-2', slots: [] }, formations)).toBeUndefined()
  })

  it('kartları önce mevkiye göre, kalanları sırayla slotlara dizer', () => {
    const squad = {
      formation: '4-4-2',
      slots: [
        { index: 0, starter: true, position: 'GK', card: card(1, 'GK') },
        { index: 1, starter: true, position: 'ST', card: card(2, 'ST') },
        { index: 2, starter: true, position: 'CAM', card: card(3, 'CAM') },
        { index: 3, starter: false, position: 'ST', card: card(4, 'ST') },
      ],
    }
    const loaded = mapActiveSquad(squad, formations)
    expect(loaded.formationId).toBe('4-4-2')
    expect(Object.values(loaded.picked).map((c) => c.name).sort()).toEqual(['P1', 'P2', 'P3'])
    expect(loaded.picked.GK0.name).toBe('P1')
    expect(loaded.unplaced).toBe(0)
  })

  it('formasyon bulunamazsa yedek formasyona dizer, o da yoksa kartları yerleşmemiş sayar', () => {
    const squad = { formation: '3-5-2', slots: [{ index: 0, starter: true, position: 'GK', card: card(1, 'GK') }] }
    expect(mapActiveSquad(squad, formations, formations[0]).picked.GK0.name).toBe('P1')
    expect(mapActiveSquad(squad, formations).unplaced).toBe(1)
  })
})
