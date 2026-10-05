import { useMemo } from 'react'
import type { BehaviorTag } from '../api/types'
import { lockedBy } from '../state/tacticStore'

interface Props {
  tags: BehaviorTag[]
  selected: string[]
  onChange: (next: string[]) => void
}

export function TagChips({ tags, selected, onChange }: Props) {
  const conflicts = useMemo(() => new Map(tags.map((t) => [t.id, t.conflicts])), [tags])
  const locked = lockedBy(selected, (id) => conflicts.get(id) ?? [])

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id])
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const isSelected = selected.includes(tag.id)
        const disabled = !isSelected && locked.has(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            title={disabled ? 'Seçili bir davranışla çelişiyor' : tag.nlg}
            onClick={() => toggle(tag.id)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              isSelected
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : disabled
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through dark:border-slate-700 dark:bg-slate-800'
                  : 'border-slate-300 hover:border-emerald-500 dark:border-slate-600'
            }`}
          >
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}
