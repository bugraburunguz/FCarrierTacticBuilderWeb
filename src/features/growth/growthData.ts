import type { CareerSnapshot, HistoryPoint, SnapshotDiffRow } from '../../api/types'
import { daysBetween } from '../../lib/contract'

/** Gelişim (V3-06e) saf veri dönüşümleri: grafik serisi, yükselen/düşen, sezon başı aralığı. Yeni puanlama ya da projeksiyon yok. */

export interface SeriesPoint {
  snapshotId: number
  /** Oyun tarihi ekseninde ilk noktadan gün; sıra ekseninde 1'den başlayan sıra. */
  x: number
  label: string
  ovr: number
  pot: number
}

export interface HistorySeries {
  axis: 'gameDate' | 'order'
  axisTitle: string
  points: SeriesPoint[]
}

const dateText = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Eksen kararı: her noktada kayıt anındaki oyun tarihi varsa x = oyun tarihi (gün), yoksa x = içe aktarma sırası (karışık ölçek yok). */
export function historySeries(points: HistoryPoint[]): HistorySeries {
  const dated = points.length > 0 && points.every((p) => p.gameDate)
  if (dated) {
    const first = points[0].gameDate!
    return { axis: 'gameDate', axisTitle: 'Oyun tarihi', points: points.map((p) => ({ snapshotId: p.snapshotId, x: daysBetween(first, p.gameDate)!, label: dateText(p.gameDate!), ovr: p.overall, pot: p.potential })) }
  }
  return { axis: 'order', axisTitle: 'İçe aktarma sırası', points: points.map((p, i) => ({ snapshotId: p.snapshotId, x: i + 1, label: `${i + 1}. içe aktarma`, ovr: p.overall, pot: p.potential })) }
}

export interface Mover {
  playerId: number
  name: string
  from: number
  to: number
  delta: number
}

/** İki içe aktarma arası OVR farkı (snapshotDiff): yükselenler fark azalan, düşenler en çok düşen başta; eşitlikte ada göre. Yalnız OVR'ı değişen kadro satırları. */
export function movers(rows: SnapshotDiffRow[]): { risers: Mover[]; fallers: Mover[] } {
  const changed = rows.flatMap((r) => (r.kind === 'CHANGED' && r.overallFrom !== undefined && r.overallTo !== undefined && r.overallFrom !== r.overallTo
    ? [{ playerId: r.playerId, name: r.name, from: r.overallFrom, to: r.overallTo, delta: r.overallTo - r.overallFrom }] : []))
  const byName = (a: Mover, b: Mover) => a.name.localeCompare(b.name, 'tr')
  return {
    risers: changed.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta || byName(a, b)),
    fallers: changed.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta || byName(a, b)),
  }
}

/** "Sezon başı → şimdi": son içe aktarmanın sezonundaki ilk içe aktarma ile son içe aktarma; sezon verisi yoksa ya da aralık tek kayıtsa yok. */
export function seasonStartRange(snapshots: CareerSnapshot[]): { from: number; to: number } | undefined {
  const sorted = [...snapshots].sort((a, b) => a.id - b.id)
  const last = sorted[sorted.length - 1]
  if (!last || last.season === undefined || last.season === null) {
    return undefined
  }
  const first = sorted.find((s) => s.season === last.season)!
  return first.id === last.id ? undefined : { from: first.id, to: last.id }
}
