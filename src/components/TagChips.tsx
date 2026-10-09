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
                ? 'border-accent bg-accent-bg text-on-accent'
                : disabled
                  ? 'cursor-not-allowed border-line bg-surface-2 text-muted line-through'
                  : 'border-line hover:border-accent'
            }`}
          >
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}
