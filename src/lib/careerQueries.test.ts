import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { invalidateCareerScope, removeCareerScope } from './careerQueries'

const seed = () => {
  const client = new QueryClient()
  const keys = [
    ['careers'], ['squad', 7], ['player-facets', 7], ['snapshots', 7], ['starter-tactic', 7], ['main-tactic', 7], ['slot-fit', 'lineup', 7, '{}', '{}'],
    ['career-player', 7, 120], ['career-player-contract', 7, 120], ['wonderkids', {}, 7], ['squad', 8], ['roles'], ['formations'],
  ]
  keys.forEach((k) => client.setQueryData(k, { ok: true }))
  return client
}
const stale = (client: QueryClient, key: unknown[]) => client.getQueryState(key)?.isInvalidated === true

/** REVIEW Y2/Y3/O4: içe aktarma, kadro hareketi, ayar ve silme sonrası kariyere bağlı bütün önbellek tek yerden tazelenir / silinir. */
describe('careerQueries', () => {
  it('invalidateCareerScope: anahtarında kariyer kimliği geçen her sorgu + kariyer listesi; başka kariyer ve genel referans veri dokunulmaz', async () => {
    const client = seed()
    await invalidateCareerScope(client, 7)
    for (const key of [['careers'], ['squad', 7], ['player-facets', 7], ['snapshots', 7], ['starter-tactic', 7], ['main-tactic', 7], ['slot-fit', 'lineup', 7, '{}', '{}'],
      ['career-player', 7, 120], ['career-player-contract', 7, 120], ['wonderkids', {}, 7]]) {
      expect(stale(client, key), JSON.stringify(key)).toBe(true)
    }
    for (const key of [['squad', 8], ['roles'], ['formations']]) {
      expect(stale(client, key), JSON.stringify(key)).toBe(false)
    }
  })

  it('ACADEMY-b: altyapı kariyer kapsamında (içe aktarma ve spoiler ayarı sonrası eski kesin POT kalmaz)', async () => {
    const client = seed()
    client.setQueryData(['academy', 7], { ok: true })
    client.setQueryData(['academy', 8], { ok: true })
    await invalidateCareerScope(client, 7)
    expect(stale(client, ['academy', 7])).toBe(true)
    expect(stale(client, ['academy', 8])).toBe(false)
  })

  it('FIT-3 inceleme: gelişim önerileri, kurulum kontrolü ve taktik analizi de kariyer kapsamında (içe aktarma sonrası eski kalmaz)', async () => {
    const client = new QueryClient()
    const keys = [['development-recommendations', 7, '[]'], ['setup-check', 7, 'Balanced', 50], ['tactic-analysis', 7, '{}'], ['development-recommendations', 8, '[]']]
    keys.forEach((k) => client.setQueryData(k, { ok: true }))
    await invalidateCareerScope(client, 7)
    keys.slice(0, 3).forEach((k) => expect(stale(client, k), JSON.stringify(k)).toBe(true))
    expect(stale(client, keys[3])).toBe(false)
  })

  it('kimlik yalnız kariyer konumunda sayılır: aynı sayıyı taşıyan ilgisiz anahtarlar (cinsiyet, oyuncu/asset id, filtre) silinmez', () => {
    const client = new QueryClient()
    const unrelated = [['leagues', 7], ['clubs', 'ab', 7], ['transfer-search', 'ab', 7], ['ut-player', 7], ['kb-prices', 7, 'ps'], ['slot-fit', 'v3', 7, 'r', 'ST', ''], ['wonderkids', { maxAge: 7 }, 8], ['player', 7, 8]]
    const related = [['wonderkids', { maxAge: 21 }, 7], ['player', 120, 7], ['player-roles-v3', 120, 7], ['slot-fit', 'replica', 7, 'x']]
    ;[...unrelated, ...related].forEach((k) => client.setQueryData(k, { ok: true }))
    removeCareerScope(client, 7)
    for (const key of unrelated) {
      expect(client.getQueryData(key), JSON.stringify(key)).toEqual({ ok: true })
    }
    for (const key of related) {
      expect(client.getQueryData(key), JSON.stringify(key)).toBeUndefined()
    }
  })

  it('removeCareerScope: silinen kariyerin sorguları önbellekten kalkar (silinmiş kimlikle yeniden istek atılmaz)', () => {
    const client = seed()
    removeCareerScope(client, 7)
    expect(client.getQueryData(['squad', 7])).toBeUndefined()
    expect(client.getQueryData(['slot-fit', 'lineup', 7, '{}', '{}'])).toBeUndefined()
    expect(client.getQueryData(['squad', 8])).toEqual({ ok: true })
    expect(client.getQueryData(['roles'])).toEqual({ ok: true })
  })
})
