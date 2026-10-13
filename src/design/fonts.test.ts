/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Inter (variable, self-host) --font-body'nin ilk sırasındadır; latin-ext (ğ ş ı İ) yüklenir. Görsel doğrulama yeniden çekimde.
describe('Inter bağlantısı', () => {
  it("--font-body 'Inter Variable' ile başlar", () => {
    expect(readFileSync('src/design/tokens.css', 'utf8')).toMatch(/--font-body:\s*"Inter Variable"/)
  })

  it('variable Inter CSS içe aktarılır ve latin-ext alt kümesini içerir', () => {
    expect(readFileSync('src/styles/matchday.css', 'utf8')).toContain('@fontsource-variable/inter/wght.css')
    expect(readFileSync('node_modules/@fontsource-variable/inter/wght.css', 'utf8')).toContain('latin-ext')
  })

  it('Barlow Condensed latin-ext 600/700/800 (soyad şeridi Türkçe karakterli)', () => {
    const css = readFileSync('src/styles/matchday.css', 'utf8')
    ;['600', '700', '800'].forEach((w) => expect(css).toContain(`barlow-condensed/latin-ext-${w}.css`))
  })
})
