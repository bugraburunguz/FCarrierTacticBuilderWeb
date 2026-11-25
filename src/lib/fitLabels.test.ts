import { describe, expect, it } from 'vitest'
import { alternativeFitText, betterRoleText, deltaText, fitDisplay, FIT_HELP, FIT_TERMS, fitTitle, futureText, isWeakClass, isWeakFit, levelFitText, levelText, ovrGapText, roleFitText, rolePointsText, signedWhole, strengthText, SQUAD_FIT_TEXT, teamRoleFit, teamStrength, WEAK_CLASS_TEXT } from './fitLabels'
import { roleFitBasis } from './squadBuilder'

describe('FCA-43: Güç ana sayı, seviye yüzdesi ikinci sırada', () => {
  it('fitDisplay gösterilen sayıyı Güç yapar (Lolos 62 / Páez 74 yanılgısı)', () => {
    const paez = fitDisplay({ levelFit: 53.3, currentFit: 64.7, fitLabel: 'AT_LEVEL' })
    const lolos = fitDisplay({ levelFit: 60.2, currentFit: 40.7, fitLabel: 'AT_LEVEL' })
    expect(paez).toMatchObject({ pct: 65, metric: 'Güç', strength: 65, roleFit: 53 })
    expect(lolos).toMatchObject({ pct: 41, metric: 'Güç', roleFit: 60 })
    expect(paez.pct).toBeGreaterThan(lolos.pct)
  })

  it('başlık önce Güç, sonra seviyesine göre yüzde', () => {
    expect(levelFitText(38.4)).toBe('seviyesine göre %38')
    expect(fitTitle(fitDisplay({ levelFit: 38.4, currentFit: 65.2 }))).toBe('Güç 65 · seviyesine göre %38')
    expect(fitTitle(fitDisplay({ score: 65.2 }))).toBe('Güç 65')
  })

  it('rol alternatifi ve "Daha uygun rol" Güç ile yazılır ve Güç ile sıralanır', () => {
    expect(alternativeFitText({ currentFit: 80.6, levelFit: 83.8 })).toBe('Güç 81')
    expect(betterRoleText({ roleName: 'Fullback (Defend)', currentFit: 80.6, levelFit: 83.8 })).toBe('Daha uygun rol: Fullback (Defend) · Güç 81')
    expect(roleFitBasis({ currentFit: 80.6, levelFit: 83.8 })).toBeGreaterThan(roleFitBasis({ currentFit: 77.5, levelFit: 91.9 }))
    expect(roleFitBasis({ currentFit: 70, levelFit: null })).toBeGreaterThan(roleFitBasis({ currentFit: 60, levelFit: 95 }))
  })

  it('rozet renginin seviyeye göre olduğu yardımda yazar', () => {
    expect(FIT_HELP.level).toContain('Rozet rengi')
    expect(FIT_HELP.level).toContain('seviye')
  })
})

describe('fitLabels (E3-10b): kariyer ekranlarında tek sözlük', () => {
  it('kullanıcı dilindeki etiketler (FIT-1: iki metrik iki ayrı ad)', () => {
    expect(roleFitText(95.2)).toBe('Rol oturması %95')
    expect(strengthText(79.04)).toBe('Güç 79')
    // UT ekranlarının adları değişmez.
    expect(levelText(95.2)).toBe('Seviyesine göre %95')
    expect(rolePointsText(79.04)).toBe('Rol puanı 79')
    expect(FIT_TERMS.strength).toMatchObject({ name: 'Güç', team: 'Takım gücü' })
    expect(FIT_TERMS.roleFit).toMatchObject({ name: 'Rol oturması', team: 'Rol oturması' })
    expect(SQUAD_FIT_TEXT).toBe('Takım gücü')
    expect(futureText(83.8)).toBe('Gelecek sezon 84')
    expect(deltaText(5.0)).toBe('Mevcut oyuncuya göre +5')
    expect(deltaText(-2.6)).toBe('Mevcut oyuncuya göre -3')
    expect(ovrGapText(3.1)).toBe('İlk 11 ortalamasına göre +3')
    expect(ovrGapText(0.2)).toBe('İlk 11 ortalamasına göre 0')
  })

  it('işaretli tam sayı: sıfır işaretsiz', () => {
    expect(signedWhole(0.4)).toBe('0')
    expect(signedWhole(-0.4)).toBe('0')
    expect(signedWhole(1.5)).toBe('+2')
  })

  it('her terimin kısa açıklaması var', () => {
    for (const key of ['level', 'rolePoints', 'future', 'delta', 'ovrGap'] as const) {
      expect(FIT_HELP[key].length).toBeGreaterThan(10)
    }
  })

  it('aynı RoleFit sahada ve listelerde aynı sayıyı verir: Güç ana sayı, seviye ikinci; rozetteki sayının adı da döner', () => {
    expect(fitDisplay({ levelFit: 38.4, currentFit: 65.2, fitLabel: 'WEAK' })).toEqual({ pct: 65, state: 'ok', rolePoints: 65, strength: 65, roleFit: 38, metric: 'Güç' })
    expect(fitDisplay({ score: 65.2 })).toMatchObject({ pct: 65, strength: 65, roleFit: undefined, metric: 'Güç' })
    expect(fitTitle(fitDisplay({ levelFit: 38.4, currentFit: 65.2 }))).toBe('Güç 65 · seviyesine göre %38')
    expect(fitTitle(fitDisplay({ score: 65.2 }))).toBe('Güç 65')
    expect(fitDisplay({ levelFit: 50, score: 60, fitLabel: 'AT_LEVEL' }).state).toBe('neutral')
    expect(fitDisplay({ levelFit: 80, score: 90, fitLabel: 'GOOD' }).state).toBe('good')
    expect(fitDisplay({ levelFit: 10, score: 40, fitLabel: 'WRONG_ROLE' }).state).toBe('bad')
  })

  it('zayıf halka yalnız sarı (WEAK) ve kırmızı (WRONG_ROLE) bantlar; eşikler sunucudan gelen etikettedir', () => {
    expect(isWeakFit('WEAK')).toBe(true)
    expect(isWeakFit('WRONG_ROLE')).toBe(true)
    expect(isWeakFit('AT_LEVEL')).toBe(false)
    expect(isWeakFit('GOOD')).toBe(false)
    expect(isWeakFit(undefined)).toBe(false)
  })

  it('FIT-1: takım düzeyi iki değer — Takım gücü (Güç ortalaması) ve Rol oturması (oturma ortalaması; bilinmeyen atlanır)', () => {
    const displays = [fitDisplay({ levelFit: 40, currentFit: 70 }), fitDisplay({ levelFit: 60, currentFit: 80 }), fitDisplay({ currentFit: 90 })]
    expect(teamStrength(displays)).toBe(80)
    expect(teamRoleFit(displays)).toBe(50)
    expect(teamStrength([])).toBeUndefined()
    expect(teamRoleFit([fitDisplay({ currentFit: 90 })])).toBeUndefined()
  })

  it('FIT-1: zayıf halka sınıfı metinleri; sınıf yoksa (eski sunucu) etiket kuralına düşer', () => {
    expect(WEAK_CLASS_TEXT.KALITE_ACIGI).toBe('Kalite açığı')
    expect(WEAK_CLASS_TEXT.ROL_UYUMSUZ).toBe('Rol uyumsuz')
    expect(WEAK_CLASS_TEXT.IKISI).toBe('Kalite açığı + rol uyumsuz')
    expect(isWeakClass('UYGUN', 'WRONG_ROLE')).toBe(false)
    expect(isWeakClass('KALITE_ACIGI', 'GOOD')).toBe(true)
    expect(isWeakClass(undefined, 'WEAK')).toBe(true)
    expect(isWeakClass(undefined, 'AT_LEVEL')).toBe(false)
  })
})
