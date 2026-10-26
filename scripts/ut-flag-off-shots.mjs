// V3-06a: VITE_EXTENSION_CAPTURE=off iken UT menüsü ve yakalamaya bağlı sayfalar (CaptureOnly notu). 375/1280 × koyu/açık.
// Sunucu: bayrak kapalı dev sunucusu, ör. `VITE_EXTENSION_CAPTURE=off VITE_BACKEND_URL=http://localhost:8081 npx vite --port 5173 --strictPort --host 127.0.0.1`.
// Kullanım: node scripts/ut-flag-off-shots.mjs [--base http://127.0.0.1:5173]   Çıktı: Claude outputs/screens/V3-06a/ut-flag-off/ (repo dışı)
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { pageMinFont } from './lib/readability.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://127.0.0.1:5173'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const out = screensDir('V3-06a', 'ut-flag-off')
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))
const CAPTURE_ONLY = ['SBC', 'Kadrom', 'Objective', 'Evolution', 'Kulüp içe aktar']

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    await context.addInitScript((t) => { localStorage.setItem('fc.theme', t); localStorage.setItem('fc.mode', 'ut') }, theme)
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    const record = async (name, extra = {}) => {
      await page.waitForTimeout(400)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`) })
      const axe = await new AxeBuilder({ page }).analyze()
      report.push({ shot: `${name}-${theme}-${w}`, overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), axeSeriousCritical: axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical').length, axeNodes: axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical').flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))), problems: [...problems], text: await page.evaluate(pageMinFont, 11), ...extra })
      problems.length = 0
    }
    // Menü: yakalamaya bağlı girişler görünmez (masaüstü yan menü + üst sekmeler; mobilde alt menü + sayfa sekmeleri).
    await page.goto(`${base}/players?ui=v3`, { waitUntil: 'networkidle' })
    const navText = await page.evaluate(() => [...document.querySelectorAll('nav')].map((n) => n.innerText).join(' | '))
    if (w < 820) {
      await page.getByRole('button', { name: /Menü/ }).first().click().catch(() => undefined)
    }
    const menuText = await page.evaluate(() => document.body.innerText)
    await record('menu', { navText, captureItemsVisible: CAPTURE_ONLY.filter((label) => new RegExp(`(^|\\n|\\|)\\s*${label}\\s*($|\\n|\\|)`).test(`${navText}\n${menuText}`)) })
    for (const [name, path] of [['sbc', '/ut/sbc'], ['kadrom', '/ut/club'], ['ice-aktar', '/ut/import']]) {
      await page.goto(`${base}${path}?ui=v3`, { waitUntil: 'networkidle' })
      await record(name, { captureOffNote: await page.getByText('Kulüp ve SBC yakalama bu sürümde kapalı.').count() })
    }
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(report, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || r.text?.belowCount > 0 || (r.captureItemsVisible?.length ?? 0) > 0 || (r.captureOffNote !== undefined && r.captureOffNote < 1))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r).slice(0, 400)))
report.filter((r) => r.navText).forEach((r) => console.log(' ·', r.shot, r.navText.replace(/\s+/g, ' ').slice(0, 200)))
process.exitCode = bad.length ? 1 : 0
