import { Check, Plus } from 'lucide-react'
import { compareStore, MAX_COMPARE, useCompareList, type CompareEntry } from '../state/compareStore'

export function CompareButton({ entry, compact }: { entry: CompareEntry; compact?: boolean }) {
  const list = useCompareList()
  const active = list.some((c) => c.id === entry.id)
  const full = !active && list.length >= MAX_COMPARE
  return (
    <button
      type="button"
      disabled={full}
      title={full ? `En fazla ${MAX_COMPARE} oyuncu` : active ? 'Karşılaştırmadan çıkar' : 'Karşılaştırmaya ekle'}
      onClick={() => compareStore.toggle(entry)}
      className={`rounded-md border px-2 py-1 text-xs font-medium transition disabled:opacity-40 ${
        active ? 'border-accent bg-accent-bg text-on-accent' : 'border-line text-muted hover:border-accent hover:text-accent'
      }`}
    >
      {compact ? (active ? <Check size={14} aria-label="Karşılaştırmada" /> : <Plus size={14} aria-label="Karşılaştırmaya ekle" />) : active ? <span className="inline-flex items-center gap-1"><Check size={14} aria-hidden="true" /> Karşılaştırmada</span> : <span className="inline-flex items-center gap-1"><Plus size={14} aria-hidden="true" /> Karşılaştır</span>}
    </button>
  )
}
