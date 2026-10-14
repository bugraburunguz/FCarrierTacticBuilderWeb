import { describe, expect, it } from 'vitest'
import { deltaText, fitDisplay, FIT_HELP, futureText, isWeakFit, levelText, ovrGapText, rolePointsText, signedWhole } from './fitLabels'

describe('fitLabels (E3-10b): kariyer ekranlarında tek sözlük', () => {
  it('kullanıcı dilindeki etiketler', () => {
    expect(levelText(95.2)).toBe('Seviyesine göre %95')
    expect(rolePointsText(79.04)).toBe('Rol puanı 79')
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

  it('aynı RoleFit sahada ve listelerde aynı yüzdeyi verir: seviyesine göre (levelFit), yoksa rol puanı', () => {
    expect(fitDisplay({ levelFit: 38.4, score: 65.2, fitLabel: 'WEAK' })).toEqual({ pct: 38, state: 'ok', rolePoints: 65 })
    expect(fitDisplay({ score: 65.2 }).pct).toBe(65)
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
})
