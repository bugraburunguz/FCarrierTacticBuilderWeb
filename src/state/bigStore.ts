import Dexie, { type EntityTable } from 'dexie'
import { useSyncExternalStore } from 'react'

/** Büyük kullanıcı verisi (kulüp kartları, yakalama özeti) için IndexedDB (BUG-05). localStorage yalnız küçük tercihler içindir. */
export const SCHEMA_VERSION = 1

interface Row {
  key: string
  schemaVersion: number
  value: unknown
}

const db = new Dexie('fcareer') as Dexie & { kv: EntityTable<Row, 'key'> }
db.version(1).stores({ kv: 'key' })

const LEGACY_KEYS: Record<string, string> = { utCards: 'fc.utCards', utCapture: 'fc.utCapture' }
const memory = new Map<string, unknown>()
const listeners = new Set<() => void>()
const errorListeners = new Set<() => void>()
let storageError: string | undefined
const channel = typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel('fcareer-store')

function notify() {
  listeners.forEach((l) => l())
}

function setError(message: string | undefined) {
  storageError = message
  errorListeners.forEach((l) => l())
}

async function readLegacy(name: string): Promise<unknown> {
  try {
    const raw = localStorage.getItem(LEGACY_KEYS[name])
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

/** Uygulama açılırken bir kez: IndexedDB'den belleğe yükler; eski localStorage kayıtlarını bir defa taşır ve siler. */
export async function hydrateBigStores(names: string[] = Object.keys(LEGACY_KEYS)): Promise<void> {
  try {
    for (const name of names) {
      const row = await db.kv.get(name)
      if (row) {
        memory.set(name, row.value)
        continue
      }
      const legacy = await readLegacy(name)
      if (legacy !== undefined) {
        await db.kv.put({ key: name, schemaVersion: SCHEMA_VERSION, value: legacy })
        memory.set(name, legacy)
        try {
          localStorage.removeItem(LEGACY_KEYS[name])
        } catch {
          /* ignore */
        }
      }
    }
  } catch (error) {
    setError(`Tarayıcı depolaması açılamadı: ${error instanceof Error ? error.message : 'bilinmeyen hata'}. Veriler bu oturumda kalır, sayfa yenilenince kaybolur.`)
    for (const name of names) {
      memory.set(name, memory.get(name) ?? (await readLegacy(name)))
    }
  }
  channel?.addEventListener('message', async (event: MessageEvent<string>) => {
    const row = await db.kv.get(event.data).catch(() => undefined)
    memory.set(event.data, row?.value)
    notify()
  })
}

export const bigStore = {
  get<T>(name: string): T | undefined {
    return memory.get(name) as T | undefined
  },
  /** Bellek anında güncellenir; IndexedDB yazımı arkada yapılır, başarısızlık depolama uyarısı olarak görünür. */
  set(name: string, value: unknown): void {
    memory.set(name, value)
    notify()
    db.kv
      .put({ key: name, schemaVersion: SCHEMA_VERSION, value })
      .then(() => {
        setError(undefined)
        channel?.postMessage(name)
      })
      .catch((error) => setError(`Veri tarayıcıya kaydedilemedi (${error instanceof Error ? error.name : 'hata'}); alan dolu olabilir. Sayfa yenilenince kaybolabilir.`))
  },
  clear(name: string): void {
    memory.delete(name)
    notify()
    db.kv.delete(name).then(() => channel?.postMessage(name)).catch(() => undefined)
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useStorageError(): string | undefined {
  return useSyncExternalStore(
    (l) => {
      errorListeners.add(l)
      return () => errorListeners.delete(l)
    },
    () => storageError,
  )
}
