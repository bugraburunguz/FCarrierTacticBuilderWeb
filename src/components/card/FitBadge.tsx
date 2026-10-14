import { FIT_STATE_TEXT, TAILORED_BADGE } from '../../lib/fitLabels'

export type FitState = 'good' | 'ok' | 'bad' | 'neutral'

const COLORS: Record<FitState, { bg: string; fg: string }> = {
  good: { bg: '#2fbf71', fg: '#06210f' },
  ok: { bg: '#e6b325', fg: '#2a2000' },
  bad: { bg: '#e5484d', fg: '#ffffff' },
  neutral: { bg: 'transparent', fg: 'inherit' },
}

/** Rol uyumu rozeti: durum = renk + şekil (kesik köşe) + metin; emoji yok. `compact` yalnız yüzdeyi gösterir. */
export function FitBadge({ state, pct, compact = false, tailored = false, className = '' }: { state: FitState; pct?: number; compact?: boolean; tailored?: boolean; className?: string }) {
  const s = { ...COLORS[state], ...(tailored ? TAILORED_BADGE : FIT_STATE_TEXT[state]) }
  return (
    <span
      role="img"
      aria-label={`${s.label}${pct !== undefined ? `, yüzde ${pct}` : ''}`}
      className={`font-display inline-flex items-center gap-1 px-1.5 text-[11px] font-bold leading-4 ${className}`}
      style={{ background: s.bg, color: s.fg, boxShadow: state === 'neutral' ? 'inset 0 0 0 1px currentColor' : undefined, clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
    >
      {!compact && <span>{s.text}</span>}
      {pct !== undefined && <span className="num">{pct}%</span>}
    </span>
  )
}
