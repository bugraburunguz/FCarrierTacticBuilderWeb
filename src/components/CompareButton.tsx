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
      {compact ? (active ? '✓' : '+') : active ? '✓ Karşılaştırmada' : '+ Karşılaştır'}
    </button>
  )
}
