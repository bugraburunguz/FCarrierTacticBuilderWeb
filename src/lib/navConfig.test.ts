import { describe, expect, it } from 'vitest'
import { NAV, UT_NAV, navFor } from './navConfig'

// V3-06a: UT'nin yalnız Web App yakalamasıyla beslenen sayfaları yakalama bayrağı kapalıyken menüde (masaüstü + mobil) görünmez.
const CAPTURE_ONLY = ['/ut/club', '/ut/sbc', '/ut/objectives', '/ut/evo', '/ut/import']
const PUBLIC = ['/players', '/ut/squad', '/ut/meta', '/replicas']

describe('UT menüsü ve yakalama bayrağı', () => {
  it('bayrak kapalı: yalnız herkese açık veriyle çalışanlar', () => {
    expect(navFor('ut', false).map((g) => g.to)).toEqual(PUBLIC)
  })

  it('bayrak açık: tüm UT öğeleri (mevcut sıra)', () => {
    expect(navFor('ut', true)).toEqual(UT_NAV)
    expect(UT_NAV.filter((g) => g.captureOnly).map((g) => g.to).sort()).toEqual([...CAPTURE_ONLY].sort())
  })

  it('kariyer menüsü bayraktan etkilenmez', () => {
    expect(navFor('career', false)).toEqual(NAV)
    expect(navFor('career', true)).toEqual(NAV)
  })
})
