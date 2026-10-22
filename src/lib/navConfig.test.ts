import { describe, expect, it } from 'vitest'
import { activeNav, CAREER_MORE, mobileBar, NAV, UT_NAV, navFor } from './navConfig'

describe('v3 kariyer menüsü tek (V3-06d)', () => {
  const career = navFor('career', true, true)

  it('sıra: Masa · Oyuncular · Taktik & Kadro · Transfer · Gelişim · Takımlar · İçe aktar; üst sekme yok', () => {
    expect(career.map((g) => g.label)).toEqual(['Masa', 'Oyuncular', 'Taktik & Kadro', 'Transfer', 'Gelişim', 'Takımlar', 'İçe aktar'])
    expect(career.find((g) => g.to === '/career/dashboard')?.tabs).toBeUndefined()
  })

  it.each([
    ['/career/dashboard', 'Masa'], ['/career/desk', 'Masa'], ['/career/new', 'Masa'], ['/career/transfer', 'Transfer'], ['/career/growth', 'Gelişim'],
    ['/players', 'Oyuncular'], ['/players/12', 'Oyuncular'], ['/wonderkids', 'Oyuncular'], ['/compare', 'Oyuncular'],
    ['/squad/builder', 'Taktik & Kadro'], ['/squad', 'Taktik & Kadro'], ['/career/squad', 'Taktik & Kadro'], ['/tactics/wizard', 'Taktik & Kadro'], ['/replicas/3', 'Taktik & Kadro'],
    ['/teams', 'Takımlar'], ['/career/import', 'İçe aktar'],
  ])('%s → %s aktif', (path, label) => {
    expect(activeNav(career, path)?.label).toBe(label)
  })

  it('mobil alt çubuk en çok 5: Masa, Oyuncular, Kadro, Transfer + Daha fazla (Gelişim, Takımlar, İçe aktar, Yeni kariyer)', () => {
    const bar = mobileBar('career', career)
    expect(bar.items.map((g) => g.mobileLabel ?? g.label)).toEqual(['Masa', 'Oyuncular', 'Kadro', 'Transfer'])
    // KARIYER-UX FAZ 3: "Kadro" yeni Kadro Analizi sayfasına gider (mobil öğe ve sayfa içi ilk sekme).
    const squadGroup = career.find((g) => g.mobileLabel === 'Kadro')!
    expect(squadGroup.to).toBe('/career/squad')
    expect(squadGroup.tabs?.find((t) => t.label === 'Kadro')?.to).toBe('/career/squad')
    expect(bar.more.map((g) => g.label)).toEqual(['Gelişim', 'Takımlar', 'İçe aktar', 'Yeni kariyer'])
    expect(CAREER_MORE.map((g) => g.to)).toEqual(['/career/new'])
  })

  it('UT mobil çubuğu değişmez (ilk 5, Daha fazla yok); v2 kariyer menüsü değişmez', () => {
    const ut = navFor('ut', true, true)
    expect(ut).toEqual(UT_NAV)
    expect(mobileBar('ut', ut)).toEqual({ items: UT_NAV.slice(0, 5), more: [] })
    expect(navFor('career', true)).toEqual(NAV)
  })
})

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
