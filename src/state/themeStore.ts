import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light' | 'system'

const KEY = 'fc.theme'
const ORDER: Theme[] = ['dark', 'light', 'system']

function read(): Theme {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored
    }
  } catch {
    /* depolama yok */
  }
  return 'dark'
}

let current: Theme = read()
const listeners = new Set<() => void>()

export function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export const themeStore = {
  get: () => current,
  set(next: Theme) {
    current = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* ignore */
    }
    applyTheme(next)
    listeners.forEach((l) => l())
  },
  cycle() {
    themeStore.set(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length])
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useTheme(): Theme {
  return useSyncExternalStore(themeStore.subscribe, themeStore.get)
}
