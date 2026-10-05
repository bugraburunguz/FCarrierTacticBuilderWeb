import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { endpoints } from '../api/endpoints'
import { TagChips } from './TagChips'
import { Field, Pill, Select } from './ui'

export interface RoleSelection {
  position: string
  roleId: string
  tags: string[]
}

export const POSITION_GROUP: Record<string, string> = {
  GK: 'GK', RB: 'FB', LB: 'FB', RWB: 'FB', LWB: 'FB', CB: 'CB', CDM: 'CDM', CM: 'CM', CAM: 'CAM',
  LM: 'WM', RM: 'WM', LW: 'W', RW: 'W', ST: 'ST', CF: 'ST',
}

const PICKER_POSITIONS = ['GK', 'RB', 'LB', 'CB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST']

interface Props {
  value: RoleSelection
  onChange: (next: RoleSelection) => void
}

export function RolePicker({ value, onChange }: Props) {
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles })
  const group = POSITION_GROUP[value.position]
  const tags = useQuery({ queryKey: ['tags', group], queryFn: () => endpoints.behaviorTags(group), enabled: !!group })

  const positionRoles = useMemo(
    () => (roles.data ?? []).filter((r) => r.positions.includes(value.position)),
    [roles.data, value.position],
  )

  function changePosition(position: string) {
    const first = (roles.data ?? []).find((r) => r.positions.includes(position))
    onChange({ position, roleId: first?.id ?? '', tags: [] })
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mevki">
          <Select value={value.position} onChange={(e) => changePosition(e.target.value)}>
            {PICKER_POSITIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Rol">
          <Select value={value.roleId} onChange={(e) => onChange({ ...value, roleId: e.target.value })}>
            {positionRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Davranışlar (isteğe bağlı)</p>
        <TagChips tags={tags.data ?? []} selected={value.tags} onChange={(next) => onChange({ ...value, tags: next })} />
        {tags.data?.length === 0 && <Pill>Bu mevki için davranış yok</Pill>}
      </div>
    </div>
  )
}
