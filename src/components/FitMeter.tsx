import type { WeaponState } from '../api/types'
import { toneOf, type FitTone } from '../lib/fitTone'

const COLORS: Record<FitTone, string> = { GREEN: '#2e9b52', YELLOW: '#d0a022', RED: '#c0392b', NEUTRAL: 'currentColor' }
const LABELS: Record<FitTone, string> = { GREEN: 'İyi', YELLOW: 'Dikkat', RED: 'Zayıf', NEUTRAL: 'Seviyesinde' }

interface Props {
  score: number
  badge?: WeaponState | null
  size?: number
}

export function FitMeter({ score, badge, size = 40 }: Props) {
  const tone = toneOf(badge)
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const label = `Uyum %${Math.round(clamped)} (${LABELS[tone]})`
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} title={label} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(circumference * clamped) / 100} ${circumference}`}
          className="transition-[stroke-dasharray] duration-200 ease-out"
        />
      </svg>
      <span className="absolute text-[11px] font-bold tabular-nums">{Math.round(clamped)}</span>
    </span>
  )
}
