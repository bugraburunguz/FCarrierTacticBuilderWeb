import { describe, expect, it } from 'vitest'
import { PLAYSTYLES, triggerResults } from './playstyles'
import { thresholdNotes } from './thresholds'

describe('PlayStyle tetikleyici ipuçları', () => {
  it('eşikler sağlanıyorsa met, 3 puan içindeyse close, uzaksa far döner', () => {
    expect(triggerResults({ LongPassing: 86, Vision: 84 }, {}).find((r) => r.playstyle === 'LongBallPass')?.state).toBe('met')
    expect(triggerResults({ LongPassing: 83, Vision: 82 }, {}).find((r) => r.playstyle === 'LongBallPass')?.state).toBe('close')
    expect(triggerResults({ LongPassing: 70, Vision: 82 }, {}).find((r) => r.playstyle === 'LongBallPass')?.state).toBe('far')
  })

  it('PS+ zaten varsa o PlayStyle için ipucu verilmez', () => {
    const results = triggerResults({ Finishing: 90, Curve: 90 }, { FinesseShot: 2 })
    expect(results.find((r) => r.playstyle === 'FinesseShot')).toBeUndefined()
  })

  it('katalogdaki 36 PlayStyle kimliği için açıklama var', () => {
    const outfield = ['FinesseShot', 'ChipShot', 'PowerShot', 'DeadBall', 'PrecisionHeader', 'Acrobatic', 'LowDrivenShot',
      'Gamechanger', 'IncisivePass', 'PingedPass', 'LongBallPass', 'TikiTaka', 'WhippedPass', 'Inventive',
      'Jockey', 'Block', 'Intercept', 'Anticipate', 'SlideTackle', 'AerialFortress', 'Technical', 'Rapid',
      'FirstTouch', 'Trickster', 'PressProven', 'QuickStep', 'Relentless', 'LongThrow', 'Bruiser', 'Enforcer',
      'FarThrow', 'Footwork', 'CrossClaimer', 'RushOut', 'FarReach', 'Deflector']
    expect(outfield.filter((id) => !PLAYSTYLES[id])).toEqual([])
  })
})

describe('eşik notları', () => {
  it('forvette soğukkanlılık ve dayanıklılık notu mevkiye göre gelir', () => {
    const notes = thresholdNotes({ Composure: 80, Vision: 90, Stamina: 50 }, ['ST'])
    expect(notes.map((n) => n.id)).toEqual(['composure'])
    expect(notes[0].tone).toBe('warn')
  })

  it('bekte dayanıklılık düşükse uyarır', () => {
    const notes = thresholdNotes({ Stamina: 60 }, ['RB'])
    expect(notes.find((n) => n.id === 'stamina')?.tone).toBe('warn')
  })

  it('hızlanma ile sprint hızı arasında 8+ fark varsa not üretir', () => {
    expect(thresholdNotes({ Acceleration: 90, SprintSpeed: 78 }, ['CB']).some((n) => n.id === 'pace-gap')).toBe(true)
    expect(thresholdNotes({ Acceleration: 80, SprintSpeed: 78 }, ['CB']).some((n) => n.id === 'pace-gap')).toBe(false)
  })
})
