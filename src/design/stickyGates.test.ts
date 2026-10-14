/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * V3-05b-c kaynak kapıları (CSS katmanı jsdom'da ölçülemez; tarayıcı ölçümü kapı betiklerinde: stickyBand).
 * 1) Cam sınıfları `@layer components` içinde: katmansız `.glass { position: relative }` Tailwind `sticky`'yi eziyordu.
 * 2) v3 yapışkanları başlık yüksekliğine `--header-h` ile hizalanır; `top-12/14/16` gibi sihirli sayı yok.
 * 3) Üst başlık yapışkan ve opak (`glass-sticky`).
 */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

// v2 (eski Layout) sayfaları kendi başlığına göre hizalıdır ve .glass kullanmaz; kapsam dışı.
const V2_FILES = ['src/components/Layout.tsx', 'src/pages/WizardPage.tsx', 'src/pages/TeamsPage.tsx', 'src/pages/SquadPage.tsx']
const SOURCES = walk('src').filter((p) => /\.tsx$/.test(p) && !/\.test\.tsx$/.test(p) && !V2_FILES.includes(p))

describe('yapışkan yüzey kapıları', () => {
  it('.glass, .glass-2, .glass-3 ve .glass-sticky @layer components içinde tanımlı', () => {
    const css = readFileSync('src/design/glass.css', 'utf8')
    const layer = css.indexOf('@layer components {')
    expect(layer).toBeGreaterThan(-1)
    for (const selector of ['glass', 'glass-2', 'glass-3', 'glass-sticky']) {
      const rule = new RegExp(`^\\s*\\.${selector} \\{`, 'm').exec(css)
      expect(rule?.index ?? -1, selector).toBeGreaterThan(layer)
    }
  })

  it('v3 yapışkanları --header-h ile hizalı: sabit top ofseti yok', () => {
    const offenders = SOURCES.flatMap((path) => {
      const text = readFileSync(path, 'utf8')
      // top-0 meşru (başlığın kendisi, kaydırma kabı içindeki tablo başlığı); sayısal ofsetler başlık yüksekliğini tahmin eder.
      return [...text.matchAll(/(?:^|[\s'"`])(?:[\w-]+:)?sticky\b[^'"`]*?\b(?:[\w[\]-]+:)?top-([1-9]\d*|\[\d+px\])/g)].map((m) => `${path}: top-${m[1]}`)
    })
    expect(offenders).toEqual([])
  })

  it('üst başlık yapışkan, opak ve --header-h yüksekliğinde', () => {
    const shell = readFileSync('src/design/components/AppShell.tsx', 'utf8')
    const header = /<header className="([^"]+)"/.exec(shell)?.[1] ?? ''
    expect(header.split(' ')).toEqual(expect.arrayContaining(['glass', 'glass-sticky', 'sticky', 'top-0', 'h-[var(--header-h)]']))
  })
})
