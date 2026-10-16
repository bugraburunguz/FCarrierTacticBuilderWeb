const W = 68
const H = 105

/** Formasyon noktalarıyla mini saha (liste kartı): yüzde konumlar sahaya oturur, atak yukarı. Yalnız token renkleri; blur yok. */
export function MiniPitch({ slots, label, className }: { slots: { slotId: string; x: number; y: number; position: string }[]; label: string; className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={className} preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width={W} height={H} rx="3" fill="var(--pitch-1)" />
      <g fill="none" stroke="var(--pitch-line)" strokeWidth="0.8">
        <rect x="2" y="2" width={W - 4} height={H - 4} />
        <line x1="2" y1={H / 2} x2={W - 2} y2={H / 2} />
        <circle cx={W / 2} cy={H / 2} r="9" />
        <rect x="18" y="2" width="32" height="14" />
        <rect x="18" y={H - 16} width="32" height="14" />
      </g>
      {slots.map((s) => (
        <circle key={s.slotId} cx={(s.x / 100) * W} cy={(s.y / 100) * H} r="3.4" fill={s.position === 'GK' ? 'var(--ink-2)' : 'var(--accent)'} stroke="var(--pitch-2)" strokeWidth="0.8" />
      ))}
    </svg>
  )
}
