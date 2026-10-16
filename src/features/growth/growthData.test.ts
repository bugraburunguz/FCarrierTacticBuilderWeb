import { describe, expect, it } from 'vitest'
import type { CareerPlayer, HistoryPoint, SnapshotDiffRow } from '../../api/types'
import { alerts, isPlateau } from '../../lib/deskRules'
import { historySeries, movers, seasonStartRange } from './growthData'

const point = (snapshotId: number, overall: number, potential: number, gameDate?: string): HistoryPoint => ({ snapshotId, takenAt: `2026-10-0${snapshotId}T10:00:00Z`, overall, potential, gameDate })

describe('Gelişim grafiği verisi (V3-06e)', () => {
  it('her noktada oyun tarihi varsa x = oyun tarihi (gün), eksen başlığı "Oyun tarihi"', () => {
    const s = historySeries([point(1, 60, 75, '2027-01-15'), point(2, 63, 75, '2027-03-16'), point(3, 66, 76, '2027-07-14')])
    expect(s.axis).toBe('gameDate')
    expect(s.axisTitle).toBe('Oyun tarihi')
    expect(s.points.map((p) => p.x)).toEqual([0, 60, 180])
    expect(s.points.map((p) => p.label)).toEqual(['15.01.2027', '16.03.2027', '14.07.2027'])
    expect(s.points[2]).toMatchObject({ ovr: 66, pot: 76 })
  })

  it('oyun tarihi eksikse x = içe aktarma sırası, eksen başlığı buna göre', () => {
    const s = historySeries([point(1, 60, 75, '2027-01-15'), point(2, 63, 75)])
    expect(s.axis).toBe('order')
    expect(s.axisTitle).toBe('İçe aktarma sırası')
    expect(s.points.map((p) => [p.x, p.label])).toEqual([[1, '1. içe aktarma'], [2, '2. içe aktarma']])
  })

  it('yükselenler fark azalan, düşenler fark artan (en çok düşen başta); yalnız değişen OVR', () => {
    const rows: SnapshotDiffRow[] = [
      { playerId: 1, name: 'A', kind: 'CHANGED', overallFrom: 60, overallTo: 64 },
      { playerId: 2, name: 'B', kind: 'CHANGED', overallFrom: 70, overallTo: 68 },
      { playerId: 3, name: 'C', kind: 'CHANGED', overallFrom: 55, overallTo: 61 },
      { playerId: 4, name: 'D', kind: 'CHANGED', overallFrom: 80, overallTo: 75 },
      { playerId: 5, name: 'E', kind: 'NEW', overallTo: 70 },
      { playerId: 6, name: 'F', kind: 'CHANGED', overallFrom: 66, overallTo: 66, potentialFrom: 70, potentialTo: 72 },
    ]
    const m = movers(rows)
    expect(m.risers.map((r) => [r.name, r.delta])).toEqual([['C', 6], ['A', 4]])
    expect(m.fallers.map((r) => [r.name, r.delta])).toEqual([['D', -5], ['B', -2]])
  })

  it('sezon başı → şimdi: son sezonun ilk içe aktarması ile son içe aktarma; tek sezon ya da sezon verisi yoksa yok', () => {
    const snaps = [{ id: 5, season: 2, takenAt: '', source: 'IMPORT' as const, playerCount: 1 }, { id: 4, season: 2, takenAt: '', source: 'IMPORT' as const, playerCount: 1 },
      { id: 3, season: 2, takenAt: '', source: 'IMPORT' as const, playerCount: 1 }, { id: 2, season: 1, takenAt: '', source: 'IMPORT' as const, playerCount: 1 }]
    expect(seasonStartRange(snaps)).toEqual({ from: 3, to: 5 })
    expect(seasonStartRange(snaps.map((s) => ({ ...s, season: undefined })))).toBeUndefined()
    expect(seasonStartRange(snaps.slice(0, 1))).toBeUndefined()
  })

  it('plato kuralı tek kaynak: Gelişim ve Masa uyarısı aynı deskRules.isPlateau', () => {
    const young = { player: { id: 9, name: 'Genç', overall: 75, potential: 75, age: 21, positions: ['CM'], valuationEstimated: false }, onLoan: false } as CareerPlayer
    const old = { ...young, player: { ...young.player, id: 10, name: 'Yaşlı', age: 27 } }
    expect(isPlateau(young.player)).toBe(true)
    expect(isPlateau(old.player)).toBe(false)
    const plateauAlerts = alerts({ squad: [young, old], slots: [], tags: {}, diffRows: [] }).filter((a) => a.kind === 'PLATEAU')
    expect(plateauAlerts.map((a) => a.text)).toEqual([expect.stringContaining('Genç')])
  })
})
