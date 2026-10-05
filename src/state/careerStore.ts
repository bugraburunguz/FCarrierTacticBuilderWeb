import { useSyncExternalStore } from 'react'

const KEY = 'fc.career'
const listeners = new Set<() => void>()

function load(): number | undefined {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? Number(raw) : undefined
  } catch {
    return undefined
  }
}

let current = load()

export const careerStore = {
  get: () => current,
  set(id: number | undefined) {
    current = id
    try {
      if (id === undefined) {
        localStorage.removeItem(KEY)
      } else {
        localStorage.setItem(KEY, String(id))
      }
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

export function useActiveCareerId(): number | undefined {
  return useSyncExternalStore(careerStore.subscribe, careerStore.get)
}
