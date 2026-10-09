import { useSyncExternalStore } from 'react'
import type { Objective } from '../lib/objectives'

const KEY = 'fc.objectives'
const listeners = new Set<() => void>()

function load(): Objective[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Objective[]) : []
  } catch {
    return []
  }
}

let current = load()

function commit(next: Objective[]) {
  current = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export const objectiveStore = {
  get: () => current,
  add: (objective: Objective) => commit([...current, objective]),
  /** Yakalamadan gelenleri (ana göreve bağlı) yenisiyle değiştirir; elle girilenler kalır. */
  replaceImported: (imported: Objective[]) => commit([...current.filter((o) => !o.parentId), ...imported]),
  remove: (id: string) => commit(current.filter((o) => o.id !== id)),
  clear: () => commit([]),
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useObjectives(): Objective[] {
  return useSyncExternalStore(objectiveStore.subscribe, objectiveStore.get, objectiveStore.get)
}
