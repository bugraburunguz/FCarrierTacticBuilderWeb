import type { ReactNode } from 'react'

/** v3 sayfa başlığı (V3-07c): tek h1 (26/32px display), isteğe bağlı kısa alt metin ve sağda eylemler. Açıklama paragrafı yerine HelpPopover. */
export function PageHeader({ title, subtitle, actions, help }: { title: string; subtitle?: ReactNode; actions?: ReactNode; help?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="flex items-center gap-1.5 font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">
          {title}
          {help}
        </h1>
        {subtitle && <p className="text-sm text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
