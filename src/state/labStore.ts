import { useSyncExternalStore } from 'react'
import type { Lineup, TacticState } from '../lib/tactic'

/*
 * Katman 3 · Lab taslağı (KARIYER-UX D-28): Taktik Laboratuvarı denemeleri, kariyere göre anahtarlı, yalnız tarayıcıda (fc.lab.v1).
 * Başka hiçbir sayfayı etkilemez; "Ana taktiğim yap" tek köprüdür. Taslak kaynaktan (ana taktik, öneri, replika) structuredClone ile türetilir;
 * sorgu önbelleğiyle referans paylaşmaz. Sınır dolunca yeni taslak açılmaz ve hiçbir taslak sessizce silinmez.
 */
export const LAB_KEY = 'fc.lab.v1'
export const LAB_DRAFT_LIMIT = 10
const LIMIT_MESSAGE = `Taslak sınırı (${LAB_DRAFT_LIMIT}). Birini sil ya da ana taktik yap.`

export type DraftOriginKind = 'main' | 'replica' | 'wizard' | 'code' | 'blank' | 'auto'

export interface Draft {
  id: string
  name: string
  origin: { kind: DraftOriginKind; ref?: string }
  tactic: TacticState
  lineup: Lineup
  /** "Ana taktiğim yap" ile kaydedildiği slot. */
  savedTo?: { slot: number; at: string }
  dirty: boolean
  updatedAt: string
}

export interface CareerLab {
  activeId: string | null
  drafts: Draft[]
}

type LabState = Record<string, CareerLab>
type NewDraft = Pick<Draft, 'name' | 'origin' | 'tactic' | 'lineup'>
export type CreateResult = { ok: true; draft: Draft } | { ok: false; message: string }

const EMPTY: CareerLab = Object.freeze({ activeId: null, drafts: [] }) as CareerLab

let current: LabState = load()
const listeners = new Set<() => void>()

function load(): LabState {
  try {
    const raw = localStorage.getItem(LAB_KEY)
    const parsed = raw ? (JSON.parse(raw) as LabState) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function commit(next: LabState) {
  current = next
  try {
    localStorage.setItem(LAB_KEY, JSON.stringify(current))
  } catch {
    /* depolama dolu ya da kapalı: taslak bu oturumda bellekte kalır */
  }
  listeners.forEach((l) => l())
}

function updateCareer(careerId: number, change: (lab: CareerLab) => CareerLab) {
  const key = String(careerId)
  commit({ ...current, [key]: change(current[key] ?? EMPTY) })
}

const now = () => new Date().toISOString()
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`)

export const labStore = {
  get: (careerId: number): CareerLab => current[String(careerId)] ?? EMPTY,

  create(careerId: number, input: NewDraft): CreateResult {
    const lab = labStore.get(careerId)
    if (lab.drafts.length >= LAB_DRAFT_LIMIT) {
      return { ok: false, message: LIMIT_MESSAGE }
    }
    const draft: Draft = {
      id: newId(),
      name: input.name,
      origin: { ...input.origin },
      tactic: structuredClone(input.tactic),
      lineup: structuredClone(input.lineup),
      dirty: true,
      updatedAt: now(),
    }
    updateCareer(careerId, (cur) => ({ activeId: draft.id, drafts: [...cur.drafts, draft] }))
    return { ok: true, draft }
  },

  /** Taslağı günceller ve kirletir. change yeni nesne döner; kaynak nesneler değiştirilmez. */
  patch(careerId: number, id: string, change: (draft: Draft) => Partial<Pick<Draft, 'name' | 'tactic' | 'lineup'>>) {
    updateCareer(careerId, (cur) => ({
      ...cur,
      drafts: cur.drafts.map((d) => (d.id === id ? { ...d, ...structuredClone(change(d)), dirty: true, updatedAt: now() } : d)),
    }))
  },

  markSaved(careerId: number, id: string, slot: number) {
    updateCareer(careerId, (cur) => ({
      ...cur,
      drafts: cur.drafts.map((d) => (d.id === id ? { ...d, dirty: false, savedTo: { slot, at: now() }, updatedAt: now() } : d)),
    }))
  },

  setActive(careerId: number, id: string) {
    updateCareer(careerId, (cur) => ({ ...cur, activeId: cur.drafts.some((d) => d.id === id) ? id : cur.activeId }))
  },

  remove(careerId: number, id: string) {
    updateCareer(careerId, (cur) => {
      const drafts = cur.drafts.filter((d) => d.id !== id)
      const activeId = cur.activeId === id ? (drafts[drafts.length - 1]?.id ?? null) : cur.activeId
      return { activeId, drafts }
    })
  },

  /** Kariyer silinince taslakları da gider (kariyerler arası sızıntı yok). */
  dropCareer(careerId: number) {
    const { [String(careerId)]: _dropped, ...rest } = current
    commit(rest)
  },

  /** Kaydedilmemiş (kirli) taslak var mı: nav'daki "Taktik Lab" noktası ve taslak çubuğu "•". */
  hasUnsaved: (careerId: number) => labStore.get(careerId).drafts.some((d) => d.dirty),

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  reload() {
    current = load()
    listeners.forEach((l) => l())
  },
}

export function useLab(careerId: number | undefined): CareerLab {
  return useSyncExternalStore(labStore.subscribe, () => (careerId === undefined ? EMPTY : labStore.get(careerId)))
}
