import { describe, expect, it } from 'vitest'
import { playerDetailView, playersView } from './playersView'

describe('/players/:id görünümü (V3-06b)', () => {
  it('kariyer modunda v3 + oturum + seçili kariyer: kariyer oyuncu sayfası (v3 Detay)', () => {
    expect(playerDetailView({ mode: 'career', v3: true, authenticated: true, careerId: 4 })).toBe('career')
  })

  it('v2, oturumsuz, kariyersiz ya da UT modunda mevcut oyuncu sayfası', () => {
    expect(playerDetailView({ mode: 'career', v3: false, authenticated: true, careerId: 4 })).toBe('legacy')
    expect(playerDetailView({ mode: 'career', v3: true, authenticated: false, careerId: 4 })).toBe('legacy')
    expect(playerDetailView({ mode: 'career', v3: true, authenticated: true, careerId: undefined })).toBe('legacy')
    expect(playerDetailView({ mode: 'ut', v3: true, authenticated: true, careerId: 4 })).toBe('legacy')
  })
})

describe('/players görünümü', () => {
  it('UT modunda kart veritabanı', () => {
    expect(playersView({ mode: 'ut', v3: true, authenticated: true, careerId: 4 })).toBe('cards')
  })

  it('kariyer modunda v3 + oturum + seçili kariyer: kariyer listesi (v3 Katalog)', () => {
    expect(playersView({ mode: 'career', v3: true, authenticated: true, careerId: 4 })).toBe('career')
  })

  it('kariyer seçili değilse, oturum yoksa ya da v2 ise mevcut oyuncu araması', () => {
    expect(playersView({ mode: 'career', v3: true, authenticated: true, careerId: undefined })).toBe('legacy')
    expect(playersView({ mode: 'career', v3: true, authenticated: false, careerId: 4 })).toBe('legacy')
    expect(playersView({ mode: 'career', v3: false, authenticated: true, careerId: 4 })).toBe('legacy')
  })
})
