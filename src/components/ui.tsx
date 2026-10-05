import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { ApiError } from '../api/client'
import type { WeaponState } from '../api/types'
import { BADGE_EMOJI } from '../lib/format'

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ')

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900', className)}>
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

export function Button({ variant = 'primary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
    secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  }
  return (
    <button
      type="button"
      {...props}
      className={cx('inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed', styles[variant], className)}
    />
  )
}

const fieldStyle =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldStyle, props.className)} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(fieldStyle, props.className)} />
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  )
}

export function Spinner({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-6 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
      {label}
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) {
    return null
  }
  const message = error instanceof ApiError ? error.message : 'Beklenmeyen bir hata oluştu.'
  return (
    <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
      {message}
    </div>
  )
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'sky' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100',
    sky: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100',
  }
  return <span className={cx('inline-block rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}

export function BadgeDot({ state }: { state: WeaponState }) {
  const label = { GREEN: 'Uygun', YELLOW: 'Zayıf yön var', RED: 'Rolü oynayamaz' }[state]
  return (
    <span role="img" aria-label={label} title={label}>
      {BADGE_EMOJI[state]}
    </span>
  )
}

export function ScoreBar({ label, value, hint }: { label: string; value: number | undefined; hint?: string }) {
  const pct = Math.max(0, Math.min(100, value ?? 0))
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 55 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{value === undefined ? '—' : `%${Math.round(pct)}`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={cx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function AttrBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 65 ? 'bg-lime-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-36 shrink-0 truncate">{label}</span>
      <span className="w-6 text-right font-semibold tabular-nums">{value}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={cx('h-full', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-600">{children}</p>
}
