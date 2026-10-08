import type { UtCard } from '../lib/utCard'

const KEY = 'fc.utSquad'

export interface UtSquadSetup {
  buildUp: 'Short' | 'Balanced' | 'Counter'
  depth: number
}

export const DEFAULT_UT_SETUP: UtSquadSetup = { buildUp: 'Balanced', depth: 55 }
export const DEFAULT_UT_FORMATION = '4-2-3-1 (2)'

/** UT kadro kurucudaki kadro: sayfa yenilense ya da yakalama dosyası tekrar yüklenmese de kalır. */
export interface UtSquadSnapshot {
  formationId: string
  setup: UtSquadSetup
  picked: Record<string, UtCard>
  roleOverride: Record<string, string>
  origin: 'manual' | 'active-squad'
  savedAt: string
}

export const utSquadStore = {
  get(): UtSquadSnapshot | undefined {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as UtSquadSnapshot) : undefined
    } catch {
      return undefined
    }
  },
  set(snapshot: Omit<UtSquadSnapshot, 'savedAt'>): boolean {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...snapshot, savedAt: new Date().toISOString() } satisfies UtSquadSnapshot))
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
