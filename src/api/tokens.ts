const ACCESS_KEY = 'fc.access'
const REFRESH_KEY = 'fc.refresh'

type Listener = () => void
const listeners = new Set<Listener>()

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    /* storage unavailable (private mode) — session stays in memory only */
  }
}

let memoryAccess: string | null = null
let memoryRefresh: string | null = null

export const tokens = {
  get access(): string | null {
    return memoryAccess ?? read(ACCESS_KEY)
  },
  get refresh(): string | null {
    return memoryRefresh ?? read(REFRESH_KEY)
  },
  set(access: string, refresh: string) {
    memoryAccess = access
    memoryRefresh = refresh
    write(ACCESS_KEY, access)
    write(REFRESH_KEY, refresh)
    listeners.forEach((l) => l())
  },
  clear() {
    memoryAccess = null
    memoryRefresh = null
    write(ACCESS_KEY, null)
    write(REFRESH_KEY, null)
    listeners.forEach((l) => l())
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get authenticated(): boolean {
    return this.access !== null
  },
}
