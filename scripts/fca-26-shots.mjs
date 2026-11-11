// FCA-26 kapıları: ziyaretçi karşılama sayfası (yeni sayfa, tam matris 375/768/1280 × koyu/açık) + 320 px ve telefon yatay (812×375).
// Oturumsuz: test hesabı açılmaz. Ölçüm: taşma, axe serious/critical, konsol hatası, ağ 4xx-5xx, h1 ve "Ücretsiz başla" ilk ekranda mı.
// Kullanım: node scripts/fca-26-shots.mjs [--base http://localhost:4173]. Yalnız localhost.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:4173'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = screensDir('FCA-26')
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
const RESOURCE_LINE = /^Failed to load resource:/
async function shot(name, w, h, theme, mode = 'career') {
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900 && h < 500 ? true : w < 768 })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !RESOURCE_LINE.test(m.text()) && errors.push(m.text()))
  page.on('response', (r) => r.url().includes('/api/') && r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`))
  await page.goto(`${base}/`)
  await page.evaluate(({ t, m }) => {
    localStorage.clear()
    localStorage.setItem('fc.theme', t)
    localStorage.setItem('fc.mode', m)
  }, { t: theme, m: mode })
  await page.goto(`${base}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const fold = await page.evaluate(() => {
    const inView = (el) => !!el && el.getBoundingClientRect().top < window.innerHeight && el.getBoundingClientRect().bottom > 0
    return { h1: inView(document.querySelector('h1')), cta: inView([...document.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Ücretsiz başla')) }
  })
  const violations = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact))
  const axe = violations.map((v) => v.id)
  for (const v of violations) {
    console.log(`  axe ${v.id} (${name} ${theme} ${w}):`, v.nodes.slice(0, 6).map((n) => `${n.target.join(' ')} → ${(n.any[0]?.message ?? '').slice(0, 90)}`).join(' || '))
  }
  await page.screenshot({ path: file(`${name}-${theme}-${w}x${h}.png`) })
  await page.screenshot({ path: file(`${name}-${theme}-${w}x${h}-tam.png`), fullPage: true })
  results.push({ name, w, h, theme, overflow, axe, errors, fold })
  await context.close()
}

for (const theme of ['dark', 'light']) {
  for (const [w, h] of [[375, 812], [768, 1024], [1280, 900]]) {
    await shot('karsilama', w, h, theme)
  }
  await shot('karsilama-yatay', 812, 375, theme)
}
await shot('karsilama', 320, 640, 'dark')
await shot('karsilama-ut', 1280, 900, 'dark', 'ut')
await browser.close()

writeFileSync(file('gates.json'), JSON.stringify(results, null, 2))
for (const r of results) {
  console.log(`${r.name} ${r.theme} ${r.w}x${r.h}: taşma ${r.overflow}px · axe ${r.axe.join(',') || 'temiz'} · hata ${r.errors.length} · ilk ekranda h1 ${r.fold.h1 ? 'var' : 'YOK'} / Ücretsiz başla ${r.fold.cta ? 'var' : 'YOK'}`)
}
process.exit(results.some((r) => r.overflow > 0 || r.axe.length > 0 || r.errors.length > 0 || !r.fold.h1) ? 1 : 0)
