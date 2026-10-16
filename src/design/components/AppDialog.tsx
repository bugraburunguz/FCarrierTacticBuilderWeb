import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * v3 diyalog (V3-07b; components/Modal.tsx yerine): Radix Dialog — arkada scrim, opak yüzey (`--sheet-bg`), Esc ve Kapat, odak hapsi; açıkken arkadaki
 * içerik erişilebilirlik ağacından gizlenir, kapanınca odak açan öğeye döner. Masaüstünde ortada; <640px'te alttan sheet (85dvh). Arayüz Modal ile aynı.
 * Ortak bileşenler (CareerSelect, TransferDialog) v2 sayfalarında da açtığı için v3 token'larının v2 karşılığı yedek olarak verilir.
 */
export function AppDialog({ title, hint, wide, onClose, children }: { title: string; hint?: string; wide?: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55" />
        <Dialog.Content
          aria-describedby={undefined}
          className={`fixed z-50 flex flex-col border border-[var(--glass-border,var(--line))] bg-[var(--sheet-bg,var(--surface))] p-4 text-ink outline-none max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[85dvh] max-sm:rounded-t-[var(--radius-xl,12px)] sm:left-1/2 sm:top-1/2 sm:max-h-[86vh] sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-lg,8px)] ${wide ? 'max-w-[720px]' : 'max-w-[420px]'}`}
        >
          <header className="mb-3 flex shrink-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-xl font-semibold leading-6">{title}</Dialog.Title>
              {hint && <p className="mt-0.5 text-xs text-ink-2">{hint}</p>}
            </div>
            <Dialog.Close aria-label="Kapat" className="glass-3 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-ink hover:bg-[var(--glass-hover)] max-sm:size-11">
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
