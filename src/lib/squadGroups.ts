import type { CareerPlayer } from '../api/types'

/** KARIYER-UX FAZ 3.1: Kadro listesi ve kartlarında gruplama (`?grup=`). Ana mevki = ilk listelenen mevki. */
export type SquadGrouping = 'mevki' | 'hat'

export const SQUAD_GROUPINGS: { value: SquadGrouping; label: string }[] = [
  { value: 'mevki', label: 'Mevki' },
  { value: 'hat', label: 'Hat' },
]

export const parseGrouping = (value: string | null): SquadGrouping => (value === 'hat' ? 'hat' : 'mevki')

const ORDER = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST']

const NAMES: Record<string, string> = {
  GK: 'Kaleci', RB: 'Sağ bek', CB: 'Stoper', LB: 'Sol bek', CDM: 'Defansif orta saha', CM: 'Merkez orta saha',
  CAM: 'Ofansif orta saha', RM: 'Sağ orta saha', LM: 'Sol orta saha', RW: 'Sağ kanat', LW: 'Sol kanat', ST: 'Santrfor',
}

const LINES: { title: string; positions: string[] }[] = [
  { title: 'Kaleciler', positions: ['GK'] },
  { title: 'Defans', positions: ['RB', 'CB', 'LB'] },
  { title: 'Orta saha', positions: ['CDM', 'CM', 'CAM', 'RM', 'LM'] },
  { title: 'Hücum', positions: ['RW', 'LW', 'ST'] },
]

export interface SquadGroup {
  key: string
  title: string
  players: CareerPlayer[]
}

const primary = (entry: CareerPlayer) => entry.player.positions[0] ?? '—'
const rank = (position: string) => (ORDER.includes(position) ? ORDER.indexOf(position) : ORDER.length)
const potential = (entry: CareerPlayer) => entry.dynamicPotential ?? entry.player.potential ?? 0
const byRating = (a: CareerPlayer, b: CareerPlayer) => b.player.overall - a.player.overall || potential(b) - potential(a)

/** Boş grup dönmez. mevki: grup içinde OVR azalan, eşitlikte POT; hat: önce mevki sırası. Bilinmeyen mevkiler sonda. */
export function squadGroups(squad: CareerPlayer[], grouping: SquadGrouping): SquadGroup[] {
  if (grouping === 'hat') {
    const placed = new Set<number>()
    const groups = LINES.map((line) => {
      const players = squad.filter((s) => line.positions.includes(primary(s)))
        .sort((a, b) => rank(primary(a)) - rank(primary(b)) || byRating(a, b))
      players.forEach((s) => placed.add(s.player.id))
      return { key: line.title, title: line.title, players }
    })
    groups.push({ key: 'Diğer', title: 'Diğer', players: squad.filter((s) => !placed.has(s.player.id)).sort(byRating) })
    return groups.filter((g) => g.players.length > 0)
  }
  const byPosition = new Map<string, CareerPlayer[]>()
  for (const entry of squad) {
    byPosition.set(primary(entry), [...(byPosition.get(primary(entry)) ?? []), entry])
  }
  return [...byPosition.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([position, players]) => ({
      key: position,
      title: NAMES[position] ? `${position} · ${NAMES[position]}` : position,
      players: [...players].sort(byRating),
    }))
}
