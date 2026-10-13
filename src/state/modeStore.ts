import { useSyncExternalStore } from 'react'

export type AppMode = 'career' | 'ut'

const KEY = 'fc.mode'
const listeners = new Set<() => void>()

function load(): AppMode {
  try {
    return localStorage.getItem(KEY) === 'ut' ? 'ut' : 'career'
  } catch {
    return 'career'
  }
}

let current: AppMode = load()

export const modeStore = {
  get: () => current,
  set(mode: AppMode) {
    current = mode
    try {
      localStorage.setItem(KEY, mode)
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

export function useMode(): AppMode {
  return useSyncExternalStore(modeStore.subscribe, modeStore.get, modeStore.get)
}

const CAREER_PREFIXES = ['/career', '/squad', '/tactics', '/recommend', '/scouting', '/teams', '/wonderkids']

/** Mod URL önekinden çıkar (WEB-BUG-07): /ut → ut, kariyer yolları → career; ortak sayfalarda (ana sayfa, oyuncular, profil) son seçim korunur (undefined). */
export function modeForPath(pathname: string): AppMode | undefined {
  if (pathname === '/ut' || pathname.startsWith('/ut/')) {
    return 'ut'
  }
  return CAREER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? 'career' : undefined
}
