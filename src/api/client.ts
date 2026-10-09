import { tokens } from './tokens'
import { careerStore } from '../state/careerStore'
import type { Envelope, TokenResponse } from './types'

export const API_ORIGIN = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '')

/** GitHub Pages gibi statik barındırmada API adresi tanımlı değilse arayüz açılır ama veri gelmez. */
export function isStaticHostWithoutApi(hostname: string = window.location.hostname): boolean {
  return hostname.endsWith('.github.io') && API_ORIGIN === ''
}
const BASE = API_ORIGIN + '/api/v1'

export class ApiError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export const ErrorCodes = {
  insufficientCredit: 'fc.exception.0004',
  premiumRequired: 'fc.exception.0005',
  unauthorized: 'fc.exception.0016',
  careerForbidden: 'fc.exception.0009',
} as const

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface RequestOptions {
  method?: Method
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | string[]>
  auth?: boolean
  /** Ek istek başlıkları (ör. yönetici anahtarı). */
  headers?: Record<string, string>
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(BASE + path, window.location.origin)
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return
    }
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v))
    } else {
      url.searchParams.set(key, String(value))
    }
  })
  return API_ORIGIN ? url.toString() : url.pathname + url.search
}

/** ok: yeni token alındı · invalid: refresh token reddedildi (oturum bitti) · network: bağlantı hatası (oturum korunur, BUG-13). */
type RefreshOutcome = 'ok' | 'invalid' | 'network'

let refreshing: Promise<RefreshOutcome> | null = null

async function callRefresh(refreshToken: string): Promise<RefreshOutcome> {
  try {
    const res = await fetch(BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (res.status >= 500) {
      return 'network'
    }
    const envelope = (await res.json()) as Envelope<TokenResponse>
    if (res.ok && envelope.success && envelope.data) {
      tokens.set(envelope.data.accessToken, envelope.data.refreshToken)
      return 'ok'
    }
    return 'invalid'
  } catch {
    return 'network'
  }
}

/** Sekmeler arasında tek yenileyici: Web Locks varsa kilit alınır; kilidi bekleyen sekme başkasının yenilediği token'ı görürse tekrar çağırmaz. */
async function refreshTokens(): Promise<RefreshOutcome> {
  const refreshToken = tokens.refresh
  if (!refreshToken) {
    return 'invalid'
  }
  refreshing ??= (async () => {
    try {
      const run = async (): Promise<RefreshOutcome> => (tokens.refresh && tokens.refresh !== refreshToken ? 'ok' : callRefresh(refreshToken))
      return typeof navigator !== 'undefined' && navigator.locks ? await navigator.locks.request('fc-token-refresh', run) : await run()
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

async function send(path: string, options: RequestOptions, allowRetry: boolean): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
  const isForm = options.body instanceof FormData
  if (options.body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.auth !== false && tokens.access) {
    headers.Authorization = `Bearer ${tokens.access}`
  }
  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
  })
  if (res.status === 401 && allowRetry && tokens.refresh) {
    const outcome = await refreshTokens()
    if (outcome === 'ok') {
      return send(path, options, false)
    }
    if (outcome === 'network') {
      throw new ApiError('Bağlantı kurulamadı; oturumun korunuyor, biraz sonra tekrar dene.', 'client.network', 0)
    }
  }
  return res
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(path, options, true)
  if (res.status === 204) {
    return undefined as T
  }
  let envelope: Envelope<T> | undefined
  try {
    envelope = (await res.json()) as Envelope<T>
  } catch {
    throw new ApiError('Sunucudan geçersiz yanıt alındı.', 'client.invalid_response', res.status)
  }
  if (res.status === 401) {
    tokens.clear()
  }
  if (!res.ok || !envelope.success) {
    const first = envelope.error?.[0]
    if (first?.code === ErrorCodes.careerForbidden && options.query?.career !== undefined) {
      // Eski/yabancı kariyer kimliği: kimliği bırak ve kariyersiz (model verisiyle) bir kez yeniden dene.
      console.warn('[FCareer] kariyer erişimi reddedildi, careerId temizlendi:', options.query.career)
      careerStore.set(undefined)
      const { career: _dropped, ...rest } = options.query
      return request<T>(path, { ...options, query: rest })
    }
    throw new ApiError(first?.message ?? envelope.message ?? 'İstek başarısız oldu.', first?.code ?? 'client.unknown', res.status)
  }
  return envelope.data as T
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: 'POST', body: body ?? {}, auth }),
}
