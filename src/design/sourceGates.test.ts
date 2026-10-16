/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 11 §8 Q2/Q8 kaynak kapıları (stylelint kurulmadan): v3'e taşınmış dosyalarda sabit renk, palet sınıfı, 12px altı yazı,
 * dağınık backdrop-filter ve `transition-all` olmaz. Sayfa taşındıkça `V3_FILES` listesine eklenir.
 */
const V3_FILES = [
  'src/features/squad/SquadWorkspaceView.tsx',
  'src/design/components/AppShell.tsx',
  'src/design/components/Pitch3.tsx',
  'src/design/components/Workspace.tsx',
]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const DESIGN_SOURCES = walk('src/design').filter((p) => /\.(tsx?|css)$/.test(p) && !/\.test\.tsx?$/.test(p) && !p.endsWith('tokens.css'))
const SCANNED = [...DESIGN_SOURCES, ...V3_FILES.filter((f) => {
  try {
    return statSync(f).isFile()
  } catch {
    return false
  }
})]

function scan(pattern: RegExp, allow: (path: string) => boolean = () => false) {
  return SCANNED.filter((p) => !allow(p)).flatMap((p) => [...readFileSync(p, 'utf8').matchAll(pattern)].map((m) => `${p}: ${m[0]}`))
}

describe('v3 kaynak kapıları', () => {
  it('sabit hex renk yok (token dışı)', () => {
    expect(scan(/#[0-9a-fA-F]{3,8}\b(?![0-9a-fA-F])/g, (p) => p.endsWith('contrast.ts') || p.endsWith('LogoMark.tsx'))).toEqual([]) // LogoMark: marka işareti (BRAND.md) sabit logo renkleridir, UI rengi değil
  })

  it('Tailwind palet sınıfı yok (emerald/teal/slate/sky/...)', () => {
    expect(scan(/\b(?:bg|text|border|ring|from|to|via)-(?:emerald|teal|slate|sky|amber|rose|red|green|blue|gray|zinc|neutral|stone|yellow|orange|lime|indigo|violet|purple|pink)-\d{2,3}\b/g)).toEqual([])
  })

  it('12px altı yazı yok', () => {
    expect(scan(/text-\[(?:[0-9]|1[01])(?:\.\d+)?px\]/g)).toEqual([])
  })

  it('backdrop-filter yalnız glass.css içinde tanımlı (bileşenlerde yok)', () => {
    expect(scan(/backdrop-(?:filter|blur)/g, (p) => p.endsWith('glass.css'))).toEqual([])
  })

  it('transition-all ve animasyonlu blur/layout özelliği yok', () => {
    expect(scan(/transition-all|transition:\s*all|animate-\[?(?:width|height|margin|padding)/g)).toEqual([])
  })

  it('en çok 6 .glass/.glass-2 öğesi: AppShell + sayfa başına birkaç panel (şablon sayısı kaynak düzeyinde sınırlı)', () => {
    const count = SCANNED.filter((p) => p.endsWith('.tsx')).reduce((sum, p) => sum + [...readFileSync(p, 'utf8').matchAll(/\bglass(?:-2)?\b(?!-)/g)].length, 0)
    expect(count).toBeLessThanOrEqual(24)
  })
})
