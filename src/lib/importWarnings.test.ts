import { describe, expect, it } from 'vitest'
import { importWarningText } from './importWarnings'

describe('importWarningText (LE-02)', () => {
  it('eksik pozisyon uyarısı atlanan sayıyı söyler', () => {
    expect(importWarningText('CAREER_PLAYERS_SKIPPED_NO_POSITIONS', { skippedNoPosition: 10 })).toContain('10 kariyer-üretimi oyuncu atlandı')
  })

  it('kariyer dışı uyarısı "Kariyer algılanmadı" der', () => {
    expect(importWarningText('NOT_IN_CAREER', {})).toMatch(/^Kariyer algılanmadı/)
  })

  it('bilinmeyen kod olduğu gibi gösterilir', () => {
    expect(importWarningText('YENI', {})).toBe('YENI')
  })
})
