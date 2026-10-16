import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { LogoLockup } from '../../design/brand/LogoLockup'
import { errorMessage } from '../../lib/errorMessage'

/** Hesap ekranlarının (giriş, kayıt, doğrulama, gizlilik) ortak parçaları — v3: ortalanmış tek cam kart, marka üstte. */

export function CenteredCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 py-6">
      <LogoLockup size={48} />
      <section className="glass flex w-full flex-col gap-4 p-5 sm:p-6">
        <h1 className="font-display text-2xl font-bold leading-7">{title}</h1>
        {children}
      </section>
    </div>
  )
}

/** Sunucu ve ağ hataları mevcut metinlerle (errorMessage, WEB-BUG-05). */
export function ErrorAlert({ error }: { error: unknown }) {
  if (!error) {
    return null
  }
  const { message, network } = errorMessage(error)
  return (
    <p role="alert" className="rounded-[var(--radius-sm)] border border-[var(--bad)] px-3 py-2 text-sm text-bad">
      {message}{network && <span className="ml-1 text-ink-2">(ağ bağlantını kontrol et)</span>}
    </p>
  )
}

const INPUT = 'glass-3 min-h-10 w-full rounded-[var(--radius-sm)] px-3 text-sm text-ink placeholder:text-muted max-sm:min-h-11'

export function TextField({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-2">{label}</label>
      <input id={id} className={INPUT} {...props} />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

/** Şifre alanı: göster/gizle düğmesi (aria-pressed); autocomplete çağırandan (current-password / new-password). */
export function PasswordField({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-2">{label}</label>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} className={`${INPUT} pr-12`} {...props} />
        <button type="button" aria-pressed={visible} aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'} onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[var(--radius-sm)] text-ink-2 hover:text-ink">
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

export const PRIMARY_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-semibold text-on-accent hover:opacity-90 disabled:opacity-60'
