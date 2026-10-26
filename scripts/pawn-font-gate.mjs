// KARIYER-UX FAZ 1 düzeltme 2 (Q18): piyon soyad hapı, mevki hapı ve rol etiketi hesaplanan yazı boyutu her genişlikte ≥ 11px.
// Kullanım: node scripts/pawn-font-gate.mjs [--base http://localhost:5173]  (geliştirme sunucusu; /onizleme/kariyer-ux yalnız geliştirmede)
// Yalnız localhost/127.0.0.1. Çıktı: Claude outputs/screens/KARIYER-UX-1/pawn-font-report.json (repo dışı)
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const flag = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback)
const base = flag('base', 'http://localhost:5173')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const MIN_PX = 11
const WIDTHS = [375, 768, 1280]
const SECTIONS = ['oneri', 'saha']

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rows = []
for (const width of WIDTHS) {
  for (const section of SECTIONS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.addInitScript(() => {
      localStorage.setItem('fc.mode', 'career')
      localStorage.setItem('fc.theme', 'dark')
    })
    const page = await context.newPage()
    await page.goto(`${base}/onizleme/kariyer-ux?bolum=${section}&ui=v3`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-pitch-marker="pawn"]')
    const measured = await page.evaluate(() => {
      const out = []
      document.querySelectorAll('[data-slot-group]').forEach((group) => {
        if (!group.querySelector('[data-pitch-marker="pawn"]')) {
          return
        }
        group.querySelectorAll(':scope > span, :scope > button').forEach((el) => {
          const kind = el.hasAttribute('data-slot-pill') ? 'mevki' : el.getAttribute('title') && el.className.includes('pawn-label') ? 'soyad' : 'rol'
          out.push({ kind, text: el.textContent.trim().slice(0, 24), px: parseFloat(getComputedStyle(el).fontSize) })
        })
      })
      return out
    })
    for (const m of measured) {
      rows.push({ width, section, ...m })
    }
    await context.close()
  }
}
await browser.close()

const bad = rows.filter((r) => r.px < MIN_PX)
const summary = Object.values(rows.reduce((acc, r) => {
  const key = `${r.width}-${r.kind}`
  acc[key] = acc[key] ?? { width: r.width, kind: r.kind, min: Infinity, count: 0 }
  acc[key].min = Math.min(acc[key].min, r.px)
  acc[key].count += 1
  return acc
}, {}))
const out = screensDir('KARIYER-UX-1')
mkdirSync(out, { recursive: true })
writeFileSync(new URL('pawn-font-report.json', out), JSON.stringify({ minPx: MIN_PX, summary, bad }, null, 2) + '\n')
summary.forEach((s) => console.log(`${s.width}px ${s.kind}: en küçük ${s.min}px (${s.count} öğe)`))
console.log(bad.length === 0 ? 'Q18: tüm piyon etiketleri ≥ 11px' : `Q18 İHLAL: ${bad.length} öğe < 11px`)
process.exit(bad.length === 0 ? 0 : 1)
