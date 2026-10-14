import { describe, expect, it } from 'vitest'
import type { KbItem, PlayerRoleFit, PlayerSummary } from '../../api/types'
import { buildVersions, pickVersion, sortRoles, utPlayerHref } from './utPlayer'

const summary = { id: 1, name: 'Kylian Mbappé', overall: 91, positions: ['ST', 'LW'], faceAssetId: 231747, valuationEstimated: false } as PlayerSummary
const item = (over: Partial<KbItem>): KbItem => ({ id: 10, eaAssetId: 231747, eaResourceId: 231747, name: 'Mbappé', rating: 91, position: 'ST', altPositions: [], cardType: 'NORMAL', rare: false, untradeableOnly: false, status: 'ACTIVE', ...over })

describe('UT oyuncu sayfası: versiyonlar', () => {
  it('KB verisi yokken yalnız base kart (katalogdan)', () => {
    const v = buildVersions(summary, [])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ key: '231747', label: 'Base 91', base: true })
    expect(v[0].itemId).toBeUndefined()
  })

  it('başka oyuncuların kartları dışlanır; base satırı itemId taşır; promo versiyonlar rating azalan', () => {
    const v = buildVersions(summary, [
      item({ id: 11, eaResourceId: 50563395, rating: 93, promo: 'TOTW', cardType: 'NORMAL' }),
      item({ id: 12, eaAssetId: 999, eaResourceId: 999, rating: 99 }),
      item({ id: 10 }),
      item({ id: 13, eaResourceId: 67340611, rating: 94, promo: 'POTM' }),
    ])
    expect(v.map((x) => x.key)).toEqual(['231747', '67340611', '50563395'])
    expect(v[0].itemId).toBe(10)
    expect(v[1]).toMatchObject({ label: 'POTM 94', base: false, itemId: 13 })
  })

  it('?v= seçer; bilinmeyen değerde ilk (base) kart', () => {
    const v = buildVersions(summary, [item({ id: 11, eaResourceId: 50563395, rating: 93, promo: 'TOTW' })])
    expect(pickVersion(v, '50563395').key).toBe('50563395')
    expect(pickVersion(v, 'yok').key).toBe('231747')
    expect(pickVersion(v, null).key).toBe('231747')
  })

  it('oyuncu bağlantısı EA kimliğiyle; kimlik yoksa eski rota', () => {
    expect(utPlayerHref(summary)).toBe('/ut/players/231747')
    expect(utPlayerHref({ ...summary, faceAssetId: undefined })).toBe('/players/1')
  })
})

describe('roller sırası', () => {
  const r = (roleId: string, levelFit: number | undefined, currentFit: number): PlayerRoleFit => ({ position: 'ST', roleId, roleName: roleId, score: currentFit, projectedRating: 80, badgeText: '', reasons: [], gaps: [], levelFit, currentFit })
  it('seviyeye göre uyum azalan; yoksa rol puanı', () => {
    expect(sortRoles([r('a', 60, 90), r('b', 80, 70), r('c', 70, 85)]).map((x) => x.roleId)).toEqual(['b', 'c', 'a'])
    expect(sortRoles([r('a', undefined, 60), r('b', undefined, 80)]).map((x) => x.roleId)).toEqual(['b', 'a'])
  })
})
