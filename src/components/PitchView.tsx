import type { FormationSlot, WeaponState } from '../api/types'

interface PitchSlotInfo {
  title?: string
  subtitle?: string
  badge?: WeaponState
}

interface Props {
  slots: FormationSlot[]
  selected?: string
  onSelect?: (slotId: string) => void
  info?: Record<string, PitchSlotInfo>
}

const RING: Record<WeaponState, string> = { GREEN: '#22c55e', YELLOW: '#f59e0b', RED: '#ef4444' }

export function PitchView({ slots, selected, onSelect, info = {} }: Props) {
  return (
    <svg viewBox="0 0 100 110" role="group" aria-label="Taktik sahası" className="w-full rounded-xl bg-pitch shadow-inner">
      <g stroke="#ffffff55" strokeWidth="0.4" fill="none">
        <rect x="3" y="3" width="94" height="104" />
        <line x1="3" y1="55" x2="97" y2="55" />
        <circle cx="50" cy="55" r="9" />
        <rect x="26" y="3" width="48" height="16" />
        <rect x="26" y="91" width="48" height="16" />
      </g>
      {slots.map((slot) => {
        const x = slot.x
        const y = 6 + (slot.y / 100) * 98
        const entry = info[slot.slotId]
        const isSelected = selected === slot.slotId
        return (
          <g
            key={slot.slotId}
            transform={`translate(${x} ${y})`}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={`${slot.slotId}${entry?.title ? ` — ${entry.title}` : ''}`}
            aria-pressed={onSelect ? isSelected : undefined}
            onClick={() => onSelect?.(slot.slotId)}
            onKeyDown={(e) => {
              if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onSelect(slot.slotId)
              }
            }}
            className={onSelect ? 'cursor-pointer' : undefined}
          >
            <circle r="4.6" fill={isSelected ? '#fde047' : '#0f172a'} stroke={entry?.badge ? RING[entry.badge] : '#ffffffaa'} strokeWidth={entry?.badge ? 1.2 : 0.6} />
            <text textAnchor="middle" y="1.3" fontSize="3.4" fontWeight="700" fill={isSelected ? '#0f172a' : '#ffffff'}>
              {slot.position}
            </text>
            {entry?.title && (
              <text textAnchor="middle" y="9.4" fontSize="2.8" fill="#ffffff" stroke="#00000066" strokeWidth="0.5" paintOrder="stroke">
                {entry.title.length > 14 ? `${entry.title.slice(0, 13)}…` : entry.title}
              </text>
            )}
            {entry?.subtitle && (
              <text textAnchor="middle" y="12.6" fontSize="2.4" fill="#e2e8f0" stroke="#00000066" strokeWidth="0.4" paintOrder="stroke">
                {entry.subtitle}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
