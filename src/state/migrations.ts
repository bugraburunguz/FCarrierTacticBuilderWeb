import type { TacticState } from './tacticStore'

/**
 * Kayıtlı kullanıcı verisi için tek seferlik taşımalar. Bu modül main.tsx'te ilk import edilir; böylece store'lar yüklenmeden önce çalışır.
 * 001: TAC-09 — 5-3-2'nin orta slotu CM iken EA'nın CDM'ine uydu; slot id'si, etiketleri ve geçersiz rolü taşınır.
 */
const DONE_KEY = 'fc.migrations'
const FIVE_THREE_TWO = '5-3-2'
const CDM_ROLE = /^(holding|deep_lying_playmaker|centre_half|wide_half|box_crasher)_/
const TAG_TO_CDM: Record<string, string> = { cm_deep_build: 'cdm_deep_build', cm_ball_winner: 'cdm_destroyer' }

export function migrateTacticState(state: TacticState): TacticState {
  if (state.formation !== FIVE_THREE_TWO || !state.slots.CM) {
    return state
  }
  const { CM, ...rest } = state.slots
  const tags = CM.tags.flatMap((t) => (TAG_TO_CDM[t] ? [TAG_TO_CDM[t]] : []))
  const roleId = CM.roleId && CDM_ROLE.test(CM.roleId) ? CM.roleId : undefined
  return { ...state, slots: { ...rest, CDM: { tags, roleId } } }
}

export function migrateAssignments(all: Record<string, Record<string, number>>, formation: string | undefined): Record<string, Record<string, number>> {
  if (formation !== FIVE_THREE_TWO) {
    return all
  }
  return Object.fromEntries(Object.entries(all).map(([career, slots]) => {
    const { CM, ...rest } = slots
    return [career, CM === undefined ? slots : { ...rest, CDM: CM }]
  }))
}

export function migrateUtSquad<T extends { formationId: string; picked: Record<string, unknown>; roleOverride: Record<string, string> }>(snapshot: T): T {
  if (snapshot.formationId !== FIVE_THREE_TWO || !('CM' in snapshot.picked || 'CM' in snapshot.roleOverride)) {
    return snapshot
  }
  const { CM, ...picked } = snapshot.picked
  const { CM: role, ...roleOverride } = snapshot.roleOverride
  return { ...snapshot, picked: CM === undefined ? picked : { ...picked, CDM: CM }, roleOverride: role && CDM_ROLE.test(role) ? { ...roleOverride, CDM: role } : roleOverride }
}

function readJson<T>(storage: Storage, key: string): T | undefined {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

export function runStorageMigrations(storage: Storage): void {
  try {
    const done = readJson<string[]>(storage, DONE_KEY) ?? []
    if (done.includes('001-532-cdm-slot')) {
      return
    }
    const tactic = readJson<TacticState>(storage, 'fc.tactic')
    if (tactic?.slots) {
      storage.setItem('fc.tactic', JSON.stringify(migrateTacticState(tactic)))
      const lineup = readJson<Record<string, Record<string, number>>>(storage, 'fc.lineup')
      if (lineup) {
        storage.setItem('fc.lineup', JSON.stringify(migrateAssignments(lineup, tactic.formation)))
      }
    }
    const ut = readJson<{ formationId: string; picked: Record<string, unknown>; roleOverride: Record<string, string> }>(storage, 'fc.utSquad')
    if (ut?.picked) {
      storage.setItem('fc.utSquad', JSON.stringify(migrateUtSquad({ ...ut, roleOverride: ut.roleOverride ?? {} })))
    }
    storage.setItem(DONE_KEY, JSON.stringify([...done, '001-532-cdm-slot']))
  } catch {
    /* depolama erişilemiyorsa taşınacak veri de yoktur */
  }
}

if (typeof localStorage !== 'undefined') {
  runStorageMigrations(localStorage)
}
