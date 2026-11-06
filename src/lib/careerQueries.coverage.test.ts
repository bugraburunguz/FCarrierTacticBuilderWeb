import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n)
  return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) && !n.includes('.test.') ? [p] : []
})

/** Kaynakta kariyer kimliği için kullanılan yazımlar (`careerId`, `id`, `career.id`, `k.career?.id`). */
const CAREER_EXPR = String.raw`(?:careerId|id|(?:\w+\.)?career\??\.id)\b`
/** `queryKey: ['ad', careerId…]` ve yardımcı fabrikalardaki `['ad', careerId]` (ör. mainTacticKey, academyQuery) aynı kalıpla yakalanır. */
const KEY_AT_1 = new RegExp(String.raw`\[\s*'([a-z0-9-]+)',\s*` + CAREER_EXPR, 'g')

/**
 * Kalıba uyan ama kariyer kapsamlı olmayan anahtarlar. Burada `id` başka bir varlığın kimliği.
 * - replica: `['replica', id]` — id replika slug'ı (ReplicaDetailPage), kariyerle ilgisi yok.
 * - player: `['player', id, careerId]` — id oyuncu kimliği (PlayerDetailPage); kariyer 3. elemanda, CAREER_AT_2'de.
 */
const NOT_CAREER_SCOPED = new Set(['replica', 'player'])

const careerAt1Block = (): string => {
  const lib = readFileSync('src/lib/careerQueries.ts', 'utf8')
  const start = lib.indexOf('const CAREER_AT_1')
  return lib.slice(start, lib.indexOf('])', start))
}

describe('CAREER_AT_1', () => {
  it('careerId ikinci eleman olan her query key listede', () => {
    const listed = new Set([...careerAt1Block().matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]))
    const used = new Set(walk('src').flatMap((f) => [...readFileSync(f, 'utf8').matchAll(KEY_AT_1)].map((m) => m[1])))
    expect(used.size).toBeGreaterThan(10)
    expect([...used].filter((k) => !listed.has(k) && !NOT_CAREER_SCOPED.has(k)).sort()).toEqual([])
  })

  it('istisnalar gerçekten kullanılıyor ve listede değil', () => {
    const listed = new Set([...careerAt1Block().matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]))
    const used = new Set(walk('src').flatMap((f) => [...readFileSync(f, 'utf8').matchAll(KEY_AT_1)].map((m) => m[1])))
    for (const k of NOT_CAREER_SCOPED) {
      expect(used.has(k)).toBe(true)
      expect(listed.has(k)).toBe(false)
    }
  })
})
