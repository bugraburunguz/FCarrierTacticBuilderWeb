/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/*
 * FCA-12 Parça 2: kariyer yüzeyinde telefonda (<640 px) sayfa içi denetimler en az 44 px dokunma hedefi.
 * Form denetimleri, düğmeler ve açılır başlıklar tek kuralla; bağlantılar bileşende (max-sm:min-h-11).
 */
const css = readFileSync('src/design/glass.css', 'utf8')
const src = (path: string) => readFileSync(path, 'utf8')

describe('kariyer mobil dokunma hedefleri', () => {
  const start = css.indexOf('/* FCA-12 kariyer mobil dokunma hedefleri */')
  const block = css.slice(start, css.indexOf('/* FCA-12 son */'))

  it('kural yalnız kariyer yüzeyinde ve yalnız <640 px', () => {
    expect(start).toBeGreaterThanOrEqual(0)
    expect(block).toContain('@media (max-width: 639.98px)')
    expect(block.match(/:root\[data-surface="career"\] main/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('düğme, seçim kutusu, metin alanı ve açılır başlık en az 44 px yüksek; düğme en az 44 px geniş', () => {
    expect(block).toMatch(/:is\(button, select, summary, input:not\(\[type="checkbox"\], \[type="radio"\], \[type="hidden"\], \[type="file"\]\)\)\s*\{\s*min-height: 44px;/)
    expect(block).toMatch(/main button\s*\{\s*min-width: 44px;/)
  })

  it('kural katmansız: bileşenin min-h-8 / h-9 utility\'si telefonda ezilir', () => {
    const before = css.slice(0, start)
    expect(before.lastIndexOf('@layer')).toBeLessThan(before.lastIndexOf('}\n'))
    expect(block).not.toContain('@layer')
  })

  it.each([
    ['src/features/careerSquad/LineupList.tsx', 'entry.player.name'],
    ['src/components/SquadList.tsx', 'entry.player.name'],
    ['src/components/SquadList.tsx', 'Dönüşüm:'],
    ['src/features/career/SeasonJobs.tsx', '>Gör</Link>'],
    ['src/features/teams/TeamsV3Page.tsx', 'Kariyer verisini içe aktar'],
  ])('%s: "%s" bağlantısı telefonda 44 px', (path, marker) => {
    const text = src(path)
    for (const line of text.split('\n').filter((l) => l.includes(marker) || l.includes(marker.replace('>Gör</Link>', 'Gör</Link>')))) {
      const link = line.includes('<Link') ? line : text.slice(text.lastIndexOf('<Link', text.indexOf(line)), text.indexOf(line) + line.length)
      expect(link, line.trim()).toContain('max-sm:min-h-11')
    }
  })

  it('HelpPopover: telefonda 44 px dokunma alanı, görünen "?" dairesi 20 px kalır', () => {
    const help = src('src/components/ui.tsx')
    const summary = help.slice(help.indexOf('<summary aria-label={label}'), help.indexOf('</summary>', help.indexOf('<summary aria-label={label}')))
    expect(summary).toContain('max-sm:h-11')
    expect(summary).toContain('max-sm:w-11')
    expect(summary.slice(0, summary.indexOf('>'))).not.toContain('border-line')
    expect(summary).toMatch(/<span aria-hidden="true" className="[^"]*h-5 w-5[^"]*rounded-full border border-line/)
  })

  it('Masa: "Dönem sonunu gir" bağlantı sınıfı telefonda 44 px', () => {
    expect(src('src/features/dashboard/DashboardPage.tsx')).toMatch(/const settingsLink = '[^']*max-sm:min-h-11/)
  })
})
