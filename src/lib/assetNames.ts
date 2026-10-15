import { useEffect, useSyncExternalStore } from 'react'
import { endpoints } from '../api/endpoints'

/** /players/assets üst sınırı (backend MAX_ASSET_IDS). */
const BATCH = 100

/** null: katalogda yok (ya da istek başarısız); tanımsız: henüz sorulmadı. */
const names = new Map<number, string | null>()
const queued = new Set<number>()
const listeners = new Set<() => void>()
let version = 0
let scheduled = false

function notify() {
  version++
  listeners.forEach((l) => l())
}

async function flush() {
  scheduled = false
  const ids = [...queued]
  queued.clear()
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH)
    try {
      const found = await endpoints.playerAssetNames(chunk)
      chunk.forEach((id) => names.set(id, found.find((f) => f.assetId === id)?.name ?? null))
    } catch {
      chunk.forEach((id) => names.set(id, null))
    }
  }
  notify()
}

/**
 * V3-05d-c: kart adı EA assetId → katalog (`GET /players/assets`), sayfadaki tüm kartlar için tek istekte (aynı tick'te istenenler birleşir).
 * Kulüp kartının çizildiği her yer (çözüm sahası, Kadrom, Kadro kurucu, tek kart listesi) PlayerCard / CardName üzerinden bunu kullanır.
 */
export const assetNames = {
  request(id: number) {
    if (names.has(id) || queued.has(id)) {
      return
    }
    queued.add(id)
    if (!scheduled) {
      scheduled = true
      queueMicrotask(() => void flush())
    }
  },
  get: (id: number) => names.get(id),
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  /** Testler için. */
  reset() {
    names.clear()
    queued.clear()
    scheduled = false
    notify()
  },
}

export function useAssetName(assetId: number | undefined): string | null | undefined {
  useSyncExternalStore(assetNames.subscribe, () => version)
  useEffect(() => {
    if (assetId !== undefined && assetId > 0) {
      assetNames.request(assetId)
    }
  }, [assetId])
  return assetId === undefined ? undefined : assetNames.get(assetId)
}

/** Yakalanan ad gerçek mi: "#123" ya da yalnız rakam değil, en az bir harf içerir. */
export const isRealName = (name: string | undefined): name is string => Boolean(name && /\p{L}/u.test(name) && !/^#/.test(name.trim()))

/** Ad şeridi: harf içeren son sözcük (rakamla biten adda rakam gösterilmez). */
export function stripName(name: string): string {
  const words = name.trim().split(/\s+/)
  return [...words].reverse().find((w) => /\p{L}/u.test(w)) ?? name
}

export interface DisplayName {
  /** Tam ad (bilinmiyorsa tanımsız). */
  full?: string
  /** Ad şeridi metni: soyad ya da "ST 84". */
  strip: string
  /** title / erişilebilir ad. */
  title: string
}

/** Öncelik: katalog adı (assetId) → yakalanan gerçek ad → mevki + reyting ("Ad bilinmiyor"). */
export function displayName(catalog: string | null | undefined, captured: string | undefined, position: string | undefined, rating: number): DisplayName {
  const full = catalog ?? (isRealName(captured) ? captured : undefined)
  return full ? { full, strip: stripName(full), title: full } : { strip: `${position ?? ''} ${rating}`.trim(), title: 'Ad bilinmiyor' }
}
