import type { AcademyPlayer, GrowthRecent } from '../../api/types'
import { YouthRow } from './YouthRow'

/** Oyuncular listesi (Altyapı ve Gelişim ortak satırlar). `recent` (GTR-b, Gelişim): oyuncu kimliğine göre son dönem değişimi. */
export function YouthList({ players, label, onOpen, selectedId, reason = false, recent }: { players: AcademyPlayer[]; label: string; onOpen: (id: number) => void; selectedId?: number; reason?: boolean; recent?: Map<number, GrowthRecent> }) {
  return (
    <ul aria-label={label} className="flex flex-col gap-2">
      {players.map((p) => (
        <li key={p.playerId}><YouthRow player={p} onOpen={onOpen} selected={p.playerId === selectedId} reason={reason} recent={recent?.get(p.playerId)} /></li>
      ))}
    </ul>
  )
}
