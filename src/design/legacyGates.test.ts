import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error — düz ESM betik modülü (tip bildirimi yok); envanter betiğiyle aynı tarama.
import { legacyScanner } from '../../scripts/lib/legacyScan.mjs'

const { scan, routes } = legacyScanner(join(process.cwd(), 'src'))

/** V3-07b/07c: bu rotalar v3'te eski parça kullanmaz (sayfa dosyası + içe aktarma zinciri). Kalan eski: yalnız /about ve /admin/ut (V3-08). */
describe('eski parça kapısı (V3-07b, V3-07c)', () => {
  const all = routes() as { path: string; file?: string; v3Name?: string }[]
  it.each([
    '/career/dashboard', '/squad', '/squad/builder', '/ut/squad', '/tactics/wizard', '/replicas/:id',
    '/ut/club', '/ut/evo', '/ut/objectives', '/ut/meta', '/ut/import', '/compare', '/wonderkids', '/teams',
    '/about', '/privacy',
  ])('%s: v3 sayfası ve zinciri eski parça içermez', (path) => {
    const route = all.find((r) => r.path === path)
    expect(route?.file, `${path} için dosya`).toBeTruthy()
    const { direct, transitive } = scan(route!.file!)
    expect({ direct, transitive: Object.fromEntries(transitive) }).toEqual({ direct: [], transitive: {} })
  })
})
