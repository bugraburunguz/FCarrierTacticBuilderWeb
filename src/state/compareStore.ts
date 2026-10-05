import { useSyncExternalStore } from 'react'

const KEY = 'fc.compare'
export const MAX_COMPARE = 6
export const DRAG_TYPE = 'application/x-fc-compare'

export interface CompareEntry {
  id: number
  name: string
  overall: number
  position: string
}

const listeners = new Set<() => void>()

function load(): CompareEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CompareEntry[]) : []
  } catch {
    return []
  }
}

let current = load()

function commit(next: CompareEntry[]) {
  current = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export const compareStore = {
  get: () => current,
  has: (id: number) => current.some((c) => c.id === id),
  add(entry: CompareEntry) {
    if (current.length < MAX_COMPARE && !current.some((c) => c.id === entry.id)) {
      commit([...current, entry])
    }
  },
  remove: (id: number) => commit(current.filter((c) => c.id !== id)),
  toggle(entry: CompareEntry) {
    if (current.some((c) => c.id === entry.id)) {
      commit(current.filter((c) => c.id !== entry.id))
    } else {
      compareStore.add(entry)
    }
  },
  clear: () => commit([]),
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useCompareList(): CompareEntry[] {
  return useSyncExternalStore(compareStore.subscribe, compareStore.get)
}
