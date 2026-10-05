import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './client'
import { tokens } from './tokens'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('api client', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    tokens.clear()
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('unwraps the success envelope and sends the bearer token', async () => {
    tokens.set('access-1', 'refresh-1')
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: 1 } }))

    const data = await api.get<{ ok: number }>('/me')

    expect(data).toEqual({ ok: 1 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/me')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-1')
  })

  it('turns business errors (HTTP 200, success=false) into ApiError with the server message and code', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: [{ code: 'fc.exception.0004', message: 'Yeterli krediniz yok.' }] }))

    await expect(api.post('/fit/squad', {})).rejects.toMatchObject({ code: 'fc.exception.0004', message: 'Yeterli krediniz yok.', status: 200 })
  })

  it('refreshes once on 401 and retries with the rotated token', async () => {
    tokens.set('expired', 'refresh-1')
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: false, error: [{ code: 'fc.exception.0016', message: 'x' }] }, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: 'access-2', refreshToken: 'refresh-2' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 7 } }))

    const data = await api.get<{ id: number }>('/me')

    expect(data).toEqual({ id: 7 })
    expect(tokens.access).toBe('access-2')
    expect(tokens.refresh).toBe('refresh-2')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect((fetchMock.mock.calls[2][1].headers as Record<string, string>).Authorization).toBe('Bearer access-2')
  })

  it('clears the session when the refresh token is rejected', async () => {
    tokens.set('expired', 'bad-refresh')
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: false, error: [{ code: 'fc.exception.0016', message: 'x' }] }, 401))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: [{ code: 'fc.exception.0008', message: 'x' }] }))

    await expect(api.get('/me')).rejects.toBeInstanceOf(ApiError)
    expect(tokens.authenticated).toBe(false)
  })

  it('serialises array and attribute-bound query params and skips empty ones', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: [] }))

    await api.get('/players', { pos: ['ST', 'CF'], finishing_min: 66, q: '', sort: undefined })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/players?pos=ST&pos=CF&finishing_min=66')
  })

  it('reports an invalid server response instead of throwing a raw parse error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>502</html>', { status: 502 }))

    await expect(api.get('/me')).rejects.toMatchObject({ code: 'client.invalid_response', status: 502 })
  })
})
