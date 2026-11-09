/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ratingTier } from '../../lib/rating'
import { contrastRatio, parseColor } from '../contrast'
import { Chip, OvrBox, Panel, StatTile } from './primitives'

/*
 * FCA-3 Parça 2: Stitch ortak bileşenleri. Kariyer yüzeyinde (data-surface="career") rozetler köşeli dikdörtgen, panel başlıkları büyük harf,
 * tablolar 40 px satır / 32 px büyük harf başlık / zebra. UT ve herkese açık sayfalar değişmez: kurallar yalnız kariyer yüzeyi seçicisinde.
 */
const tokens = readFileSync('src/design/tokens.css', 'utf8')
const glass = readFileSync('src/design/glass.css', 'utf8')
const CAREER = ':root[data-ui="v3"][data-surface="career"]'

function block(css: string, selector: string): string {
  const start = css.lastIndexOf(`${selector} {`)
  expect(start, selector).toBeGreaterThanOrEqual(0)
  return css.slice(start, css.indexOf('}', start))
}

describe('rozet köşesi token\'ı', () => {
  it('varsayılan hap (9999px), kariyer yüzeyinde 3px', () => {
    expect(block(tokens, ':root[data-ui="v3"]')).toBeDefined()
    expect(tokens).toMatch(/:root\[data-ui="v3"\] \{[^}]*--radius-pill: 9999px;/)
    expect(block(tokens, CAREER)).toMatch(/--radius-pill: 3px;/)
  })

  it('Chip ve StatTile Δ hapı token\'ı kullanır (rounded-full değil)', () => {
    render(<><Chip tone="bad">Satılık</Chip><StatTile label="Bütçe" value="€5M" delta={{ value: 1, text: '+1', label: 'önceki' }} /></>)
    const chip = screen.getByText('Satılık')
    expect(chip.className).toMatch(/rounded-\[var\(--radius-pill\)\]/)
    expect(chip.className).not.toMatch(/rounded-full/)
    expect(chip).toHaveClass('ui-chip')
    expect(screen.getByText('+1').parentElement?.className).toMatch(/rounded-\[var\(--radius-pill\)\]/)
  })
})

describe('kariyer yüzeyi CSS kuralları (glass.css)', () => {
  it('rozet: büyük harf, küçük yazı aralığı', () => {
    expect(glass).toMatch(/:root\[data-surface="career"\] \.ui-chip \{[^}]*text-transform: uppercase/)
  })

  it('panel başlığı: büyük harf; Panel h2 panel-title sınıfı taşır', () => {
    expect(glass).toMatch(/:root\[data-surface="career"\] \.panel-title \{[^}]*text-transform: uppercase/)
    render(<Panel title="Zayıf halkalar"><p>içerik</p></Panel>)
    expect(screen.getByRole('heading', { name: 'Zayıf halkalar' })).toHaveClass('panel-title')
  })

  it('tablo: başlık 32px büyük harf, satır 40px, zebra ve üzerine gelme', () => {
    expect(glass).toMatch(/:root\[data-surface="career"\] main table thead th \{[^}]*height: 32px[^}]*text-transform: uppercase/)
    expect(glass).toMatch(/:root\[data-surface="career"\] main table tbody td \{[^}]*height: 40px/)
    expect(glass).toMatch(/:root\[data-surface="career"\] main table:not\(:has\(tbody \+ tbody\)\) tbody tr:nth-child\(even of /)
    expect(glass).toMatch(/:root\[data-surface="career"\] main table tbody tr:not\(:has\(th\[scope="rowgroup"\]\)\):hover/)
  })

  it('zebra: parçalı (çok tbody\'li sanal) tablolarda yok (sıra kayar); grup başlığı satırı (th scope=rowgroup) ve yer tutucu sayılmaz', () => {
    const zebra = glass.match(/^(:root\[data-surface="career"\][^{]*nth-child\(even[^{]*)\{/m)?.[1] ?? ''
    expect(zebra).toMatch(/:not\(:has\(tbody \+ tbody\)\)/)
    expect(zebra).toMatch(/of :not\(:has\(th\[scope="rowgroup"\]\)\):not\(\[data-virtual-placeholder\]\)/)
  })

  it('mobilde yapışkan ilk sütunlar da zebra satırının rengini alır', () => {
    expect(glass).toMatch(/nth-child\(even[^{]*\.table-sticky-col[^{]*\{[^}]*background: var\(--glass-3\)/)
  })

  it('rozet ve panel başlığı kalınlığı katmansız: Tailwind utility (font-medium/semibold) bunları ezmesin', () => {
    const layerStart = glass.indexOf('@layer components {', glass.indexOf('/* FCA-3 kariyer bileşenleri */'))
    for (const rule of [':root[data-surface="career"] .ui-chip {', ':root[data-surface="career"] .panel-title {']) {
      const at = glass.indexOf(rule)
      expect(at, rule).toBeGreaterThan(0)
      expect(at, `${rule} @layer dışında`).toBeLessThan(layerStart)
    }
  })

  it('kariyer kuralları UT\'ye sızmaz: yeni seçicilerin hepsi data-surface="career" ile başlar', () => {
    const section = glass.slice(glass.indexOf('/* FCA-3 kariyer bileşenleri */'))
    const selectors = [...section.matchAll(/^([^\s/@}][^{]*)\{/gm)].map((m) => m[1].trim())
    expect(selectors.length).toBeGreaterThan(0)
    selectors.forEach((s) => s.split(',').forEach((part) => expect(part.trim(), part).toMatch(/^:root\[data-surface="career"\]/)))
  })
})

describe('1–99 derece skalası ve OVR kutusu (Stitch)', () => {
  it.each([
    [1, 'low'], [49, 'low'], [50, 'avg'], [69, 'avg'], [70, 'good'], [79, 'good'], [80, 'elite'], [99, 'elite'],
  ] as const)('%i → %s', (value, tier) => {
    expect(ratingTier(value)).toBe(tier)
  })

  it('OvrBox: değer, erişilebilir ad ve kademe; renk tek başına anlam taşımaz', () => {
    render(<OvrBox value={76} />)
    const box = screen.getByLabelText('OVR 76')
    expect(box).toHaveTextContent('76')
    expect(box).toHaveAttribute('data-tier', 'good')
  })

  it('kariyer yüzeyinde kademe renkleri OVR kutusu zemininde (--glass-3) ≥ 4,5:1; elit: koyu rakam vurgu zemininde ≥ 4,5:1', () => {
    const career = Object.fromEntries([...block(tokens, CAREER).matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
    const box = parseColor(career['--glass-3'])
    for (const name of ['--rate-80', '--rate-60', '--bad']) {
      expect(contrastRatio(parseColor(career[name]), box), name).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrastRatio(parseColor(career['--accent-ink']), parseColor(career['--rate-90']))).toBeGreaterThanOrEqual(4.5)
  })

  it('OvrBox: değer yoksa tire ve "OVR bilinmiyor"', () => {
    render(<OvrBox value={undefined} />)
    expect(screen.getByLabelText('OVR bilinmiyor')).toHaveTextContent('–')
  })
})
