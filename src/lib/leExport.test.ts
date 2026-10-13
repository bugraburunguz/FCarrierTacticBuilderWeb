import { describe, expect, it } from 'vitest'
import script from '../../public/fc27_career_export.lua?raw'
import { EXPORT_DONE_WINDOW } from './leExport'
import scriptHash from './leScript.hash.json'

async function sha256(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

describe('LE export script kopyası (WEB-BUG-25)', () => {
  it('backend tek kaynağıyla aynı (kopya değiştiyse npm run sync:le-script)', async () => {
    expect(await sha256(script)).toBe(scriptHash.sha256)
  })

  it('bitiş penceresi başlığı İçe aktar sayfasındaki metinle aynı', () => {
    expect(script).toContain(EXPORT_DONE_WINDOW)
  })

  it('son kullanıcıya geliştirici dili göstermez', () => {
    expect(script).not.toContain('Bana')
    expect(script).not.toContain('projenin')
  })
})
