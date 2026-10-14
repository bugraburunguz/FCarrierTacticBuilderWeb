import { describe, expect, it } from 'vitest'
import { EVIDENCE_LABEL, evidenceText } from './labels'

describe('kanıt satırları', () => {
  it('iç metrik kodu göstermez, okunur ad kullanır', () => {
    const text = evidenceText({ metric: 'REST_DEFENCE_COUNT', value: 4, op: 'LT', threshold: 5 })
    expect(text).toBe('Geri savunmada kalan oyuncu: 4 (eşik: altında 5)')
    expect(text).not.toMatch(/[A-Z]{3,}_[A-Z]/)
  })

  it('seviye referansı varsa yazar', () => {
    expect(evidenceText({ metric: 'BUILDUP_SAFETY', value: 59.75, op: 'LT', threshold: 67.8, reference: 70.8 })).toContain('seviye referansı 70.8')
  })

  it('bilinmeyen metrik kod sızdırmaz', () => {
    expect(evidenceText({ metric: 'YENI_METRIK_X', value: 1, op: 'GTE', threshold: 1 })).toMatch(/^Ölçüm: 1/)
  })

  it('her sözlük adı kodsuzdur', () => {
    Object.values(EVIDENCE_LABEL).forEach((v) => expect(v).not.toMatch(/[A-Z]{3,}_/))
  })
})

describe('özel kanıt ifadeleri', () => {
  it('bant sırası ve bayraklar okunur metne çevrilir', () => {
    expect(evidenceText({ metric: 'BAND_ORDINAL', value: 3, op: 'GTE', threshold: 2 })).toBe('Hat bandı: Agresif hat (eşik: Yüksek hat ve üstü)')
    expect(evidenceText({ metric: 'BUILDUP_IS', params: { name: 'SHORT' }, value: 1, op: 'EQ', threshold: 1 })).toBe('Build-up: kısa pas seçili')
    expect(evidenceText({ metric: 'HIGH_LINE_THIN_REST', params: { bandMin: 2, restBelow: 5 }, value: 1, op: 'GTE', threshold: 1 })).toBe('Hat yüksek ve geri savunmada 4 ya da daha az oyuncu kalıyor')
  })
})
