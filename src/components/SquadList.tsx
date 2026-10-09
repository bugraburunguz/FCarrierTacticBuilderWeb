import { Link } from 'react-router-dom'
import type { CareerPlayer, PlayerPositionAdvice } from '../api/types'
import { Pill } from './ui'

const GROUPS: { label: string; positions: string[] }[] = [
  { label: 'Kaleciler', positions: ['GK'] },
  { label: 'Defans', positions: ['CB', 'LB', 'RB'] },
  { label: 'Orta saha', positions: ['CDM', 'CM', 'CAM', 'LM', 'RM'] },
  { label: 'Hücum', positions: ['LW', 'RW', 'ST'] },
]

const ORDER = GROUPS.flatMap((g) => g.positions)

interface Props {
  squad: CareerPlayer[]
  positionAdvice: PlayerPositionAdvice[]
}

export function SquadList({ squad, positionAdvice }: Props) {
  const adviceById = new Map(positionAdvice.map((a) => [a.playerId, a]))
  const placed = new Set<number>()
  const groups = GROUPS.map((group) => {
    const players = squad
      .filter((s) => group.positions.includes(s.player.positions[0] ?? ''))
      .sort((a, b) => ORDER.indexOf(a.player.positions[0]) - ORDER.indexOf(b.player.positions[0]) || b.player.overall - a.player.overall)
    players.forEach((p) => placed.add(p.player.id))
    return { ...group, players }
  })
  const others = squad.filter((s) => !placed.has(s.player.id))
  if (others.length > 0) {
    groups.push({ label: 'Diğer', positions: [], players: others })
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            {group.label} <span className="text-muted">· {group.players.length}</span>
          </h3>
          {group.players.length === 0 ? (
            <p className="text-xs text-muted">Bu bölgede oyuncu yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="py-1 pr-2">Oyuncu</th>
                    <th className="pr-2">Yaş</th>
                    <th className="pr-2">Mevkiler</th>
                    <th className="pr-2">En iyi mevki</th>
                    <th className="pr-2 text-right">OVR</th>
                    <th className="pr-2 text-right">POT</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {group.players.map((entry) => {
                    const advice = adviceById.get(entry.player.id)
                    return (
                      <tr key={entry.player.id} className="border-t border-line">
                        <td className="py-1.5 pr-2 font-medium">
                          <Link to={`/players/${entry.player.id}`} className="hover:underline">{entry.player.name}</Link>
                        </td>
                        <td className="pr-2">{entry.player.age ?? '—'}</td>
                        <td className="pr-2 text-muted">{entry.player.positions.slice(0, 4).join(', ')}</td>
                        <td className="pr-2">
                          {advice?.bestOverallPosition ? (
                            <span title="Mevki bazlı en yüksek overall">
                              <b>{advice.bestOverallPosition}</b> <span className="text-muted">{advice.bestOverall}</span>
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="pr-2 text-right font-semibold tabular-nums">{entry.player.overall}</td>
                        <td className="pr-2 text-right tabular-nums">{entry.dynamicPotential ?? entry.player.potential ?? '—'}</td>
                        <td>
                          {entry.onLoan && <Pill tone="amber">Kiralık (bizde)</Pill>}
                          {entry.loanedOut && <Pill tone="sky">Kiralıkta (başka takımda)</Pill>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
