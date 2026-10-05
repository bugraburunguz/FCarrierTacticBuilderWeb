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
      className={`fixed bottom-4 left-1/2 z-40 flex max-w-[95vw] -translate-x-1/2 items-center gap-2 rounded-2xl border border-emerald-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-slate-600 dark:bg-slate-800/95 ${over ? 'ring-2 ring-emerald-500' : ''}`}
    >
      <span className="text-xs font-semibold text-slate-500">Karşılaştırma</span>
      {list.length === 0 && <span className="text-xs text-slate-500">Oyuncu satırlarını buraya sürükle-bırak</span>}
      <div className="flex flex-wrap gap-1.5">
        {list.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs dark:bg-slate-700">
            {c.name} <b>{c.overall}</b>
            <button type="button" aria-label={`${c.name} çıkar`} className="text-slate-400 hover:text-rose-600" onClick={() => compareStore.remove(c.id)}>
              ×
            </button>
          </span>
        ))}
      </div>
      {list.length > 0 && <Link to="/compare" className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
        Karşılaştır ({list.length})
      </Link>}
      <button type="button" className="text-xs text-slate-400 hover:text-rose-600" onClick={() => compareStore.clear()}>
        Temizle
      </button>
    </div>
  )
}
