import { Link } from 'react-router-dom'
import { LogoMark } from './LogoMark'

/**
 * İşaret + "FC" + gradyanlı "Assist" (`--font-display`). Ana sayfaya bağlanır; erişilebilir ad "FC Assist".
 * `markOnly`: yalnız işaret; `collapse`: dar ekranda (<640px) yalnız işaret. En küçük lockup genişliği 96 px; işaret çevresinde yüksekliğin %25'i boşluk (BRAND.md).
 */
export function LogoLockup({ size = 32, markOnly = false, collapse = false, className = '' }: { size?: number; markOnly?: boolean; collapse?: boolean; className?: string }) {
  const gap = Math.round(size * 0.25)
  return (
    <Link to="/" aria-label="FC Assist" data-brand-lockup className={`inline-flex shrink-0 items-center ${className}`} style={{ gap, padding: gap / 2 }}>
      <LogoMark size={size} />
      {!markOnly && (
        <span aria-hidden="true" className={`font-display font-bold leading-none tracking-[-0.01em] ${collapse ? 'max-sm:hidden' : ''}`} style={{ fontSize: Math.round(size * 0.8) }}>
          <span className="text-ink">FC </span>
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, var(--brand-1), var(--brand-2) 55%, var(--brand-3))' }}>Assist</span>
        </span>
      )}
    </Link>
  )
}
