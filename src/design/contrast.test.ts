import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * KARIYER-UX FAZ 1 · 11 §3.3 / Q5: metin ve cam, en kötü aurora rengine karşı WCAG AA (4,5:1). Değerler tokens.css'ten okunur;
 * model: zemin (--bg-base) + aurora rengi (--aurora-opacity ile, lekenin merkezi = en kötü durum) + --glass-1. Metin olmayan öğe ≥ 3:1 (1.4.11).
 */
const css = readFileSync(join(process.cwd(), 'src', 'design', 'tokens.css'), 'utf8')

/** Yalnız üst düzey (media/supports dışı) bloklar: seçici → bildirimler. */
function block(selector: string): Record<string, string> {
  const topLevel = css.replace(/@(media|supports)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
  const out: Record<string, string> = {}
  const re = /([^{}]+)\{([^{}]*)\}/g
  for (let m = re.exec(topLevel); m; m = re.exec(topLevel)) {
    if (m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim() === selector) {
      for (const decl of m[2].replace(/\/\*[\s\S]*?\*\//g, '').split(';')) {
        const [name, ...value] = decl.split(':')
        if (name?.trim().startsWith('--')) {
          out[name.trim()] = value.join(':').trim()
        }
      }
    }
  }
  return out
}

const V3 = ':root[data-ui="v3"]'
const themes = {
  'kariyer koyu': { ...block(V3), ...block(`${V3}[data-mode="career"]`) },
  'kariyer açık': { ...block(V3), ...block(`${V3}[data-mode="career"]`), ...block(`${V3}[data-theme="light"]`), ...block(`${V3}[data-theme="light"][data-mode="career"]`) },
}

type Rgba = [number, number, number, number]

function parse(value: string): Rgba {
  const hex = value.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const rgba = value.match(/^rgba?\(([^)]+)\)$/)
  if (rgba) {
    const [r, g, b, a = '1'] = rgba[1].split(',').map((s) => s.trim())
    return [Number(r), Number(g), Number(b), Number(a)]
  }
  throw new Error(`renk değil: ${value}`)
}

const over = (top: Rgba, bottom: Rgba): Rgba => [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3])).concat(1) as Rgba

function luminance([r, g, b]: Rgba): number {
  const c = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

function ratio(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe.each(Object.entries(themes))('Cyber-Pitch kontrastı — %s', (_name, t) => {
  const v = (name: string) => {
    expect(t[name], `${name} tanımlı`).toBeDefined()
    return parse(t[name])
  }
  const base = v('--bg-base')
  const opacity = Number(t['--aurora-opacity'])
  const surfaces = ['--aurora-1', '--aurora-2', '--aurora-3'].map((a) => over(v('--glass-1'), over([...v(a).slice(0, 3), opacity] as Rgba, base)))

  it.each(['--ink', '--ink-2', '--muted', '--accent'])('%s cam üstünde en kötü aurora ile ≥ 4,5:1', (token) => {
    surfaces.forEach((surface, i) => expect(ratio(over(v(token), surface), surface), `${token} / aurora-${i + 1}`).toBeGreaterThanOrEqual(4.5))
  })

  it('vurgu düğmesi: --accent-ink / --accent ≥ 4,5:1', () => {
    expect(ratio(v('--accent-ink'), v('--accent'))).toBeGreaterThanOrEqual(4.5)
  })

  it('piyon: OVR rakamı ve isim hapı ≥ 4,5:1; saha çizgileri ve taslak kenarı ≥ 3:1', () => {
    expect(ratio(v('--pawn-ink'), v('--pawn-bg'))).toBeGreaterThanOrEqual(4.5)
    expect(ratio(v('--pawn-label-ink'), v('--pawn-label-bg'))).toBeGreaterThanOrEqual(4.5)
    const field = v('--cyber-pitch-1')
    expect(ratio(over(v('--cyber-line'), field), field)).toBeGreaterThanOrEqual(3)
    expect(ratio(over(v('--cyber-line-2'), field), field)).toBeGreaterThanOrEqual(3)
    expect(ratio(over(v('--pawn-bg'), field), field), 'piyon sahadan ayrışır').toBeGreaterThanOrEqual(3)
    surfaces.forEach((surface) => expect(ratio(over(v('--edge-draft'), surface), surface)).toBeGreaterThanOrEqual(3))
  })
})
