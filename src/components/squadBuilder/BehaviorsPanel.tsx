import type { BehaviorTag, Role } from '../../api/types'
import { TagChips } from '../TagChips'
import { Field, Pill, Select } from '../ui'

interface Props {
  derivedRoleName?: string
  roleHint?: string
  tags: BehaviorTag[]
  selected: string[]
  onTags: (next: string[]) => void
  roleOverride?: string
  roles: Role[]
  onRole: (roleId: string | undefined) => void
}

export function BehaviorsPanel({ derivedRoleName, roleHint, tags, selected, onTags, roleOverride, roles, onRole }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Türetilen rol:</span>
        <Pill tone="emerald">{derivedRoleName ?? '…'}</Pill>
      </div>
      {roleHint && <p className="rounded-lg bg-code-soft p-2 text-sm text-code">Aranan profil: {roleHint}</p>}
      <div>
        <p className="mb-1 text-xs font-medium text-ink/80">Davranışlar (çelişenler otomatik kilitlenir)</p>
        <TagChips tags={tags} selected={selected} onChange={onTags} />
      </div>
      <Field label="Rolü elle seç (davranış oylamasını geçersiz kılar)">
        <Select value={roleOverride ?? ''} onChange={(e) => onRole(e.target.value || undefined)}>
          <option value="">Otomatik</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
      {selected.length > 0 && (
        <ul className="space-y-0.5 text-sm text-ink/80">
          {selected.map((id) => (
            <li key={id}>• {tags.find((t) => t.id === id)?.nlg}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
