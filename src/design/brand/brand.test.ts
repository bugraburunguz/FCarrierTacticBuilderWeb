/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, over, parseColor } from '../contrast'

const css = readFileSync('src/design/tokens.css', 'utf8')

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  expect(start, `${selector} bloğu bulunamadı`).toBeGreaterThanOrEqual(0)
  const body = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
}

const DARK = block(':root[data-ui="v3"]')
const LIGHT = { ...DARK, ...block(':root[data-ui="v3"][data-theme="light"]') }

/** Marka (FC Assist): rengi mod vurgusundan bağımsız; "Assist" gradyanının her durağı cam yüzeyin üstünde en kötü aurora rengine karşı ≥ 4,5:1. */
describe('marka token\'ları', () => {
  it('açık temada koyulaştırılmış duraklar (#0369a1 / #4338ca / #7e22ce)', () => {
    expect([LIGHT['--brand-1'], LIGHT['--brand-2'], LIGHT['--brand-3']]).toEqual(['#0369a1', '#4338ca', '#7e22ce'])
  })

  it('mod vurgusundan bağımsız: UT ve Kariyer bloklarında --brand-* yeniden tanımlanmaz', () => {
    for (const sel of [':root[data-ui="v3"][data-mode="career"]', ':root[data-ui="v3"][data-theme="light"][data-mode="career"]']) {
      expect(Object.keys(block(sel)).filter((k) => k.startsWith('--brand'))).toEqual([])
    }
  })

  it.each([
    ['koyu', DARK],
    ['açık', LIGHT],
  ])('%s tema: gradyanın her durağı ≥ 4,5:1', (_n, t) => {
    const base = parseColor(t['--bg-base'])
    for (const aurora of ['--aurora-1', '--aurora-2', '--aurora-3']) {
      const backdrop = over({ ...parseColor(t[aurora]), a: Number(t['--aurora-opacity']) }, base)
      const surface = over(parseColor(t['--glass-1']), backdrop)
      for (const stop of ['--brand-1', '--brand-2', '--brand-3']) {
        expect(contrastRatio(parseColor(t[stop]), surface), `${stop} / ${aurora}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
