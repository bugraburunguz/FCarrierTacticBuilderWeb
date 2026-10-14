import * as Popover from '@radix-ui/react-popover'
import { NavLink } from 'react-router-dom'

/** Görünen ad: e-postanın yerel kısmı, ilk harf büyük. E-posta üst barda yazılmaz (menüde durur). */
export function displayName(email: string): string {
  const local = email.split('@')[0] || email
  return local.charAt(0).toLocaleUpperCase('tr') + local.slice(1)
}

/** Üst bar hesap menüsü: baş harf avatarı + ad; e-posta, Profil ve Çıkış menüde (Radix Popover). */
export function UserMenu({ email, onLogout }: { email: string; onLogout: () => void }) {
  const name = displayName(email)
  return (
    <Popover.Root>
      <Popover.Trigger aria-label={`Hesap menüsü: ${name}`} className="glass-3 inline-flex min-h-10 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm text-ink hover:bg-[var(--glass-hover)] max-sm:hidden">
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-display text-base font-bold text-on-accent">{name.charAt(0)}</span>
        <span data-private className="hidden max-w-[120px] truncate lg:block">{name}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-64 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--sheet-bg)] p-2 text-ink outline-none">
          <p data-private className="truncate px-2 py-1 text-xs text-muted">{email}</p>
          <NavLink to="/profile" className="block min-h-10 rounded-[var(--radius-sm)] px-2 py-2 text-sm hover:bg-[var(--glass-hover)]">Profil</NavLink>
          <button type="button" onClick={onLogout} className="block min-h-10 w-full rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm hover:bg-[var(--glass-hover)]">Çıkış</button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
