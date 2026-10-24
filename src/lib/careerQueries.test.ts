import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { invalidateCareerScope, removeCareerScope } from './careerQueries'

const seed = () => {
  const client = new QueryClient()
  const keys = [
    ['careers'], ['squad', 7], ['player-facets', 7], ['snapshots', 7], ['starter-tactic', 7], ['main-tactic', 7], ['slot-fit', 'lineup', 7, '{}', '{}'],
    ['career-player', 7, 120], ['career-player-contract', 7, 120], ['wonderkids', { career: 7 }], ['squad', 8], ['roles'], ['formations'],
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
      ['career-player', 7, 120], ['career-player-contract', 7, 120], ['wonderkids', { career: 7 }]]) {
      expect(stale(client, key), JSON.stringify(key)).toBe(true)
    }
    for (const key of [['squad', 8], ['roles'], ['formations']]) {
      expect(stale(client, key), JSON.stringify(key)).toBe(false)
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
