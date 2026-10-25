import { describe, expect, it } from 'vitest'
import { importWarningText } from './importWarnings'

describe('importWarningText (LE-02)', () => {
  it('eksik pozisyon uyarısı atlanan sayıyı söyler', () => {
    expect(importWarningText('CAREER_PLAYERS_SKIPPED_NO_POSITIONS', { skippedNoPosition: 10 })).toContain('10 kariyer-üretimi oyuncu atlandı')
  })

  it('kariyer dışı uyarısı neyin gelmediğini ve ne yapılacağını söyler (FAZ 6a-A)', () => {
    expect(importWarningText('NOT_IN_CAREER', {})).toBe('Bu export ana menüden; maaş, sözleşme ve oyun tarihi gelmez. Kariyer içinden export al.')
  })

  it('bilinmeyen kod olduğu gibi gösterilir', () => {
    expect(importWarningText('YENI', {})).toBe('YENI')
  })
})
