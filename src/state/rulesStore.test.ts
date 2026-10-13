import { afterEach, describe, expect, it, vi } from 'vitest'
import bundled from '../lib/utRules.fc27.json'
import bundledHash from '../lib/utRules.fc27.hash.json'
import { hydrateRules, rulesStore } from './rulesStore'

async function sha256(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((k) => `${JSON.stringify(k)}:${canonical(record[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

describe('rulesStore', () => {
  afterEach(() => rulesStore.reset())

  it('paketli kopyanın hash\'i kayıtlı hash ile aynıdır (kopya değiştiyse npm run sync:rules)', async () => {
    expect(await sha256(canonical(bundled))).toBe(bundledHash.rulesHash)
  })

  it('başlangıçta paketli kopyayı kullanır', () => {
    expect(rulesStore.get()).toBe(bundled)
    expect(rulesStore.source()).toBe('bundled')
    expect(rulesStore.stale()).toBe(false)
  })

  it('sunucudaki geçerli doküman paketli kopyanın yerine geçer', async () => {
    const server = { ...bundled, squadRating: { ...bundled.squadRating, sizes: { squad: 20, sbc: 11 } }, rulesHash: bundledHash.rulesHash }
    await hydrateRules(() => Promise.resolve(server))
    expect(rulesStore.source()).toBe('server')
    expect(rulesStore.get().squadRating.sizes.squad).toBe(20)
    expect(rulesStore.stale()).toBe(false)
  })

  it('sunucu hash\'i paketli kopyadan farklıysa "kural kopyası eski" uyarısı çıkar', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await hydrateRules(() => Promise.resolve({ ...bundled, rulesHash: 'f'.repeat(64) }))
    expect(rulesStore.stale()).toBe(true)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('kural kopyası eski'))
    warn.mockRestore()
  })

  it('ağ ya da biçim hatasında paketli kopya geçerli kalır', async () => {
    await hydrateRules(() => Promise.reject(new Error('ağ')))
    await hydrateRules(() => Promise.resolve({ ok: true }))
    expect(rulesStore.source()).toBe('bundled')
  })
})
