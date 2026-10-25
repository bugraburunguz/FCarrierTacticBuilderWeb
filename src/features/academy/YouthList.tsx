import type { AcademyPlayer } from '../../api/types'
import { YouthRow } from './YouthRow'

/** Oyuncular listesi (Altyapı ve Gelişim ortak satırlar). */
export function YouthList({ players, label, onOpen, selectedId }: { players: AcademyPlayer[]; label: string; onOpen: (id: number) => void; selectedId?: number }) {
  return (
    <ul aria-label={label} className="flex flex-col gap-2">
      {players.map((p) => (
        <li key={p.playerId}><YouthRow player={p} onOpen={onOpen} selected={p.playerId === selectedId} /></li>
      ))}
    </ul>
  )
}
