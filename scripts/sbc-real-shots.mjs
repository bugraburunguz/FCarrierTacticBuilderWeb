// V3-05c-c madde 4: içe aktarılmış GERÇEK setlerle /ut/sbc (yerel docker, oturumsuz; yalnız okuma). 375/1280 × koyu/açık.
// Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, sayfa minFont, ödül kartlarının kaynağı (ut_item boşken çizilen oyuncu kartı = EA verisi).
// Kullanım: node scripts/sbc-real-shots.mjs [--base http://localhost:8081]   Çıktı: docs/review/v2/screens/V3-05c-c/sbc-real/
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { pageMinFont } from './lib/readability.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const out = new URL('../docs/review/v2/screens/V3-05c-c/sbc-real/', import.meta.url)
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    await context.addInitScript((t) => { localStorage.setItem('fc.theme', t); localStorage.setItem('fc.mode', 'ut') }, theme)
    const page = await context.newPage()
    const problems = []
    let itemsAsked = 0
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => { r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`); if (new URL(r.url()).pathname.endsWith('/ut/kb/items')) itemsAsked++ })
    await page.goto(`${base}/ut/sbc?ui=v3`, { waitUntil: 'networkidle' })
    await page.getByRole('list', { name: 'SBC setleri' }).waitFor()
    await page.waitForTimeout(500)
    await page.screenshot({ path: file(`izgara-${theme}-${w}.png`) })
    const rewardCards = await page.evaluate(() => [...document.querySelectorAll('[aria-label="Ödül"] [role="img"][aria-label]')].map((e) => e.getAttribute('aria-label').split(', ').slice(1, 3).join(' ')))
    const sets = await page.evaluate(() => document.querySelectorAll('ul[aria-label="SBC setleri"] > li').length)
    const axe = await new AxeBuilder({ page }).analyze()
    report.push({ shot: `izgara-${theme}-${w}`, sets, rewardCards: rewardCards.length, rewardCardSample: rewardCards.slice(0, 3), utItemRequests: itemsAsked,
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
      axeSeriousCritical: axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical').length, problems, text: await page.evaluate(pageMinFont, 11) })
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(report, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || r.text?.belowCount > 0 || r.rewardCards === 0)
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
report.forEach((r) => console.log(' ·', r.shot, JSON.stringify({ sets: r.sets, rewardCards: r.rewardCards, sample: r.rewardCardSample, utItemRequests: r.utItemRequests, minFont: r.text?.minFontPx })))
bad.forEach((r) => console.log(' -', JSON.stringify(r).slice(0, 400)))
process.exitCode = bad.length ? 1 : 0
