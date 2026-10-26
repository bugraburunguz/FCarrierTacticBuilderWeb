// Marka ekran kapıları: üst bar (375/1280 × koyu/açık), giriş sayfası, hakkında; axe + taşma. Çıktı: Claude outputs/screens/BRAND/ (repo dışı)
// Kullanım: node scripts/brand-shots.mjs [--base http://localhost:8081]   (oturum gerekmez)
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const out = screensDir('BRAND')
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 1280, h: 800 }]) {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    await context.addInitScript((t) => { localStorage.setItem('fc.theme', t); localStorage.setItem('fc.mode', 'career') }, theme)
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList|429/.test(m.text()) && problems.push(m.text().slice(0, 160)))
    for (const [name, path, clip] of [['ust-bar', '/replicas?ui=v3', { x: 0, y: 0, width: w, height: 64 }], ['giris', '/login?ui=v3'], ['hakkinda', '/about?ui=v3']]) {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), ...(clip ? { clip } : {}) })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}`), problems: [...problems] })
      problems.length = 0
    }
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(report, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length)
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r)))
