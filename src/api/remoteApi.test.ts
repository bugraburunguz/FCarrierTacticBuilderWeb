import { afterEach, describe, expect, it, vi } from 'vitest'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

async function loadClient() {
  vi.resetModules()
  return import('./client')
}

describe('uzak API adresi (GitHub Pages)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('VITE_API_BASE_URL tanımlıysa istekler tam adrese gider ve sondaki / yok sayılır', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { ok: 1 } }))
    vi.stubGlobal('fetch', fetchMock)
    const { api } = await loadClient()

    await api.get('/players', { pos: ['ST'], size: 5 })

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/v1/players?pos=ST&size=5')
  })

  it('tanımsızsa aynı kaynağa göreli yol kullanılır (Docker/nginx)', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: {} }))
    vi.stubGlobal('fetch', fetchMock)
    const { api } = await loadClient()

    await api.get('/me')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/me')
  })

  it('github.io üzerinde API adresi yoksa uyarı verilir, adres varsa ya da başka sunucudaysa verilmez', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const withoutApi = await loadClient()
    expect(withoutApi.isStaticHostWithoutApi('bugraburunguz.github.io')).toBe(true)
    expect(withoutApi.isStaticHostWithoutApi('localhost')).toBe(false)

    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const withApi = await loadClient()
    expect(withApi.isStaticHostWithoutApi('bugraburunguz.github.io')).toBe(false)
  })
})
