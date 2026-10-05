import type { CareerPlayer } from '../api/types'

export const POSITION_ORDER = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST']

export const POSITION_LABELS: Record<string, string> = {
  GK: 'Kaleciler',
  CB: 'Stoperler',
  LB: 'Sol bekler',
  RB: 'Sağ bekler',
  LWB: 'Sol kanat bekler',
  RWB: 'Sağ kanat bekler',
  CDM: 'Defansif orta saha',
  CM: 'Merkez orta saha',
  CAM: 'Ofansif orta saha',
  LM: 'Sol orta saha',
  RM: 'Sağ orta saha',
  LW: 'Sol kanatlar',
  RW: 'Sağ kanatlar',
  CF: 'Santrfor (CF)',
  ST: 'Santrforlar',
}

const EQUIVALENTS: Record<string, string[]> = {
  LB: ['LWB'], LWB: ['LB'], RB: ['RWB'], RWB: ['RB'],
  LM: ['LW'], LW: ['LM'], RM: ['RW'], RW: ['RM'],
  ST: ['CF'], CF: ['ST'],
}

/** Bir slotta oynayabilecek mevkiler: slotun kendisi + eşdeğerleri. Kaleci slotunda yalnızca GK. */
export function compatiblePositions(slotPosition: string): string[] {
  return [slotPosition, ...(EQUIVALENTS[slotPosition] ?? [])]
}

export function canPlaySlot(positions: string[], slotPosition: string): boolean {
  const accepted = compatiblePositions(slotPosition)
  return positions.some((p) => accepted.includes(p))
}

export function primaryPosition(positions: string[]): string {
  return positions[0] ?? '—'
}

export interface PositionGroup {
  position: string
  label: string
  players: CareerPlayer[]
}

export function groupByPrimaryPosition(squad: CareerPlayer[]): PositionGroup[] {
  const groups = new Map<string, CareerPlayer[]>()
  for (const entry of squad) {
    const position = primaryPosition(entry.player.positions)
    groups.set(position, [...(groups.get(position) ?? []), entry])
  }
  const rank = (p: string) => (POSITION_ORDER.includes(p) ? POSITION_ORDER.indexOf(p) : POSITION_ORDER.length)
  return [...groups.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([position, players]) => ({
      position,
      label: POSITION_LABELS[position] ?? position,
      players: [...players].sort((a, b) => b.player.overall - a.player.overall),
    }))
}

// Kabaca yönlendirme amaçlı derinlik rehberi (kadro büyüklüğüne göre değişebilir): [en az, en çok].
export const DEPTH_GUIDE: Record<string, [number, number]> = {
  GK: [2, 3], CB: [3, 5], LB: [1, 2], RB: [1, 2], LWB: [1, 2], RWB: [1, 2],
  CDM: [2, 3], CM: [3, 4], CAM: [1, 2], LM: [1, 2], RM: [1, 2], LW: [1, 2], RW: [1, 2], CF: [1, 2], ST: [2, 3],
}

export type DepthState = 'thin' | 'ok' | 'dense'

export function depthState(position: string, count: number): DepthState {
  const [min, max] = DEPTH_GUIDE[position] ?? [1, 3]
  if (count < min) {
    return 'thin'
  }
  return count > max ? 'dense' : 'ok'
}
