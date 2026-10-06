import { useSyncExternalStore } from 'react'
import type { SlotSelection, TacticRequest } from '../api/types'

const KEY = 'fc.tactic'

export interface TeamSetupState {
  buildUp: 'Short' | 'Balanced' | 'Counter'
  depth: number
}

export const DEFAULT_SETUP: TeamSetupState = { buildUp: 'Balanced', depth: 50 }

export interface TacticState {
  formation: string
  presetId?: string
  setup?: TeamSetupState
  slots: Record<string, { tags: string[]; roleId?: string }>
}

export const DEFAULT_TACTIC: TacticState = { formation: '4-3-3', slots: {} }

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

export function toTacticRequest(state: TacticState): TacticRequest {
  const slots: SlotSelection[] = Object.entries(state.slots).map(([slotId, selection]) => ({
    slotId,
    tags: selection.tags,
    roleId: selection.roleId,
  }))
  return { formation: state.formation, presetId: state.presetId, slots }
}

/** Seçili davranışlarla çelişen tag'leri döner (client'ta kilitlenir). */
export function lockedBy(selected: string[], conflictsOf: (id: string) => string[]): Set<string> {
  const locked = new Set<string>()
  selected.forEach((id) => conflictsOf(id).forEach((c) => locked.add(c)))
  return locked
}
