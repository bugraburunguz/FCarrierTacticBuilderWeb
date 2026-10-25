import type { FormationSlot, Role, RoleAlternative } from '../api/types'
import { canPlaySlot } from './positions'

/** OVR rengi (token'lar design/tokens.css); düşük OVR'lı (League 2) kadrolara göre ayarlı eşikler. */
export function ovrBand(overall: number): string {
  if (overall >= 80) return 'var(--ovr-80)'
  if (overall >= 70) return 'var(--ovr-70)'
  if (overall >= 65) return 'var(--ovr-65)'
  if (overall >= 60) return 'var(--ovr-60)'
  return 'var(--ovr-low)'
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

import { eaRoleKey } from './eaRoles'

/** Mevkide oyunda gerçekten var olan roller, ailesine göre gruplu. EA listesi (allowed) yoksa seçici kilitli: boş döner, rol uydurulmaz (TAC-10). */
export function roleGroups(roles: Role[], position: string, allowed: Set<string> | undefined): RoleGroup[] {
  if (!allowed) {
    return []
  }
  const groups = new Map<string, FocusOption[]>()
  roles
    .filter((r) => r.positions.includes(position) && allowed.has(eaRoleKey(position, roleBaseName(r), r.focus)))
    .forEach((r) => {
      const base = roleBaseName(r)
      groups.set(base, [...(groups.get(base) ?? []), { focus: r.focus, roleId: r.id }])
    })
  return [...groups.entries()].map(([base, options]) => ({ base, options }))
}

/** Bir rol alternatifinin sıralama ölçüsü: Rol oturması, norm yoksa Güç. */
export const roleFitBasis = (fit: Pick<RoleAlternative, 'currentFit' | 'levelFit'>): number => fit.levelFit ?? fit.currentFit

/**
 * FIT-2 madde 6: rol seçici bu oyuncuya göre — odaklar ve gruplar en uygun önce (grubun en iyi odağı). Değeri bilinmeyen rol sonda, kendi
 * aralarında sıra korunur. `fits` yoksa gruplar olduğu gibi döner.
 */
export function rankRoleGroups(groups: RoleGroup[], fits: Map<string, RoleAlternative> | undefined): RoleGroup[] {
  if (!fits) {
    return groups
  }
  const score = (roleId: string) => {
    const fit = fits.get(roleId)
    return fit ? roleFitBasis(fit) : Number.NEGATIVE_INFINITY
  }
  return groups
    .map((g) => ({ ...g, options: [...g.options].sort((a, b) => score(b.roleId) - score(a.roleId)) }))
    .sort((a, b) => score(b.options[0].roleId) - score(a.options[0].roleId))
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
