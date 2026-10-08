import type { FormationSlot, Role } from '../api/types'
import { canPlaySlot } from './positions'

/** OVR rengi; düşük OVR'lı (League 2) kadrolara göre ayarlı eşikler. */
export function ovrBand(overall: number): string {
  if (overall >= 80) return '#0e9b52'
  if (overall >= 70) return '#3aa14a'
  if (overall >= 65) return '#86b81f'
  if (overall >= 60) return '#d0a022'
  return '#d47a24'
}

export const roleBaseName = (role: Pick<Role, 'name'>): string => role.name.replace(/\s*\(.*\)\s*$/, '')

export interface FocusOption {
  focus: string
  roleId: string
}

export interface RoleGroup {
  base: string
  options: FocusOption[]
}

/** Mevkide gerçekten var olan roller, ailesine göre gruplu. Backend ne veriyorsa o; frontend rol uydurmaz. */
export function roleGroups(roles: Role[], position: string): RoleGroup[] {
  const groups = new Map<string, FocusOption[]>()
  roles
    .filter((r) => r.positions.includes(position))
    .forEach((r) => {
      const base = roleBaseName(r)
      groups.set(base, [...(groups.get(base) ?? []), { focus: r.focus, roleId: r.id }])
    })
  return [...groups.entries()].map(([base, options]) => ({ base, options }))
}

/** Rol değişince focus ilk geçerli focus'a döner. */
export function firstFocus(group: RoleGroup): FocusOption {
  return group.options[0]
}

export type Assignments = Record<string, number>

/**
 * Formasyon değişince oyuncuları taşır: aynı slotId ve mevki uyumluysa yerinde kalır,
 * kalanlar ilk boş uyumlu slota geçer, sığmayanlar kadroda kalır (sahadan düşer).
 */
export function remapAssignments(prev: Assignments, positionsOf: (playerId: number) => string[] | undefined, slots: FormationSlot[]): Assignments {
  const next: Assignments = {}
  const used = new Set<number>()
  slots.forEach((slot) => {
    const id = prev[slot.slotId]
    const positions = id === undefined ? undefined : positionsOf(id)
    if (id !== undefined && positions && canPlaySlot(positions, slot.position)) {
      next[slot.slotId] = id
      used.add(id)
    }
  })
  Object.values(prev)
    .filter((id) => !used.has(id))
    .forEach((id) => {
      const positions = positionsOf(id)
      const target = positions && slots.find((s) => next[s.slotId] === undefined && canPlaySlot(positions, s.position))
      if (target) {
        next[target.slotId] = id
        used.add(id)
      }
    })
  return next
}

/** İki slotun içeriğini yer değiştirir; yalnızca biri doluysa onu boş slota taşır. Mevki değil oyuncu taşınır. */
export function swapSlots<T>(record: Record<string, T>, a: string, b: string): Record<string, T> {
  if (a === b) {
    return record
  }
  const next: Record<string, T> = { ...record }
  const first = record[a]
  const second = record[b]
  delete next[a]
  delete next[b]
  if (second !== undefined) {
    next[a] = second
  }
  if (first !== undefined) {
    next[b] = first
  }
  return next
}
