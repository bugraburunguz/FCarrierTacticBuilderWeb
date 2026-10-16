import { useId } from 'react'

const STROKE = ['#38bdf8', '#6366f1', '#a855f7'] as const

/**
 * FC Assist işareti: cam altıgen + taktik işareti (X, O ve ok). Kaynak: docs/brand/source/mark-dark.svg / mark-light.svg.
 * Tek bileşen iki temayı token'larla taşır (`--mark-f1/f2` dolgu, `--mark-ink` çizgi); çerçeve gradyanı iki temada da aynıdır.
 * Yeniden renklendirme, gölge ya da bozma yok (docs/brand/BRAND.md). En küçük boyut 16 px.
 */
export function LogoMark({ size = 32, title, className }: { size?: number; title?: string; className?: string }) {
  const uid = useId()
  const g = `${uid}-g`
  const f = `${uid}-f`
  const ink = { stroke: 'var(--mark-ink, #ffffff)' }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false" className={className}>
      <defs>
        <linearGradient id={g} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={STROKE[0]} />
          <stop offset=".55" stopColor={STROKE[1]} />
          <stop offset="1" stopColor={STROKE[2]} />
        </linearGradient>
        <linearGradient id={f} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--mark-f1, #1e293b)' }} />
          <stop offset="1" style={{ stopColor: 'var(--mark-f2, #312e81)' }} />
        </linearGradient>
      </defs>
      <path d="M32 4 55.5 17.5v29L32 60 8.5 46.5v-29Z" fill={`url(#${f})`} stroke={`url(#${g})`} strokeWidth="3.5" strokeLinejoin="round" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" style={ink}>
        <path d="M19 19.5l6 6m0-6-6 6" strokeWidth="3" />
        <circle cx="22" cy="43" r="4.3" strokeWidth="3" />
        <path d="M26.5 39.5C33 37 39 32 42 25" strokeWidth="3" strokeDasharray="4.2 3.6" />
      </g>
      <path d="M45.5 17.5 46 29.2 37.6 25.4Z" strokeWidth="1.6" strokeLinejoin="round" style={{ fill: 'var(--mark-ink, #ffffff)', ...ink }} />
    </svg>
  )
}
