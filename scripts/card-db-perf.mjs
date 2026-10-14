// V3-05a-b performans: 2.000 kart yükle, kaydırma sırasında uzun görev (>50 ms) sayısı ve DOM düğüm sayısı (ızgara + tablo, masaüstü + mobil).
// Kullanım: node scripts/card-db-perf.mjs [--base http://localhost:8081] [--cards 2000]   Çıktı: docs/review/v2/screens/V3-05a/perf-report.json
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
const target = args.includes('--cards') ? Number(args[args.indexOf('--cards') + 1]) : 2000
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const out = new URL('../docs/review/v2/screens/V3-05a/', import.meta.url)
mkdirSync(out, { recursive: true })
const COMPOSE = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
const resetRateLimits = () => spawnSync('docker', ['compose', '-f', COMPOSE, 'exec', '-T', 'redis', 'sh', '-c', 'for k in $(redis-cli --scan --pattern "fc:ratelimit:*"); do redis-cli del $k >/dev/null; done'], { encoding: 'utf8' })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []

for (const [label, viewport] of [['masaüstü 1280', { width: 1280, height: 900 }], ['mobil 375', { width: 375, height: 812 }]]) {
  for (const view of ['grid', 'table']) {
    resetRateLimits()
    const context = await browser.newContext({ viewport })
    await context.addInitScript(() => {
      localStorage.setItem('fc.mode', 'ut')
      window.__longTasks = []
      new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__longTasks.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true })
    })
    const page = await context.newPage()
    await page.goto(`${base}/players?gorunum=${view}&ui=v3`, { waitUntil: 'networkidle' })
    const loaded = () => page.evaluate(() => Number((document.querySelector('[role="status"]')?.textContent ?? '').match(/(\d+) gösteriliyor/)?.[1] ?? 0))
    let guard = 0
    while ((await loaded()) < target && guard++ < 80) {
      const more = page.getByRole('button', { name: /kart daha yükle/ })
      if (!(await more.count())) break
      await more.scrollIntoViewIfNeeded()
      const before = await loaded()
      await more.click()
      await page.waitForFunction((b) => Number((document.querySelector('[role="status"]')?.textContent ?? '').match(/(\d+) gösteriliyor/)?.[1] ?? 0) > b, before, { timeout: 15000 }).catch(() => undefined)
    }
    const shown = await loaded()
    await page.evaluate(() => { window.__longTasks = [] })
    // kaydırma: tepeden dibe adım adım, sonra yukarı
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    let maxNodes = 0
    let maxRows = 0
    for (let y = 0; y < height; y += Math.round(viewport.height * 0.8)) {
      await page.evaluate((top) => window.scrollTo(0, top), y)
      await page.waitForTimeout(60)
      const stats = await page.evaluate(() => ({ nodes: document.getElementsByTagName('*').length, rows: document.querySelectorAll('li, tbody tr:not([data-virtual-placeholder])').length }))
      maxNodes = Math.max(maxNodes, stats.nodes)
      maxRows = Math.max(maxRows, stats.rows)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)
    const longTasks = await page.evaluate(() => window.__longTasks)
    results.push({ ekran: label, gorunum: view, yuklenenKart: shown, sayfaYuksekligiPx: height, kaydirmadaMaksDomDugumu: maxNodes, kaydirmadaMaksSatirKart: maxRows, uzunGorevSayisi: longTasks.length, enUzunGorevMs: Math.max(0, ...longTasks) })
    await context.close()
  }
}
await browser.close()
writeFileSync(fileURLToPath(new URL('perf-report.json', out)), JSON.stringify(results, null, 2))
console.table(results)
