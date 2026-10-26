import type { AcademyPlayer } from '../../api/types'
import { YouthRow } from './YouthRow'

/** Oyuncular listesi (Altyapı ve Gelişim ortak satırlar). */
export function YouthList({ players, label, onOpen, selectedId, reason = false }: { players: AcademyPlayer[]; label: string; onOpen: (id: number) => void; selectedId?: number; reason?: boolean }) {
  return (
    <ul aria-label={label} className="flex flex-col gap-2">
      {players.map((p) => (
        <li key={p.playerId}><YouthRow player={p} onOpen={onOpen} selected={p.playerId === selectedId} reason={reason} /></li>
      ))}
    </ul>
  )
}
