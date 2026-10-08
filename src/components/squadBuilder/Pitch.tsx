import { PositionCard, type SlotView } from './PositionCard'

interface Props {
  slots: SlotView[]
  onPickPlayer: (slotId: string) => void
  onPickRole: (slotId: string) => void
  onRemove?: (slotId: string) => void
}

/** Dikey saha, atak yukarı (ST üstte, GK altta). */
export function Pitch({ slots, onPickPlayer, onPickRole, onRemove }: Props) {
  return (
    <div className="relative aspect-[3/3.6] overflow-hidden rounded-2xl border border-emerald-800 bg-gradient-to-b from-[#123420] to-[#0e2a1a]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 360" preserveAspectRatio="none" aria-hidden="true">
        <g fill="none" stroke="#2f5b3e" strokeWidth="1.2">
          <rect x="6" y="6" width="288" height="348" rx="10" />
          <line x1="6" y1="180" x2="294" y2="180" />
          <circle cx="150" cy="180" r="34" />
          <rect x="95" y="6" width="110" height="54" />
          <rect x="95" y="300" width="110" height="54" />
        </g>
      </svg>
      {slots.map((view) => (
        <PositionCard key={view.slotId} view={view} onPickPlayer={() => onPickPlayer(view.slotId)} onPickRole={() => onPickRole(view.slotId)} onRemove={onRemove && (() => onRemove(view.slotId))} />
      ))}
    </div>
  )
}
