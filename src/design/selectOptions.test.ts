import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = (file: string) => readFileSync(join(process.cwd(), 'src', file), 'utf8')

/**
 * Yerel açılır liste (select) seçenekleri: Windows Chrome açılır listeyi select'in arka planıyla çizer; yarı saydam cam yüzeyde (glass-3) zemin
 * beyaza düşüyor, açık renk yazı görünmüyordu (Gelişim → Oyuncu seçici). Seçenekler her temada opak zemin + tema yazı rengi alır.
 */
describe('select seçenekleri opak', () => {
  it('option/optgroup opak --option-bg ve tema yazı rengiyle çizilir', () => {
    expect(css('index.css')).toMatch(/select option,\s*select optgroup\s*\{[^}]*background-color:\s*var\(--option-bg\)[^}]*color:\s*var\(--ink\)/)
  })

  it('--option-bg koyu ve açık temada opak (alfa yok)', () => {
    const tokens = css('design/tokens.css')
    const values = [...tokens.matchAll(/--option-bg:\s*([^;]+);/g)].map((m) => m[1].trim())
    expect(values.length).toBeGreaterThanOrEqual(2)
    for (const value of values) {
      expect(value).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})
