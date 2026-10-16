/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fitDisplay, type FitLabel } from './fitLabels'

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n)
  return statSync(p).isDirectory() ? walk(p) : [p]
})
const SOURCES = walk('src').filter((p) => /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p))

// Sunucunun bantları (FitEngineProperties.V3: ≥65 Uygun, 40–65 Seviyesinde, 20–40 Sınırda, <20 Eksik) — yalnız fikstür; web eşik tutmaz.
const serverLabel = (level: number): FitLabel => (level >= 65 ? 'GOOD' : level >= 40 ? 'AT_LEVEL' : level >= 20 ? 'WEAK' : 'WRONG_ROLE')
const RANK = { bad: 0, ok: 1, neutral: 2, good: 3 } as const

/** V3-07c 0a: rozet etiketi ve gösterilen yüzde aynı sayıdan (levelFit). Ham rol puanı (score / roleFitScore) yüzde olarak rozet yanında gösterilmez. */
describe('rozet tutarlılığı', () => {
  it('yüzde levelFit; levelFit varken ham rol puanı yüzde olarak çıkmaz', () => {
    expect(fitDisplay({ score: 52, currentFit: 52, levelFit: 70, fitLabel: 'GOOD' })).toMatchObject({ pct: 70, state: 'good', rolePoints: 52 })
    expect(fitDisplay({ score: 62, currentFit: 62, levelFit: 50, fitLabel: 'AT_LEVEL' })).toMatchObject({ pct: 50, state: 'neutral' })
  })

  it('yüzde arttıkça etiket kötüleşmez', () => {
    let last = -1
    for (let level = 0; level <= 100; level += 0.5) {
      const d = fitDisplay({ levelFit: level, currentFit: 100 - level, fitLabel: serverLabel(level) })
      expect(RANK[d.state]).toBeGreaterThanOrEqual(last)
      last = RANK[d.state]
    }
  })

  it('kaynakta rozetin yanında ham rol puanı yüzdesi yok (Math.round(…roleFit.score) / roleFitScore)', () => {
    const offenders = SOURCES.filter((f) => /Math\.round\([^)]*roleFit\.score\)|Math\.round\([^)]*\.roleFitScore\)/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
