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
      className={`rounded-lg border px-2 py-1 text-xs font-medium transition disabled:opacity-40 ${
        active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-600 dark:text-slate-300'
      }`}
    >
      {compact ? (active ? '✓' : '+') : active ? '✓ Karşılaştırmada' : '+ Karşılaştır'}
    </button>
  )
}
