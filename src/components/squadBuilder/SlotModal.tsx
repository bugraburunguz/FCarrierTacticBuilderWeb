import type { ReactNode } from 'react'
import { Modal } from '../Modal'

export interface SlotTab {
  id: string
  label: string
  node: ReactNode
}

interface Props {
  title: string
  hint?: string
  tabs: SlotTab[]
  active: string
  onTab: (id: string) => void
  onClose: () => void
}

/** Slot popup'ı: Oyuncu · Rol & odak · Davranışlar · Öneriler sekmeleri tek yerde. */
export function SlotModal({ title, hint, tabs, active, onTab, onClose }: Props) {
  const current = tabs.find((t) => t.id === active) ?? tabs[0]
  return (
    <Modal wide title={title} hint={hint} onClose={onClose}>
      <div role="tablist" aria-label="Slot ayarları" className="mb-3 flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === current.id}
            onClick={() => onTab(t.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${t.id === current.id ? 'bg-emerald-400 text-emerald-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {current.node}
    </Modal>
  )
}
