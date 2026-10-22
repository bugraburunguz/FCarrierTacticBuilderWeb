import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
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

/** Göreli içe aktarma zinciri (testler hariç): sayfa dosyasından ulaşılan tüm kaynak dosyalar. */
function chain(entry: string): string[] {
  const seen = new Set([entry])
  const queue = [entry]
  while (queue.length) {
    const file = queue.shift()!
    for (const m of readFileSync(file, 'utf8').matchAll(/from\s+'(\.[^']+)'/g)) {
      const base = resolve(dirname(file), m[1])
      const dep = [`${base}.tsx`, `${base}.ts`, base].find((c) => /\.(tsx?)$/.test(c) && (() => { try { return statSync(c).isFile() } catch { return false } })())
      if (dep && !seen.has(dep) && !/\.test\.tsx?$/.test(dep)) {
        seen.add(dep)
        queue.push(dep)
      }
    }
  }
  return [...seen].map((f) => relative(ROOT, f).split('\\').join('/'))
}

/*
 * KARIYER-UX FAZ 2 (D-28): Masa yalnız katman 1-2 okur. Zincirde eski tek kopya depo yok; Lab taslağı (katman 3) yalnız
 * StarterTacticPanel'in "Önceki taslağı ana taktik yap" kısayolunda (göç eden taslağı karara çevirir, taslak verisini Masa'da göstermez;
 * panel yalnız ana taktik yokken çizilir). Ayarlar'daki silme düğmesi kariyerin taslaklarını yalnız siler (labStore.dropCareer, okuma yok).
 * Davranış birim testi: dashboardPage.test "Masa taslak okumaz".
 */
describe('Masa zinciri taslak ve eski depo okumaz (FAZ 2)', () => {
  const files = chain(join(ROOT, 'features/dashboard/DashboardPage.tsx'))
  const importing = (store: string) => files.filter((f) => new RegExp(`from\\s+['"][./]*state/${store}['"]`).test(readFileSync(join(ROOT, f), 'utf8')))

  it('tacticStore / lineupStore zincirde yok', () => {
    expect(importing('(tacticStore|lineupStore)')).toEqual([])
  })

  it('labStore yalnız başlangıç önerisi panelinin göç kısayolunda ve kariyer silmede', () => {
    expect(importing('labStore').sort()).toEqual(['components/DeleteCareerButton.tsx', 'features/career/StarterTacticPanel.tsx'])
    expect(readFileSync(join(ROOT, 'components/DeleteCareerButton.tsx'), 'utf8').match(/labStore\.\w+/g)).toEqual(['labStore.dropCareer'])
  })
})
