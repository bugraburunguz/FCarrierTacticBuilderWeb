// FCA-28 kapıları: girişli kariyer kullanıcısı logoya tıklayınca eski görünüm (/ ana sayfası, kariyer dışı kabuk) bir kare bile çizilmeden Masa'ya gider.
// Backend gerekmez: /api istekleri sahte yanıtla karşılanır (hesap açılmaz). Küçük düzeltme matrisi: 375 + 1280, yalnız koyu.
// Ölçüm: tıklamadan sonra her karede adres ve kabuk yüzeyi (data-surface), taşma, axe serious/critical, konsol hatası.
// Kullanım: node scripts/fca-28-shots.mjs [--base http://localhost:4173]. Yalnız localhost.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
let server
if (!args.includes('--base')) {
  const { preview } = await import('vite')
  server = await preview({ preview: { port: 4178, strictPort: true } })
}
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:4178'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = screensDir('FCA-28')
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))

const ME = { id: 1, email: 'kapi@example.test', emailVerified: true, subscriptionType: 'FREE', creditBalance: 20 }
async function fakeApi(route) {
  const path = new URL(route.request().url()).pathname.replace(/^\/api\/v1/, '')
  const data = path === '/auth/me' || path === '/me' ? ME : []
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
}

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
const RESOURCE_LINE = /^Failed to load resource:/
for (const [w, h] of [[375, 812], [1280, 900]]) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768 })
  await context.route('**/api/**', fakeApi)
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !RESOURCE_LINE.test(m.text()) && errors.push(m.text()))
  await page.goto(`${base}/about`)
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('fc.theme', 'light')
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.access', 'kapi-sahte')
    localStorage.setItem('fc.refresh', 'kapi-sahte')
  })
  await page.goto(`${base}/career/transfer`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: file(`once-transfer-koyu-${w}.png`) })
  await page.evaluate(() => {
    window.__frames = []
    const tick = () => {
      window.__frames.push({ path: location.pathname, surface: document.documentElement.dataset.surface ?? null, oldHome: !!document.querySelector('h1')?.textContent?.match(/^FC Assist$/) })
      if (window.__frames.length < 120) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  await page.locator('header a[aria-label="FC Assist"]').click()
  await page.waitForTimeout(2200)
  const frames = await page.evaluate(() => window.__frames)
  const after = frames.slice(frames.findIndex((f) => f.path !== '/career/transfer'))
  const bad = after.filter((f) => f.path === '/' || f.surface !== 'career' || f.oldHome)
  const finalPath = await page.evaluate(() => location.pathname)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const axe = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)
  await page.screenshot({ path: file(`logo-sonrasi-masa-koyu-${w}.png`) })
  // Doğrudan / adresi (yeniden yükleme): ilk boyamada açık tema yok, Masa'ya gider.
  await page.addInitScript(() => {
    window.__darkLog = []
    new MutationObserver(() => window.__darkLog.push({ path: location.pathname, dark: document.documentElement.classList.contains('dark') }))
      .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  })
  await page.goto(`${base}/`, { waitUntil: 'networkidle' })
  const darkLog = await page.evaluate(() => window.__darkLog)
  const firstDark = darkLog.length === 0 || darkLog.every((d) => d.dark)
  const directPath = await page.evaluate(() => location.pathname)
  results.push({ w, finalPath, frames: after.length, badFrames: bad.length, firstBad: bad[0] ?? null, directPath, firstDark, overflow, axe, errors })
  await context.close()
}
await browser.close()
await server?.close()

writeFileSync(file('gates.json'), JSON.stringify(results, null, 2))
for (const r of results) {
  console.log(`${r.w}: logo → ${r.finalPath} · ${r.frames} kare, eski görünüm ${r.badFrames} kare${r.firstBad ? ` (${JSON.stringify(r.firstBad)})` : ''} · doğrudan / → ${r.directPath}, ilk boyama koyu ${r.firstDark} · taşma ${r.overflow}px · axe ${r.axe.join(',') || 'temiz'} · hata ${r.errors.length}${r.errors.length ? ` ${r.errors.slice(0, 2).join(' | ')}` : ''}`)
}
process.exit(results.some((r) => r.finalPath !== '/career/dashboard' || r.badFrames > 0 || r.directPath !== '/career/dashboard' || !r.firstDark || r.overflow > 0 || r.axe.length > 0) ? 1 : 0)
