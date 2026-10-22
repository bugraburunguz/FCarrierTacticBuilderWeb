import { useSyncExternalStore } from 'react'
import { DEFAULT_TACTIC, type TacticState } from '../lib/tactic'

/*
 * Tek kopya taktik taslağı (fc.tactic). KARIYER-UX'ten beri yalnız v2 (geliştirme) sayfaları ve geçiş süresindeki v3 dosyaları (kariyerUxGates izinli listesi)
 * kullanır; v3'te katman 2 ana taktik (sunucu), katman 3 Lab taslağı (labStore). Tip ve yardımcılar tek taktik modelinden (lib/tactic) gelir.
 */
export { DEFAULT_SETUP, DEFAULT_TACTIC, lockedBy, toTacticRequest } from '../lib/tactic'
export type { TacticState, TeamSetupState } from '../lib/tactic'

const KEY = 'fc.tactic'

let current: TacticState = load()
const listeners = new Set<() => void>()

function load(): TacticState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as TacticState
      if (parsed && typeof parsed.formation === 'string' && parsed.slots) {
        return parsed
      }
    }
  } catch {
    /* corrupt or unavailable storage — fall back to default */
  }
  return DEFAULT_TACTIC
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* ignore */
  }
}

export const tacticStore = {
  get: () => current,
  set(next: TacticState) {
    current = next
    persist()
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  reload() {
    current = load()
    listeners.forEach((l) => l())
  },
}

export function useTactic(): TacticState {
  return useSyncExternalStore(tacticStore.subscribe, tacticStore.get)
}

