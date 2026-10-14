// V3-05a ekran kapıları: UT kart veritabanı (ızgara, filtreli, tablo, mobil sheet, boş durum) 375/1280 × koyu/açık; axe + taşma + konsol/ağ.
// Kullanım: node scripts/card-db-shots.mjs [--base http://localhost:8081]   (oturum gerekmez: /players herkese açık)
// Çıktı: docs/review/v2/screens/V3-05a/*.png ve gates-report.json
import { AxeBuilder } from '@axe-core/playwright'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const out = new URL('../docs/review/v2/screens/V3-05a/', import.meta.url)
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))
const COMPOSE = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
const resetRateLimits = () => spawnSync('docker', ['compose', '-f', COMPOSE, 'exec', '-T', 'redis', 'sh', '-c', 'for k in $(redis-cli --scan --pattern "fc:ratelimit:*"); do redis-cli del $k >/dev/null; done'], { encoding: 'utf8' })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []

async function record(page, problems, name) {
  await page.waitForTimeout(500)
  await page.screenshot({ path: file(name) })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  const axe = await new AxeBuilder({ page }).analyze()
  const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
  report.push({ shot: name, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`), problems: [...problems] })
  problems.length = 0
}

for (const { w, h } of [{ w: 375, h: 812 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    resetRateLimits()
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    await context.addInitScript((t) => { localStorage.setItem('fc.theme', t); localStorage.setItem('fc.mode', 'ut') }, theme)
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    const open = async (path, ready) => {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
      await ready(page)
    }
    await open('/players?ui=v3', (p) => p.getByRole('status').filter({ hasText: 'kart' }).first().waitFor())
    await record(page, problems, `izgara-${theme}-${w}.png`)
    await open('/players?mevki=ST&ovrmin=88&ui=v3', (p) => p.getByRole('status').filter({ hasText: 'kart' }).first().waitFor())
    await record(page, problems, `izgara-filtreli-${theme}-${w}.png`)
    await open('/players?gorunum=table&ui=v3', (p) => p.getByRole('table').waitFor())
    await record(page, problems, `tablo-${theme}-${w}.png`)
    await open('/players?ara=zzzzqqq&ui=v3', (p) => p.getByText('Bu süzgeçlere uyan kart yok.').waitFor())
    await record(page, problems, `bos-${theme}-${w}.png`)
    if (w < 820) {
      await open('/players?ui=v3', (p) => p.getByRole('button', { name: /Filtreler/ }).waitFor())
      await page.getByRole('button', { name: /Filtreler/ }).click()
      await page.getByRole('dialog', { name: 'Filtreler' }).waitFor()
      await record(page, problems, `mobil-sheet-${theme}-${w}.png`)
    } else {
      await open('/players?ui=v3', (p) => p.getByText('Daha fazla filtre').waitFor())
      await page.getByText('Daha fazla filtre').click()
      await record(page, problems, `gelismis-${theme}-${w}.png`)
    }
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(report, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length)
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r)))
