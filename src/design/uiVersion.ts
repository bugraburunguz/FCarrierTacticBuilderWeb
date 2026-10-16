import { useSyncExternalStore } from 'react'

/**
 * v3 ön izleme bayrağı (docs/review/v2/11 §10): `?ui=v3` açar, `?ui=v2` kapatır; seçim oturum boyunca (sessionStorage) kalır.
 * Karma görünüm yok: bayrak açıkken tüm sayfalar v3 token'larıyla çizilir (taşınmamış sayfalar köprü token'larıyla).
 */
export type UiVersion = 'v2' | 'v3'
export type Transparency = 'auto' | 'reduced'

const UI_KEY = 'fc.ui'
const TRANSPARENCY_KEY = 'fc.transparency'

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}

function write(storage: () => Storage, key: string, value: string | null) {
  try {
    if (value === null) {
      storage().removeItem(key)
    } else {
      storage().setItem(key, value)
    }
  } catch {
    /* depolama yok: bayrak yalnız bu sayfa yüklemesi için geçerli */
  }
}

/** Adres satırındaki `ui` parametresini oturum bayrağına yazar ve geçerli sürümü döner. */
export function resolveUiVersion(search: string): UiVersion {
  const requested = new URLSearchParams(search).get('ui')
  if (requested === 'v3') {
    write(() => sessionStorage, UI_KEY, 'v3')
    return 'v3'
  }
  if (requested === 'v2') {
    write(() => sessionStorage, UI_KEY, null)
    return 'v2'
  }
  return read(() => sessionStorage, UI_KEY) === 'v3' ? 'v3' : 'v2'
}

export function isV3(): boolean {
  return document.documentElement.dataset.ui === 'v3'
}

const listeners = new Set<() => void>()
let transparency: Transparency = read(() => localStorage, TRANSPARENCY_KEY) === 'reduced' ? 'reduced' : 'auto'

export const transparencyStore = {
  get: () => transparency,
  set(next: Transparency) {
    transparency = next
    write(() => localStorage, TRANSPARENCY_KEY, next === 'reduced' ? 'reduced' : null)
    applyDesignAttributes()
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useTransparency(): Transparency {
  return useSyncExternalStore(transparencyStore.subscribe, transparencyStore.get)
}

/** Tema (`.dark` sınıfı), mod ve şeffaflık ayarını v3 CSS'inin okuduğu `data-*` öznitelikleriyle eşler. */
export function applyDesignAttributes(mode?: 'career' | 'ut') {
  const root = document.documentElement
  if (root.dataset.ui !== 'v3') {
    return
  }
  root.dataset.theme = root.classList.contains('dark') ? 'dark' : 'light'
  if (mode) {
    root.dataset.mode = mode
  }
  if (transparency === 'reduced') {
    root.dataset.transparency = 'reduced'
  } else {
    delete root.dataset.transparency
  }
}
