import { useSyncExternalStore } from 'react'
import bundled from '../lib/utRules.fc27.json'

export type UtRulesDoc = typeof bundled

/**
 * Oyun kuralları tek kaynaktan gelir: backend `GET /ut/rules` (BE-ARCH-03). Paketli kopya yalnız fallback'tir:
 * açılışta ve istek başarısız olduğunda kullanılır. Hesaplayıcılar değeri çağrı anında `rulesStore.get()` ile okur.
 */
let current: UtRulesDoc = bundled
let source: 'bundled' | 'server' = 'bundled'
const listeners = new Set<() => void>()

function isRulesDoc(value: unknown): value is UtRulesDoc {
  const doc = value as UtRulesDoc | null
  return Boolean(doc && doc.chemistry?.thresholds && doc.squadRating?.sizes && doc.contentCalendar?.dailyRefresh)
}

export const rulesStore = {
  get: () => current,
  source: () => source,
  set(doc: unknown): boolean {
    if (!isRulesDoc(doc)) {
      return false
    }
    current = doc
    source = 'server'
    listeners.forEach((l) => l())
    return true
  },
  reset() {
    current = bundled
    source = 'bundled'
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

/** Sunucudaki kural dokümanını bir kez çeker; ağ ya da biçim hatasında paketli kopya geçerli kalır. */
export async function hydrateRules(fetchRules: () => Promise<unknown>): Promise<void> {
  try {
    rulesStore.set(await fetchRules())
  } catch {
    /* paketli kopya geçerli */
  }
}

export function useUtRules(): UtRulesDoc {
  return useSyncExternalStore(rulesStore.subscribe, rulesStore.get)
}
