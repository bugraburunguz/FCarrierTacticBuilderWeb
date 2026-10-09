import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ApiError } from '../api/client'
import type { WeaponState } from '../api/types'

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ')

/** Panel (02 §3.4 Section): gölgesiz, tutarlı 6px köşe, ince çizgi; başlık kondanse ekran fontunda. Tıklanmadığı için hover efekti yok. */
export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-md border border-line bg-surface p-4 text-ink', className)}>
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2">
          <h2 className="font-display text-lg font-bold uppercase leading-tight tracking-wide">{title}</h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

/** KPI hücresi: büyük sayı + küçük etiket (02 §3.4 Stat). */
export function Stat({ label, value, suffix, tone }: { label: string; value: ReactNode; suffix?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="flex min-w-[96px] flex-1 flex-col bg-surface px-3 py-2">
      <span className="font-display text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className={cx('num text-2xl font-medium leading-tight', tone === 'good' && 'text-good', tone === 'bad' && 'text-danger')}>{value}</span>
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </span>
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

export function Button({ variant = 'primary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-accent-bg text-on-accent hover:opacity-90 disabled:opacity-40',
    secondary: 'border border-line bg-surface text-ink hover:bg-surface-2 disabled:opacity-40',
    danger: 'bg-danger text-surface hover:opacity-90 disabled:opacity-40',
    ghost: 'text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40',
  }
  return (
    <button
      type="button"
      {...props}
      className={cx('inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed', styles[variant], className)}
    />
  )
}

const fieldStyle = 'w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldStyle, props.className)} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(fieldStyle, props.className)} />
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-muted">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  )
}

export function Spinner({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </div>
  )
}

/** Yükleme iskeleti: gerçek düzeni taklit eden gri bloklar (UX-06). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-md bg-surface-2', className)} />
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) {
    return null
  }
  const network = error instanceof ApiError && error.code === 'client.network'
  const message = error instanceof ApiError ? error.message : 'Beklenmeyen bir hata oluştu.'
  return (
    <div role="alert" className="rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
      {network && <span className="ml-1 text-muted">(ağ bağlantını kontrol et)</span>}
    </div>
  )
}

type Tone = 'slate' | 'emerald' | 'amber' | 'rose' | 'sky'

/** Küçük etiket. Renk tek başına anlam taşımaz: metin her zaman vardır. */
export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    slate: 'bg-surface-2 text-ink',
    emerald: 'bg-good-soft text-good',
    amber: 'bg-code-soft text-code',
    rose: 'bg-danger-soft text-danger',
    sky: 'bg-info-soft text-info',
  }
  return <span className={cx('inline-block rounded-sm px-1.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}

const DOT = {
  GREEN: { label: 'Uygun', color: '#2fbf71', shape: 'M5 1 A4 4 0 1 1 4.99 1 Z' },
  YELLOW: { label: 'Zayıf yön var', color: '#e6b325', shape: 'M5 1 L9 9 L1 9 Z' },
  RED: { label: 'Rolü oynayamaz', color: '#e5484d', shape: 'M1.5 1.5 H8.5 V8.5 H1.5 Z' },
} as const

/** Durum noktası: renk + şekil (daire / üçgen / kare) + erişilebilir ad; emoji değil. */
export function BadgeDot({ state }: { state: WeaponState }) {
  const dot = DOT[state]
  return (
    <svg role="img" aria-label={dot.label} width="12" height="12" viewBox="0 0 10 10" className="inline-block align-[-1px]">
      <title>{dot.label}</title>
      <path d={dot.shape} fill={dot.color} />
    </svg>
  )
}

export function ScoreBar({ label, value, hint }: { label: string; value: number | undefined; hint?: string }) {
  const pct = Math.max(0, Math.min(100, value ?? 0))
  const color = pct >= 75 ? 'bg-r-elite' : pct >= 55 ? 'bg-r-mid' : 'bg-r-poor'
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="num">{value === undefined ? '—' : `%${Math.round(pct)}`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-sm bg-surface-2">
        <div className={cx('h-full', color)} style={{ width: `${pct}%` }} />
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function AttrBar({ label, value, delta }: { label: string; value: number; delta?: number }) {
  const color = value >= 80 ? 'bg-r-elite' : value >= 65 ? 'bg-r-high' : value >= 50 ? 'bg-r-mid' : 'bg-r-poor'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-36 shrink-0 truncate">{label}</span>
      <span className="num w-6 text-right font-semibold">{value}</span>
      {delta !== undefined && delta !== 0 && (
        <span className={cx('num w-10 shrink-0 text-[11px] font-bold', delta > 0 ? 'text-good' : 'text-danger')} title={`şuydu ${value - delta} → şu oldu ${value}`}>
          {delta > 0 ? '▲+' : '▼−'}{Math.abs(delta)}
        </span>
      )}
      <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-surface-2">
        <div className={cx('h-full', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

/** Boş durum: ne olduğunu söyler ve (varsa) tek eylem sunar (UX-06). */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line p-6 text-center text-sm text-muted">
      <p>{children}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  )
}

/** Yardım açıklaması: paragraf yerine "?" düğmesi (DS-08); klavyeyle açılır, Esc kapatır. */
export function HelpPopover({ children, label = 'Yardım' }: { children: ReactNode; label?: string }) {
  return (
    <details className="group relative inline-block align-middle">
      <summary aria-label={label} className="flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full border border-line text-xs font-bold text-muted hover:text-ink [&::-webkit-details-marker]:hidden">?</summary>
      <div role="note" className="absolute left-0 top-6 z-30 w-64 rounded-md border border-line bg-surface p-3 text-xs font-normal normal-case leading-snug tracking-normal text-ink">
        {children}
      </div>
    </details>
  )
}

/** Tek Dialog (DS-03): Esc kapatır, odak açılışta içeri alınır, Tab diyalogdan çıkmaz, kapanınca odak geri döner. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((el) => !el.hasAttribute('disabled'))
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Tab') {
        const items = focusables()
        if (items.length === 0) {
          return
        }
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" tabIndex={-1} aria-label="Kapat" className="absolute inset-0 animate-fade bg-ink-950/60" onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-md animate-pop rounded-md border border-line bg-surface p-5 text-ink">
        <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-wide">{title}</h2>
        {children}
      </div>
    </div>
  )
}
