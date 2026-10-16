import { describe, expect, it } from 'vitest'
import type { UtCard } from '../../../lib/utCard'
import { LOCK_PARAM, lockIssues, parseLockParam, solveHref } from './lockParam'

const club = (key: string, name: string): UtCard => ({ key, source: 'club', name, rating: 80, positions: ['ST'] })

/** V3-07c: kulüpten "Şu SBC'de kullan" → çözüm sayfası Özelleştir'de kilitli kartlar (adres parametresi) ve uygulanamayan kartların sebebi. */
describe('lockParam', () => {
  it('adres: seçili kart anahtarları tek parametrede; çözüm sayfası bağlantısı', () => {
    expect(solveHref(7700, 77001, ['c:1', 'c:2'])).toBe(`/ut/sbc/7700/77001?${LOCK_PARAM}=c%3A1%2Cc%3A2`)
    expect(parseLockParam(new URLSearchParams(`${LOCK_PARAM}=c%3A1%2Cc%3A2%2C%2Cc%3A1`))).toEqual(['c:1', 'c:2'])
    expect(parseLockParam(new URLSearchParams(''))).toEqual([])
  })

  it('uygulanamayan: kulüpte yok; kulüpte var ama çözüme girmedi; çözümdeki kilitli kart sorun değil', () => {
    const cards = [club('c:1', 'Bir'), club('c:2', 'İki')]
    const issues = lockIssues(['c:1', 'c:2', 'c:9'], cards, [{ cardKey: 'c:1' }])
    expect(issues).toEqual([
      { key: 'c:2', name: 'İki', reason: 'Çözüme girmedi: mevki ya da şartlar uymuyor' },
      { key: 'c:9', reason: 'Kulübünde bulunamadı' },
    ])
  })

  it('aktif kadrodaki kart: çözücü havuzunda yok; sebep "aktif kadronda"', () => {
    expect(lockIssues(['c:5'], [], undefined, new Map([['c:5', 'Beş']]))).toEqual([{ key: 'c:5', name: 'Beş', reason: 'Aktif kadronda: çözücü aktif kadroyu kullanmaz' }])
  })

  it('plan henüz yokken yalnız kulüpte olmayanlar yazılır', () => {
    expect(lockIssues(['c:1', 'c:9'], [club('c:1', 'Bir')], undefined)).toEqual([{ key: 'c:9', reason: 'Kulübünde bulunamadı' }])
  })
})
