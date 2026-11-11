import { describe, expect, it } from 'vitest'
import { competitionName, matchPositionLabel, oldestFirst, ratingTone } from './matchData'

describe('FCA-22 maç verisi yardımcıları', () => {
  it('turnuva adı tek eşlemeden; adı bilinmeyen turnuva "Turnuva <kod>"', () => {
    expect(competitionName(1512)).toBe('Turnuva 1512')
    expect(competitionName(1512, { 1512: 'Süper Lig' })).toBe('Süper Lig')
  })

  it('mevki ham kod; 28/29 bilinmiyor, kod gösterilmez', () => {
    expect(matchPositionLabel(5)).toBe('5')
    expect(matchPositionLabel(0)).toBe('0')
    expect(matchPositionLabel(28)).toBeUndefined()
    expect(matchPositionLabel(29)).toBeUndefined()
    expect(matchPositionLabel(undefined)).toBeUndefined()
  })

  it('not tonu: 8+ iyi, 7 bilgi, 6 uyarı, 5 ve altı kötü', () => {
    expect(ratingTone(9)).toBe('good')
    expect(ratingTone(8)).toBe('good')
    expect(ratingTone(7.4)).toBe('info')
    expect(ratingTone(6)).toBe('warn')
    expect(ratingTone(5.9)).toBe('bad')
    expect(ratingTone(3)).toBe('bad')
  })

  it('sunucu en yeniyi önce verir; çizim en eskiden en yeniye (en yeni sağda), kaynağı değiştirmez', () => {
    const src = [9, 8, 7]
    expect(oldestFirst(src)).toEqual([7, 8, 9])
    expect(src).toEqual([9, 8, 7])
  })
})
