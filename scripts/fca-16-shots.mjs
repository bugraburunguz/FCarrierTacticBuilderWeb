// FCA-16 kapıları: replika detayındaki "Ek taktik" bölümü (Beşiktaş 2021 · Arka direk Serci), 375 ve 1280 px, yalnız koyu.
// Yerel backend imajında varyant yoksa detay yanıtına varyant, backend worktree seed'inden eklenir (kod alanı "ÖRNEK" yer tutucusu).
// Ölçüm: yatay taşma, axe serious/critical, konsol hatası, ağ 4xx-5xx.
// Kullanım: VITE_BACKEND_URL=http://localhost:8081 npx vite preview --port 4173 & node scripts/fca-16-shots.mjs [--base http://localhost:4173] [--seed <replicas.fc27.json>]
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d)
const base = arg('--base', 'http://localhost:4173')
const seedPath = arg('--seed', '../fca-16-backend/src/main/resources/seed/replicas.fc27.json')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const REPLICA = 'sergen_besiktas_2021'
const seedVariants = JSON.parse(readFileSync(seedPath, 'utf8')).find((r) => r.id === REPLICA).fc27.variants
const outDir = screensDir('FCA-16')
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
for (const w of [375, 1280]) {
  const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 812 : 900 }, hasTouch: w < 768 })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !/^Failed to load resource:/.test(m.text()) && errors.push(m.text()))
  page.on('response', (r) => r.url().includes('/api/') && r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`))
  let injected = false
  await page.route(`**/api/v1/replicas/${REPLICA}`, async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    if (!body.data.fc27.variants) {
      body.data.fc27.variants = seedVariants.map((v) => ({ ...v, tacticCode: 'ÖRNEK' }))
      injected = true
    }
    await route.fulfill({ status: res.status(), json: body })
  })
  await page.goto(`${base}/`)
  await page.evaluate(() => localStorage.setItem('fc.theme', 'dark'))
  await page.goto(`${base}/replicas/${REPLICA}`, { waitUntil: 'networkidle' })
  const tab = page.getByRole('tab', { name: /Taktik/ })
  if (await tab.count()) {
    await tab.first().click()
  }
  const section = page.getByRole('region', { name: 'Arka direk Serci' })
  await section.waitFor({ timeout: 10000 })
  await section.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const name = `replica-varyant-${w}-koyu.png`
  await page.screenshot({ path: file(name), fullPage: true })
  await section.screenshot({ path: file(`replica-varyant-bolum-${w}-koyu.png`) })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  const axe = await new AxeBuilder({ page }).include('main').analyze()
  const serious = axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id} (${v.nodes.length})`)
  results.push({ width: w, shot: name, injected, overflow, axe: serious, errors })
  await context.close()
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
