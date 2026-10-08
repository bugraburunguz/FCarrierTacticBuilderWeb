import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface Props {
  title: string
  hint?: string
  wide?: boolean
  onClose: () => void
  children: ReactNode
}

/** Erişilebilir popup: Esc ve arka plan tıklaması kapatır, odak içeride döner, kapanınca önceki öğeye döner. */
export function Modal({ title, hint, wide, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const first = panel.current?.querySelector<HTMLElement>('input, button')
    first?.focus()
    return () => previous?.focus()
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !panel.current) {
      return
    }
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (items.length === 0) {
      return
    }
    const firstItem = items[0]
    const lastItem = items[items.length - 1]
    if (e.shiftKey && document.activeElement === firstItem) {
      e.preventDefault()
      lastItem.focus()
    } else if (!e.shiftKey && document.activeElement === lastItem) {
      e.preventDefault()
      firstItem.focus()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={onKeyDown}
        className={`max-h-[86vh] ${wide ? 'w-[680px]' : 'w-[380px]'} max-w-full overflow-auto rounded-2xl border border-line bg-surface p-4 text-ink shadow-2xl`}
      >
        <button type="button" aria-label="Kapat" onClick={onClose} className="float-right text-lg leading-none text-muted hover:text-ink">
          ✕
        </button>
        <h3 className="text-sm font-bold">{title}</h3>
        {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}
        {children}
      </div>
    </div>,
    document.body,
  )
}
