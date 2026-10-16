import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState, type ReactNode } from 'react'

const MOBILE_QUERY = '(max-width: 819px)'

/** İki sütunlu düzenin altındaki genişlikler: slot paneli yan panel yerine alttan sheet olur. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => (typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY).matches : false))
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined
    }
    const query = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setMobile(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return mobile
}

/**
 * Mobil kart/oyuncu seçme sheet'i (F2): Radix Dialog — arkada scrim, opak yüzey (`--sheet-bg`, alpha ≥ 0,92), 85dvh, tutamaç,
 * Esc ve kapat düğmesi, odak hapsi; açıkken arkadaki içerik erişilebilirlik ağacından gizlenir; kapanınca odak `restoreFocusTo`'ya döner.
 * Metin hiçbir zaman saha ya da kart üstünde saydam cam üzerinde durmaz (11 §8 Q5).
 */
export function MobileSheet({ title, onClose, children, restoreFocusTo }: { title: string; onClose: () => void; children: ReactNode; restoreFocusTo?: string }) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            const target = restoreFocusTo ? document.querySelector<HTMLElement>(restoreFocusTo) : null
            if (target) {
              e.preventDefault()
              target.focus({ preventScroll: true })
            }
          }}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col rounded-t-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--sheet-bg)] p-4 text-ink outline-none"
        >
          <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-[var(--faint)]" />
          <header className="mb-3 flex shrink-0 items-center justify-between gap-2">
            <Dialog.Title className="font-display text-xl font-semibold leading-6">{title}</Dialog.Title>
            <Dialog.Close className="glass-3 min-h-11 px-4 text-sm font-semibold text-ink hover:bg-[var(--glass-hover)]">Kapat</Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
