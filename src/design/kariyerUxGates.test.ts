import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * KARIYER-UX (D-28): v3 kodu tek kopya taktik/diziliş deposunu (state/tacticStore, state/lineupStore) okumaz/yazmaz; katman 2 sunucu
 * (ana taktik), katman 3 Lab taslağı (state/labStore). Bu depolar yalnız v2 (geliştirme) sayfaları için kalır (src/pages/**).
 * FAZ 4b: geçiş izin listesi boşaldı (10 → 8 → 2 → 0) ve kaldırıldı; kural katı — v3 klasörlerinde istisna yok.
 */
const ROOT = join(process.cwd(), 'src')
const V3_DIRS = ['features', 'components', 'design', 'lib']
const LEGACY = /from\s+['"][./]*(?:\.\.\/)*state\/(tacticStore|lineupStore)['"]/

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

  it('features/, components/, design/, lib/ içinde hiçbir dosya tacticStore/lineupStore içe aktarmaz (istisna yok)', () => {
    expect(violating).toEqual([])
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

/*
 * KARIYER-UX FAZ 4a: Taktik Lab zinciri eski tek kopya depoyu (tacticStore/lineupStore) hiç kullanmaz; taslak deposu (katman 3) Lab'da.
 * Zincirdeki labStore içe aktaranları yalnız Lab dosyaları (features/lab).
 */
describe('Lab zinciri eski depoyu kullanmaz; taslak deposu yalnız Lab\'da (FAZ 4a)', () => {
  const files = chain(join(ROOT, 'features/lab/TacticsLabPage.tsx'))
  const importing = (store: string) => files.filter((f) => new RegExp(`from\\s+['"][./]*state/${store}['"]`).test(readFileSync(join(ROOT, f), 'utf8')))

  it('tacticStore / lineupStore zincirde yok', () => {
    expect(importing('(tacticStore|lineupStore)')).toEqual([])
  })

  it('labStore yalnız features/lab içinden içe aktarılır', () => {
    expect(importing('labStore').length).toBeGreaterThan(0)
    expect(importing('labStore').filter((f) => !f.startsWith('features/lab/'))).toEqual([])
  })

  it('eski kurucu parçaları (useCareerBinding, AutoFitPanel, ProtectLeadCard, TeamSetup) zincirde yok', () => {
    expect(files.filter((f) => /useCareerBinding|AutoFitPanel|ProtectLeadCard|TeamSetup/.test(f))).toEqual([])
  })
})

/* KARIYER-UX FAZ 3: Kadro Analizi de yalnız katman 1-2 okur; tek istisna Masa'daki gibi öneri panelinin göç kısayolu. Birim testi: careerSquadPage.test. */
describe('Kadro zinciri taslak ve eski depo okumaz (FAZ 3)', () => {
  const files = chain(join(ROOT, 'features/careerSquad/CareerSquadPage.tsx'))
  const importing = (store: string) => files.filter((f) => new RegExp(`from\\s+['"][./]*state/${store}['"]`).test(readFileSync(join(ROOT, f), 'utf8')))

  it('tacticStore / lineupStore zincirde yok', () => {
    expect(importing('(tacticStore|lineupStore)')).toEqual([])
  })

  it('labStore yalnız başlangıç önerisi panelinin göç kısayolunda', () => {
    expect(importing('labStore')).toEqual(['features/career/StarterTacticPanel.tsx'])
  })

  it('eski Kadro parçaları (useCareerLineup, useCareerSquad, KadroPage) zincirde yok', () => {
    expect(files.filter((f) => /useCareerLineup|kadro\/useCareerSquad|KadroPage/.test(f))).toEqual([])
  })
})
