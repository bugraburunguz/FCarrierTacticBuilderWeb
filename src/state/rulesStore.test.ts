import { afterEach, describe, expect, it } from 'vitest'
import bundled from '../lib/utRules.fc27.json'
import { hydrateRules, rulesStore } from './rulesStore'

describe('rulesStore', () => {
  afterEach(() => rulesStore.reset())

  it('başlangıçta paketli kopyayı kullanır', () => {
    expect(rulesStore.get()).toBe(bundled)
    expect(rulesStore.source()).toBe('bundled')
  })

  it('sunucudaki geçerli doküman paketli kopyanın yerine geçer', async () => {
    const server = { ...bundled, squadRating: { ...bundled.squadRating, sizes: { squad: 20, sbc: 11 } } }
    await hydrateRules(() => Promise.resolve(server))
    expect(rulesStore.source()).toBe('server')
    expect(rulesStore.get().squadRating.sizes.squad).toBe(20)
  })

  it('ağ ya da biçim hatasında paketli kopya geçerli kalır', async () => {
    await hydrateRules(() => Promise.reject(new Error('ağ')))
    await hydrateRules(() => Promise.resolve({ ok: true }))
    expect(rulesStore.source()).toBe('bundled')
  })
})
