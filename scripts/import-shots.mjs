// HAR-01 ekran kapıları: /ut/import HAR içe aktarma — boş, özet (sentetik HAR, Web Worker'da ayrıştırılır), hata (bozuk dosya);
// 375/768/1280 × koyu/açık. Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, sayfa geneli minFont (≥ 11px).
// Sayfa oturum ister: oturum yalnız bu test tarayıcısında taklit edilir (sahte token + /me, /careers yanıtı); gerçek hesap açılmaz.
// Hiçbir şey gönderilmez (Gönder'e basılmaz); kurallar gerçek GET /ut/capture/rules ucundan.
// Kullanım: node scripts/import-shots.mjs [--base http://localhost:8081]   Çıktı: docs/review/v2/screens/HAR-01/
import { AxeBuilder } from '@axe-core/playwright'
import { spawnSync } from 'node:child_process'
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
const out = new URL('../docs/review/v2/screens/HAR-01/', import.meta.url)
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))
const HAR = fileURLToPath(new URL('../tests/fixtures/har/sample.har', import.meta.url))
const MIN_FONT = 11
const ME = { id: 990_000, email: 'kapi@example.test', subscriptionType: 'FREE', creditBalance: 0, dailyCreditLimit: 0, showAds: false, role: 'USER', emailVerified: true }
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
const COMPOSE = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
const resetRateLimits = () => spawnSync('docker', ['compose', '-f', COMPOSE, 'exec', '-T', 'redis', 'sh', '-c', 'for k in $(redis-cli --scan --pattern "fc:ratelimit:*"); do redis-cli del $k >/dev/null; done'], { encoding: 'utf8' })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    resetRateLimits()
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    await context.addInitScript((t) => { localStorage.setItem('fc.theme', t); localStorage.setItem('fc.mode', 'ut'); localStorage.setItem('fc.access', 'kapi-sahte-token') }, theme)
    await context.route(/\/api\/v1\/me(\?|$)/, (r) => r.fulfill(ok(ME)))
    await context.route(/\/api\/v1\/careers(\?|$)/, (r) => r.fulfill(ok([])))
    // Gönderim olmamalı: yakalama uçlarına istek gelirse sorun olarak kaydedilir.
    const sent = []
    await context.route(/\/api\/v1\/ut\/(capture|contrib\/capture)$/, (r) => { sent.push(r.request().url()); return r.abort() })
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    const record = async (name, extra = {}) => {
      await page.waitForTimeout(300)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), fullPage: w < 820 })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`), problems: [...problems], sent: [...sent], text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
      problems.length = 0
    }
    await page.goto(`${base}/ut/import?ui=v3`, { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: 'HAR dosyasından içe aktar' }).waitFor()
    await record('bos')
    await page.setInputFiles('input[aria-label="HAR dosyası"]', HAR)
    const summary = page.getByRole('region', { name: 'Gönderilmeden önce özet' })
    await summary.waitFor()
    await summary.scrollIntoViewIfNeeded()
    const counts = await summary.locator('dl > div').evaluateAll((rows) => Object.fromEntries(rows.map((r) => [r.querySelector('dt').textContent, Number(r.querySelector('dd').textContent)])))
    await page.evaluate(() => window.scrollTo(0, 0))
    await record('ozet', { counts })
    await page.setInputFiles('input[aria-label="HAR dosyası"]', { name: 'bozuk.har', mimeType: 'application/json', buffer: Buffer.from('{bozuk') })
    await page.getByRole('alert').filter({ hasText: 'geçerli bir HAR' }).waitFor()
    await record('hata')
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(report, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || r.sent.length || (r.text && r.text.belowCount > 0))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r)))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(` · sayfa minFont: en küçük ${Math.min(...mins)}px; hariç tutulan: ${JSON.stringify([...new Set(report.flatMap((r) => r.text?.excluded ?? []))])}`)
console.log(' · özet sayıları:', JSON.stringify(report.find((r) => r.counts)?.counts))
