import type { UtCard } from '../lib/utCard'

const KEY = 'fc.utCards'
const MAX_CARDS = 3000

export interface UtCardLibrary {
  cards: UtCard[]
  importedAt: string
}

export const utCardStore = {
  get(): UtCardLibrary | undefined {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as UtCardLibrary) : undefined
    } catch {
      return undefined
    }
  },
  /** Kulüp ve gördüğün market kartlarını saklar; kota dolarsa kaydedilemeyebilir, bu durumda false döner. */
  set(cards: UtCard[]): boolean {
    try {
      localStorage.setItem(KEY, JSON.stringify({ cards: cards.slice(0, MAX_CARDS), importedAt: new Date().toISOString() } satisfies UtCardLibrary))
      return true
    } catch {
      return false
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
