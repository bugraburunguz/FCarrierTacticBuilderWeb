import { tokens } from './tokens'
import type { Envelope, TokenResponse } from './types'

const BASE = '/api/v1'

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
} as const

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export interface RequestOptions {
  method?: Method
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | string[]>
  auth?: boolean
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
  return url.pathname + url.search
}

let refreshing: Promise<boolean> | null = null

async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokens.refresh
  if (!refreshToken) {
    return false
  }
  refreshing ??= (async () => {
    try {
      const res = await fetch(BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const envelope = (await res.json()) as Envelope<TokenResponse>
      if (res.ok && envelope.success && envelope.data) {
        tokens.set(envelope.data.accessToken, envelope.data.refreshToken)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

async function send(path: string, options: RequestOptions, allowRetry: boolean): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
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
  if (res.status === 401 && allowRetry && tokens.refresh && (await refreshTokens())) {
    return send(path, options, false)
  }
  return res
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(path, options, true)
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
    throw new ApiError(first?.message ?? envelope.message ?? 'İstek başarısız oldu.', first?.code ?? 'client.unknown', res.status)
  }
  return envelope.data as T
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: 'POST', body: body ?? {}, auth }),
}
