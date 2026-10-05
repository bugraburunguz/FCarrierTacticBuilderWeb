import { useSyncExternalStore } from 'react'

const KEY = 'fc.manager'

export interface ManagerState {
  presetId?: string
  weight: number
  allowTransfers: boolean
}

const DEFAULT: ManagerState = { weight: 40, allowTransfers: false }
const listeners = new Set<() => void>()

function load(): ManagerState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      return { ...DEFAULT, ...(JSON.parse(raw) as Partial<ManagerState>) }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT
}

let current = load()

export const managerStore = {
  get: () => current,
  set(next: Partial<ManagerState>) {
    current = { ...current, ...next }
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

export function useManager(): ManagerState {
  return useSyncExternalStore(managerStore.subscribe, managerStore.get)
}
