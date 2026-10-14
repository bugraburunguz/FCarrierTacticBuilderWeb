// V3-05b ekran kapıları: UT oyuncu sayfası (4 sekme) 375/1280 × koyu/açık; axe + taşma + konsol/ağ. Oturum gerekmez.
// Kullanım: node scripts/ut-player-shots.mjs [--base http://localhost:8081] [--asset 231747]   Çıktı: docs/review/v2/screens/V3-05b/
import { AxeBuilder } from '@axe-core/playwright'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
const asset = args.includes('--asset') ? args[args.indexOf('--asset') + 1] : '231747'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const out = new URL('../docs/review/v2/screens/V3-05b/', import.meta.url)
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))
const COMPOSE = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
const resetRateLimits = () => spawnSync('docker', ['compose', '-f', COMPOSE, 'exec', '-T', 'redis', 'sh', '-c', 'for k in $(redis-cli --scan --pattern "fc:ratelimit:*"); do redis-cli del $k >/dev/null; done'], { encoding: 'utf8' })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    resetRateLimits()
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    await context.addInitScript((t) => { localStorage.setItem('fc.theme', t); localStorage.setItem('fc.mode', 'ut') }, theme)
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    for (const [name, query, ready] of [
      ['statlar', '', 'Finishing'],
      ['roller', '?sekme=roller', 'Neden?'],
      ['fiyat', '?sekme=fiyat', 'Bu kart için fiyat kaydı yok'],
      ['alinis', '?sekme=alinis', 'nasıl alınacağına dair kayıt yok'],
    ]) {
      await page.goto(`${base}/ut/players/${asset}${query}${query ? '&' : '?'}ui=v3`, { waitUntil: 'networkidle' })
      await page.getByRole('heading', { level: 1 }).waitFor()
      if (name === 'statlar') await page.getByRole('tabpanel').getByText('Finishing', { exact: false }).first().or(page.getByRole('tabpanel').getByText('Bitiricilik').first()).waitFor()
      else await page.getByText(ready, { exact: false }).first().waitFor({ timeout: 20000 })
      await page.waitForTimeout(400)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`) })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`), problems: [...problems] })
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
