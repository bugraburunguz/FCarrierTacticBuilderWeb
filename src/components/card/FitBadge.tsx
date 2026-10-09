export type FitState = 'good' | 'ok' | 'bad'

const STYLE: Record<FitState, { text: string; label: string; bg: string; fg: string }> = {
  good: { text: 'UYGUN', label: 'Rol için uygun', bg: '#2fbf71', fg: '#06210f' },
  ok: { text: 'SINIRDA', label: 'Rol için sınırda', bg: '#e6b325', fg: '#2a2000' },
  bad: { text: 'EKSİK', label: 'Rol için eksik', bg: '#e5484d', fg: '#ffffff' },
}

/** Rol uyumu rozeti: durum = renk + şekil (kesik köşe) + metin; emoji yok. `compact` yalnız yüzdeyi gösterir. */
export function FitBadge({ state, pct, compact = false, className = '' }: { state: FitState; pct?: number; compact?: boolean; className?: string }) {
  const s = STYLE[state]
  return (
    <span
      role="img"
      aria-label={`${s.label}${pct !== undefined ? `, yüzde ${pct}` : ''}`}
      className={`font-display inline-flex items-center gap-1 px-1.5 text-[11px] font-bold leading-4 ${className}`}
      style={{ background: s.bg, color: s.fg, clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
    >
      {!compact && <span>{s.text}</span>}
      {pct !== undefined && <span className="num">{pct}%</span>}
    </span>
  )
}
