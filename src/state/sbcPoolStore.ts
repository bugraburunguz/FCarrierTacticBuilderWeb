import type { SbcPoolEntry } from '../api/types'

const KEY = 'fc.sbcPool'

export const sbcPoolStore = {
  get(): SbcPoolEntry[] | undefined {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as SbcPoolEntry[]) : undefined
    } catch {
      return undefined
    }
  },
  set(pool: SbcPoolEntry[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(pool))
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  },
}
