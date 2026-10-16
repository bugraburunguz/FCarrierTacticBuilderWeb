import * as Popover from '@radix-ui/react-popover'
import { Menu, Monitor, Moon, Sun } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { themeStore, useTheme, type Theme } from '../../state/themeStore'

const NEXT_LABEL: Record<Theme, string> = { dark: 'Açık temaya geç', light: 'Sistem temasına geç', system: 'Koyu temaya geç' }
const ICON = { dark: Moon, light: Sun, system: Monitor } as const

/** Tema düğmesi: yazı yerine güneş/ay ikonu; aria-label bir sonraki durumu söyler (F7). */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useTheme()
  const Icon = ICON[theme]
  return (
    <button type="button" onClick={() => themeStore.cycle()} aria-label={NEXT_LABEL[theme]} title={NEXT_LABEL[theme]} className={`glass-3 inline-flex min-h-10 min-w-10 items-center justify-center text-ink-2 hover:bg-[var(--glass-hover)] max-sm:min-h-11 max-sm:min-w-11 ${className}`}>
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}

/** Mobil menü (<640px): tema ve hesap bağlantıları tek açılır kutuda (Radix Popover). */
export function MobileMenu({ email, onLogout, loginLink }: { email?: string; onLogout?: () => void; loginLink?: boolean }) {
  return (
    <Popover.Root>
      <Popover.Trigger aria-label="Menü" className="glass-3 inline-flex min-h-11 min-w-11 items-center justify-center text-ink-2 hover:bg-[var(--glass-hover)] sm:hidden">
        <Menu size={18} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content aria-label="Menü" align="end" sideOffset={8} className="z-50 w-56 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--sheet-bg)] p-2 text-ink outline-none">
          <div className="flex items-center justify-between gap-2 px-2 py-1 text-sm">
            <span className="text-ink-2">Tema</span>
            <ThemeToggle />
          </div>
          {loginLink && (
            <NavLink to="/login" className="block min-h-11 rounded-[var(--radius-sm)] px-2 py-2.5 text-sm hover:bg-[var(--glass-hover)]">Giriş</NavLink>
          )}
          {email && (
            <NavLink to="/profile" className="block min-h-11 rounded-[var(--radius-sm)] px-2 py-2.5 text-sm hover:bg-[var(--glass-hover)]">Profil</NavLink>
          )}
          {onLogout && (
            <button type="button" onClick={onLogout} className="block min-h-11 w-full rounded-[var(--radius-sm)] px-2 py-2.5 text-left text-sm hover:bg-[var(--glass-hover)]">Çıkış</button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
