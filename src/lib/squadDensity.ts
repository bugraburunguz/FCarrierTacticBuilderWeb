import type { CareerPlayer, FormationSlot } from '../api/types'
import type { PositionNeed } from './depth'
import { DEPTH_GUIDE, depthState, primaryPosition, type DepthState } from './positions'

/**
 * Mevki yoğunluğu hesabı (V3-07b; components/SquadDensity'den çıkarıldı): hücreler (asıl + alternatif mevki, sol/sağ ayak), taktiğe göre
 * ihtiyaç ya da genel derinlik rehberi, bölge özeti. v2 SquadDensity ve v3 DepthPanel aynı hesabı kullanır.
 */
export interface CellSpec {
  key: string
  base: string
  side?: 'L' | 'R'
  multi?: boolean
}

const spec = (key: string, base: string, side?: 'L' | 'R'): CellSpec => ({ key, base, side })

export const ROWS: CellSpec[][] = [
  [spec('LW', 'LW'), spec('LST', 'ST', 'L'), spec('ST', 'ST'), spec('RST', 'ST', 'R'), spec('RW', 'RW')],
  [spec('LCAM', 'CAM', 'L'), spec('CAM', 'CAM'), spec('RCAM', 'CAM', 'R')],
  [spec('LM', 'LM'), spec('LCM', 'CM', 'L'), spec('CM', 'CM'), spec('RCM', 'CM', 'R'), spec('RM', 'RM')],
  [spec('LCDM', 'CDM', 'L'), spec('CDM', 'CDM'), spec('RCDM', 'CDM', 'R')],
  [spec('LB', 'LB'), spec('LCB', 'CB', 'L'), spec('RCB', 'CB', 'R'), spec('RB', 'RB')],
  [spec('GK', 'GK')],
]

export const SIDED_LABELS: Record<string, string> = {
  LST: 'Sol santrfor', RST: 'Sağ santrfor', LCAM: 'Sol ofansif OS', RCAM: 'Sağ ofansif OS',
  LCM: 'Sol merkez OS', RCM: 'Sağ merkez OS', LCDM: 'Sol defansif OS', RCDM: 'Sağ defansif OS',
  LCB: 'Sol stoper', RCB: 'Sağ stoper',
}

const SIDED_GUIDE: [number, number] = [1, 2]
const TWO_FOOTED_WEAK_FOOT = 4

export const REGIONS: { label: string; positions: string[] }[] = [
  { label: 'Hücum', positions: ['LW', 'ST', 'RW'] },
  { label: 'Orta saha', positions: ['LM', 'CAM', 'CM', 'CDM', 'RM'] },
  { label: 'Defans', positions: ['LB', 'CB', 'RB'] },
  { label: 'Kaleci', positions: ['GK'] },
]

export const average = (values: number[]) => (values.length === 0 ? undefined : values.reduce((a, b) => a + b, 0) / values.length)

export interface Cell {
  position: string
  base: string
  natural: CareerPlayer[]
  flex: CareerPlayer[]
  state: DepthState
  best?: number
  avg?: number
  required?: number
  guide: [number, number]
}

const SIDED_BASES = ['CB', 'CDM', 'CM', 'CAM', 'ST']

export function slotSpec(slot: FormationSlot, slots: FormationSlot[]): CellSpec {
  if (!SIDED_BASES.includes(slot.position)) {
    return spec(slot.slotId, slot.position)
  }
  const peers = slots.filter((s) => s.position === slot.position).sort((a, b) => a.x - b.x)
  if (peers.length < 2) {
    return spec(slot.slotId, slot.position)
  }
  if (peers[0].slotId === slot.slotId) {
    return spec(slot.slotId, slot.position, 'L')
  }
  if (peers[peers.length - 1].slotId === slot.slotId) {
    return spec(slot.slotId, slot.position, 'R')
  }
  return { key: slot.slotId, base: slot.position, multi: true }
}

const BASE_POSITIONS = [...new Set([...ROWS.flat().map((c) => c.base), ...['GK', 'LB', 'RB', 'LM', 'RM', 'LW', 'RW', 'CAM', 'CDM', 'CM', 'CB', 'ST']])]

export const isTwoFooted = (p: CareerPlayer) => (p.player.weakFoot ?? 0) >= TWO_FOOTED_WEAK_FOOT

function playsSide(p: CareerPlayer, side: 'L' | 'R'): boolean {
  if (isTwoFooted(p)) {
    return true
  }
  return p.player.preferredFoot === (side === 'L' ? 'Left' : 'Right')
}

function summarize(key: string, base: string, natural: CareerPlayer[], flex: CareerPlayer[], state: DepthState, guide: [number, number], required?: number): Cell {
  const overalls = natural.map((s) => s.player.overall)
  return { position: key, base, natural, flex, state, guide, required, best: overalls.length ? Math.max(...overalls) : undefined, avg: average(overalls) }
}

export function buildBaseCells(squad: CareerPlayer[], needs: PositionNeed[]): Map<string, Cell> {
  const needByPosition = new Map(needs.map((n) => [n.position, n]))
  const cells = new Map<string, Cell>()
  for (const position of BASE_POSITIONS) {
    const natural = squad.filter((s) => primaryPosition(s.player.positions) === position)
    const flex = squad.filter((s) => primaryPosition(s.player.positions) !== position && s.player.positions.includes(position))
    const need = needByPosition.get(position)
    cells.set(position, summarize(position, position, natural, flex, need ? need.state : depthState(position, natural.length), DEPTH_GUIDE[position] ?? [1, 3], need?.required))
  }
  return cells
}

export function buildCell(spec: CellSpec, base: Map<string, Cell>): Cell {
  const baseCell = base.get(spec.base)!
  if (!spec.side && spec.multi) {
    const [min, max] = SIDED_GUIDE
    const count = baseCell.natural.length
    return { ...baseCell, position: spec.key, guide: SIDED_GUIDE, required: undefined, state: count < min ? 'thin' : count > max ? 'dense' : 'ok' }
  }
  if (!spec.side) {
    return { ...baseCell, position: spec.key }
  }
  const side = spec.side
  const natural = baseCell.natural.filter((p) => playsSide(p, side))
  const flex = baseCell.flex.filter((p) => playsSide(p, side))
  const [min, max] = SIDED_GUIDE
  const state: DepthState = natural.length < min ? 'thin' : natural.length > max ? 'dense' : 'ok'
  return summarize(spec.key, spec.base, natural, flex, state, SIDED_GUIDE)
}

/** Bölge özeti: oyuncu sayısı, ort. overall/yaş, az ve çok olan mevkiler. */
export function regionSummaries(squad: CareerPlayer[], cells: Map<string, Cell>) {
  return REGIONS.map((region) => {
    const players = squad.filter((s) => region.positions.includes(primaryPosition(s.player.positions)))
    const regionCells = region.positions.map((p) => cells.get(p)!).filter(Boolean)
    return {
      label: region.label,
      count: players.length,
      avgOverall: average(players.map((p) => p.player.overall)),
      avgAge: average(players.flatMap((p) => (p.player.age ? [p.player.age] : []))),
      thin: regionCells.filter((c) => c.state === 'thin').map((c) => c.position),
      dense: regionCells.filter((c) => c.state === 'dense').map((c) => c.position),
    }
  })
}

const GK_TOP = 92
const FIELD_TOP = 8
const FIELD_BOTTOM = 72

/** Kaleci sabit altta; diğerleri taktikteki dikey sıralarını koruyarak 8–72% arasına yayılır (kartlar üst üste binmesin). */
export function slotTop(slot: FormationSlot, slots: FormationSlot[]): number {
  if (slot.position === 'GK') {
    return GK_TOP
  }
  const ys = slots.filter((s) => s.position !== 'GK').map((s) => s.y)
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  return max === min ? 40 : FIELD_TOP + ((slot.y - min) / (max - min)) * (FIELD_BOTTOM - FIELD_TOP)
}

export function footMark(p: CareerPlayer): string {
  if (isTwoFooted(p)) {
    return 'iki ayaklı'
  }
  return p.player.preferredFoot === 'Left' ? 'sol ayak' : 'sağ ayak'
}

/** Hücre ipucu: asıl mevkidekiler (overall'a göre) + alternatifler, ayak bilgisiyle. */
export function cellTitle(cell: Cell): string {
  const names = [...cell.natural].sort((a, b) => b.player.overall - a.player.overall)
  return [
    ...names.map((s) => `${s.player.name} (${s.player.overall}) · ${footMark(s)}`),
    ...cell.flex.map((s) => `${s.player.name} (${s.player.overall}) · ${footMark(s)} — alternatif`),
  ].join(String.fromCharCode(10))
}
