import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * KARIYER-UX (D-28): v3 kodu tek kopya taktik/diziliş deposunu (state/tacticStore, state/lineupStore) okumaz/yazmaz; katman 2 sunucu
 * (ana taktik), katman 3 Lab taslağı (state/labStore). Bu depolar yalnız v2 (geliştirme) sayfaları için kalır.
 * Geçiş süresince izinli liste: FAZ 2-4'te sayfalar taşındıkça boşalır ve yalnız küçülebilir (listede olup artık ihlal etmeyen dosya testi kırar).
 */
const ROOT = join(process.cwd(), 'src')
const V3_DIRS = ['features', 'components', 'design', 'lib']
const LEGACY = /from\s+['"][./]*(?:\.\.\/)*state\/(tacticStore|lineupStore)['"]/

const ALLOWED_UNTIL_FAZ_4 = new Set([
  'components/AutoFitPanel.tsx',
  'components/EaTacticCode.tsx',
  'components/ProtectLeadCard.tsx',
  'components/TeamSetup.tsx',
  'features/squad/CareerSquadBuilderPage.tsx',
  'features/squad/kadro/useCareerLineup.ts',
  'features/squad/kadro/useCareerSquad.ts',
  'features/squad/useCareerBinding.ts',
  'features/squad/useCareerSquadBuilder.tsx',
  'features/wizard/TacticWizardPage.tsx',
])

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      return files(path)
    }
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

describe('v3 kodu eski tek kopya taktik deposunu kullanmaz (KARIYER-UX)', () => {
  const violating = V3_DIRS.flatMap((d) => files(join(ROOT, d)))
    .filter((f) => LEGACY.test(readFileSync(f, 'utf8')))
    .map((f) => relative(ROOT, f).split('\\').join('/'))

  it('izinli liste dışında içe aktarma yok', () => {
    expect(violating.filter((f) => !ALLOWED_UNTIL_FAZ_4.has(f))).toEqual([])
  })

  it('izinli liste yalnız küçülür: artık ihlal etmeyen dosya listeden çıkarılmalı', () => {
    expect([...ALLOWED_UNTIL_FAZ_4].filter((f) => !violating.includes(f))).toEqual([])
  })
})
