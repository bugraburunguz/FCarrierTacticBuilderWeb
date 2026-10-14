import { GitCompare } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MobileSheet, useIsMobile } from '../design/components/MobileSheet'
import { compareStore, DRAG_TYPE, useCompareList, type CompareEntry } from '../state/compareStore'

const TITLE = 'Karşılaştırma'

function Entries({ list }: { list: CompareEntry[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((c) => (
        <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs">
          <span>{c.name}</span> <b>{c.overall}</b>
          <button type="button" aria-label={`${c.name} çıkar`} className="inline-flex min-h-6 min-w-6 items-center justify-center text-muted hover:text-danger" onClick={() => compareStore.remove(c.id)}>
            ×
          </button>
        </span>
      ))}
    </div>
  )
}

/**
 * Karşılaştırma tepsisi: boşken hiç yok. Masaüstünde altta sabit çubuk + eşit yükseklikte yer tutucu (sayfa içeriğini kapatmaz);
 * mobilde küçük yüzen "Karşılaştır (n)" düğmesi, tıklayınca alttan sheet. Çubuğa sürüklenen oyuncu satırı eklenir (yalnız fare).
 */
export function CompareTray() {
  const list = useCompareList()
  const location = useLocation()
  const mobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [over, setOver] = useState(false)
  if (list.length === 0 || location.pathname === '/compare') {
    return null
  }
  if (mobile) {
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="glass-2 fixed bottom-20 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink">
          <GitCompare size={16} aria-hidden="true" />
          Karşılaştır ({list.length})
        </button>
        {open && (
          <MobileSheet title={TITLE} onClose={() => setOpen(false)}>
            <div className="flex flex-col gap-4">
              <Entries list={list} />
              <div className="flex gap-2">
                <Link to="/compare" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-semibold text-on-accent">Karşılaştır ({list.length})</Link>
                <button type="button" className="glass-3 min-h-11 px-4 text-sm font-semibold" onClick={() => compareStore.clear()}>Temizle</button>
              </div>
            </div>
          </MobileSheet>
        )}
      </>
    )
  }
  return (
    <>
      <div data-compare-spacer aria-hidden="true" className="h-16" />
      <section
        aria-label={TITLE}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_TYPE)) {
            e.preventDefault()
            setOver(true)
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          const raw = e.dataTransfer.getData(DRAG_TYPE)
          if (raw) {
            compareStore.add(JSON.parse(raw) as CompareEntry)
          }
        }}
        className={`glass-2 fixed inset-x-4 bottom-3 z-40 mx-auto flex max-w-[1100px] items-center gap-3 px-4 py-2 ${over ? 'ring-2 ring-accent' : ''}`}
      >
        <span className="text-xs font-semibold text-muted">{TITLE}</span>
        <div className="min-w-0 flex-1"><Entries list={list} /></div>
        <Link to="/compare" className="inline-flex min-h-8 items-center rounded-[var(--radius-sm)] bg-accent px-3 text-xs font-semibold text-on-accent hover:opacity-90">
          Karşılaştır ({list.length})
        </Link>
        <button type="button" className="min-h-8 text-xs text-muted hover:text-danger" onClick={() => compareStore.clear()}>
          Temizle
        </button>
      </section>
    </>
  )
}
