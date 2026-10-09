import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { compareStore, DRAG_TYPE, useCompareList, type CompareEntry } from '../state/compareStore'

export function CompareTray() {
  const list = useCompareList()
  const location = useLocation()
  const [over, setOver] = useState(false)
  const onPlayers = location.pathname === '/players'
  if ((list.length === 0 && !onPlayers) || location.pathname === '/compare') {
    return null
  }
  return (
    <div
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
      className={`fixed bottom-4 left-1/2 z-40 flex max-w-[95vw] -translate-x-1/2 items-center gap-2 rounded-md border border-accent bg-surface/95 px-3 py-2   ${over ? 'ring-2 ring-accent' : ''}`}
    >
      <span className="text-xs font-semibold text-muted">Karşılaştırma</span>
      {list.length === 0 && <span className="text-xs text-muted">Oyuncu satırlarını buraya sürükle-bırak</span>}
      <div className="flex flex-wrap gap-1.5">
        {list.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs">
            {c.name} <b>{c.overall}</b>
            <button type="button" aria-label={`${c.name} çıkar`} className="text-muted hover:text-danger" onClick={() => compareStore.remove(c.id)}>
              ×
            </button>
          </span>
        ))}
      </div>
      {list.length > 0 && <Link to="/compare" className="rounded-md bg-accent-bg px-3 py-1 text-xs font-semibold text-on-accent hover:opacity-90">
        Karşılaştır ({list.length})
      </Link>}
      <button type="button" className="text-xs text-muted hover:text-danger" onClick={() => compareStore.clear()}>
        Temizle
      </button>
    </div>
  )
}
