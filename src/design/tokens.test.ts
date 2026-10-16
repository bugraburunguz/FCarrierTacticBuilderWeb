/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const tokensCss = readFileSync('src/design/tokens.css', 'utf8')
import { contrastRatio, over, parseColor } from './contrast'

/** `selector` bloğundaki `--ad: değer;` çiftlerini okur (üstteki bloklar altta geçersiz kılınır). */
function block(selector: string): Record<string, string> {
  const start = tokensCss.indexOf(`${selector} {`)
  expect(start, `${selector} bloğu bulunamadı`).toBeGreaterThanOrEqual(0)
  const body = tokensCss.slice(start, tokensCss.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
}

const DARK = block(':root[data-ui="v3"]')
const DARK_CAREER = { ...DARK, ...block(':root[data-ui="v3"][data-mode="career"]') }
const LIGHT = { ...DARK, ...block(':root[data-ui="v3"][data-theme="light"]') }
const LIGHT_CAREER = { ...LIGHT, ...block(':root[data-ui="v3"][data-theme="light"][data-mode="career"]') }

describe('v3 token seti (11 §3)', () => {
  it('doküman token adlarının hepsi koyu temada tanımlı', () => {
    const required = ['--bg-base', '--aurora-1', '--aurora-2', '--aurora-3', '--glass-1', '--glass-2', '--glass-3', '--glass-hover', '--glass-press', '--glass-border', '--glass-highlight', '--glass-shadow',
      '--ink', '--ink-2', '--muted', '--faint', '--accent', '--accent-ink', '--accent-soft', '--good', '--warn', '--bad', '--info', '--chem-0', '--chem-3', '--rate-90', '--rate-low',
      '--r-bronze', '--r-evo', '--pitch-1', '--pitch-2', '--pitch-line', '--radius-sm', '--radius-xl', '--space-1', '--space-6', '--font-display', '--font-body', '--font-num']
    required.forEach((name) => expect(DARK[name], name).toBeTruthy())
  })

  it('köprü: eski semantik adlar v3 değerlerine bağlı', () => {
    expect(DARK['--surface']).toBe('var(--glass-1)')
    expect(DARK['--line']).toBe('var(--glass-border)')
    expect(DARK['--accent-bg']).toBe('var(--accent)')
  })

  it.each([
    ['koyu UT', DARK],
    ['koyu kariyer', DARK_CAREER],
    ['açık UT', LIGHT],
    ['açık kariyer', LIGHT_CAREER],
  ])('%s: metin, cam yüzeyin üstünde en kötü aurora rengine karşı AA (4,5:1)', (_name, t) => {
    const base = parseColor(t['--bg-base'])
    const opacity = Number(t['--aurora-opacity'])
    for (const aurora of ['--aurora-1', '--aurora-2', '--aurora-3']) {
      const lacquer = parseColor(t[aurora])
      const backdrop = over({ ...lacquer, a: opacity }, base)
      const surface = over(parseColor(t['--glass-1']), backdrop)
      for (const ink of ['--ink', '--ink-2', '--muted']) {
        expect(contrastRatio(parseColor(t[ink]), surface), `${ink} / ${aurora}`).toBeGreaterThanOrEqual(4.5)
      }
      // birincil buton metni vurgu zemininde
      expect(contrastRatio(parseColor(t['--accent-ink']), parseColor(t['--accent']))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('--faint yalnız dekoratif: devre dışı kenar için ≥3:1 olması gerekmez ama düz yüzeyde okunur kalır (≥3:1)', () => {
    const surface = over(parseColor(DARK['--glass-1']), parseColor(DARK['--bg-base']))
    expect(contrastRatio(parseColor(DARK['--faint']), surface)).toBeGreaterThanOrEqual(3)
  })

  it('V3-07b: eski hex renklerin tema bağımsız token karşılığı (v2 ve v3, aynı değer)', () => {
    expect(block(':root')).toEqual({
      '--ovr-80': '#0e9b52', '--ovr-70': '#3aa14a', '--ovr-65': '#86b81f', '--ovr-60': '#d0a022', '--ovr-low': '#d47a24',
      '--dot-green': '#2fbf71', '--dot-yellow': '#e6b325', '--dot-red': '#e5484d',
      '--drag-border': '#10b981', '--drag-bg': '#ffffff', '--drag-ink': '#0f172a', '--drag-rating': '#047857', '--drag-sub': '#64748b',
      // V3-07c: AttributeRadar seri renkleri (renk + çizgi deseni birlikte; renk körü güvenli)
      '--series-1': '#00b894', '--series-2': '#e17055', '--series-3': '#0984e3', '--series-4': '#c79a00', '--series-5': '#6c5ce7', '--series-6': '#e84393',
    })
  })

  it('şeffaflığı azalt / yüksek kontrast fallback yüzeyleri opak', () => {
    expect(tokensCss).toMatch(/prefers-reduced-transparency: reduce/)
    expect(tokensCss).toMatch(/data-transparency="reduced"/)
    expect(parseColor(block(':root[data-ui="v3"][data-transparency="reduced"]')['--glass-1']).a).toBe(1)
  })
})
