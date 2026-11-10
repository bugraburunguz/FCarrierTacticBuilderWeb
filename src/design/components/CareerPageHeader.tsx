import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Kariyer sayfa başlığı (FCA-3, Stitch): konum çizgisi "Kariyer › {crumb}", tek h1 (Barlow; kariyer yüzeyinde büyük harf, glass.css `.page-title`),
 * kısa alt başlık ve sağda eylemler. Kariyer seçimi üst bardadır; sayfa içinde tekrar edilmez.
 */
export function CareerPageHeader({ crumb, title, subtitle, actions }: { crumb: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-col gap-1">
        <nav aria-label="Konum">
          <ol className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            <li><Link to="/career/dashboard" className="hover:text-ink">Kariyer</Link></li>
            <li aria-hidden="true"><ChevronRight size={14} /></li>
            <li aria-current="page" className="text-accent">{crumb}</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="page-title font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">{title}</h1>
          {subtitle && <p className="text-sm text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
