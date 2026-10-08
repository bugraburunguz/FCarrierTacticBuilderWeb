import { useSyncExternalStore } from 'react'
import type { Assignments } from '../lib/squadBuilder'

const KEY = 'fc.lineup'

type All = Record<string, Assignments>

let current: All = load()
const listeners = new Set<() => void>()

function load(): All {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as All
      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    }
  } catch {
    /* bozuk ya da erişilemeyen depolama — boş başla */
  }
  return {}
}

export const EMPTY_ASSIGNMENTS: Assignments = {}

export const lineupStore = {
  get: () => current,
  set(careerId: number, assignments: Assignments) {
    current = { ...current, [String(careerId)]: assignments }
    try {
      localStorage.setItem(KEY, JSON.stringify(current))
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useLineup(careerId: number | undefined): Assignments {
  const all = useSyncExternalStore(lineupStore.subscribe, lineupStore.get)
  return (careerId !== undefined && all[String(careerId)]) || EMPTY_ASSIGNMENTS
}
