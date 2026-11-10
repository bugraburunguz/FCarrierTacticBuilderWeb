/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/*
 * FCA-12 Parça 2: kariyer yüzeyinde telefonda (<640 px) sayfa içi denetimler en az 44 px dokunma hedefi.
 * Form denetimleri, düğmeler ve açılır başlıklar tek kuralla (saha hariç: saha ölçüsünü kendi hesaplar); bağlantılar bileşende.
 * UT görünümü değişmez: kural ve HelpPopover büyümesi yalnız kariyer yüzeyinde.
 */
const css = readFileSync('src/design/glass.css', 'utf8')
const src = (path: string) => readFileSync(path, 'utf8')

describe('kariyer mobil dokunma hedefleri', () => {
  const start = css.indexOf('/* FCA-12 kariyer mobil dokunma hedefleri */')
  const block = css.slice(start, css.indexOf('/* FCA-12 son */'))

  it('kural yalnız kariyer yüzeyinde ve yalnız <640 px', () => {
    expect(start).toBeGreaterThanOrEqual(0)
    expect(block).toContain('@media (max-width: 639.98px)')
    // Parça 3: kariyer sayfası ve kariyerde açılan alttan panel/diyaloglar (portal, main dışı).
    expect(block.match(/:root\[data-surface="career"\] :is\(main, \[role="dialog"\]\)/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('düğme, seçim kutusu, metin alanı ve açılır başlık en az 44 px yüksek; düğme en az 44 px geniş; saha içi hariç', () => {
    expect(block).toMatch(/\[role="dialog"\]\) :is\(button, select, summary, input:not\(\[type="checkbox"\], \[type="radio"\], \[type="hidden"\], \[type="file"\]\)\):not\(\.pitch-field \*\)\s*\{\s*min-height: 44px;/)
    expect(block).toMatch(/\[role="dialog"\]\) button:not\(\.pitch-field \*\)\s*\{\s*min-width: 44px;/)
  })

  it('kural katmansız ve son @layer bloğu kapandıktan sonra: bileşenin min-h-8 / h-9 utility\'si telefonda ezilir', () => {
    expect(block).not.toContain('@layer')
    const layerStart = css.lastIndexOf('@layer components {', start)
    const layerBody = css.slice(layerStart, start)
    expect(layerBody.split('{').length).toBe(layerBody.split('}').length)
  })

  it.each([
    ['src/features/careerSquad/LineupList.tsx', 'entry.player.name}</Link>', 1],
    ['src/components/SquadList.tsx', 'entry.player.name}</Link>', 2],
    ['src/components/SquadList.tsx', 'bg-[var(--info-soft)] px-2 text-xs font-medium text-info', 1],
    ['src/features/career/SeasonJobs.tsx', '>Gör</Link>', 2],
    ['src/features/teams/TeamsV3Page.tsx', '>Kariyer verisini içe aktar</Link>', 1],
  ])('%s: "%s" bağlantısı telefonda 44 px', (path, marker, count) => {
    const lines = src(path).split('\n').filter((l) => l.includes(marker))
    expect(lines).toHaveLength(count)
    for (const line of lines) {
      expect(line.trim()).toContain('max-sm:min-h-11')
    }
  })

  it('HelpPopover: yalnız kariyerde telefonda 44 px dokunma alanı (CSS); bileşende ölçü sınıfı yok, görünen "?" dairesi 20 px', () => {
    const help = src('src/components/ui.tsx')
    const open = help.indexOf('<summary aria-label={label}')
    const tag = help.slice(open, help.indexOf('>', open))
    expect(tag).toContain('data-help')
    expect(tag).not.toContain('max-sm:')
    expect(tag).not.toContain('border-line')
    expect(help.slice(open, help.indexOf('</summary>', open))).toMatch(/<span aria-hidden="true" className="[^"]*h-5 w-5[^"]*rounded-full border border-line/)
    expect(block).toMatch(/\[role="dialog"\]\) summary\[data-help\]\s*\{\s*min-width: 44px;/)
  })

  it('Taktik notu: kapat düğmesi 44 px olunca telefonda kırpılmaz', () => {
    const view = src('src/features/squad/SquadWorkspaceView.tsx')
    expect(view.slice(view.indexOf('<div role="note"'), view.indexOf('>', view.indexOf('<div role="note"')))).toContain('max-sm:max-h-none')
  })

  it('Masa: "Dönem sonunu gir" bağlantı sınıfı telefonda 44 px', () => {
    expect(src('src/features/dashboard/DashboardPage.tsx')).toMatch(/const settingsLink = '[^']*max-sm:min-h-11/)
  })
})
