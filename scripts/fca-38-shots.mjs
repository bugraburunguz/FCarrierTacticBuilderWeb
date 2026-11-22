// FCA-38 kapıları: Kadro → Liste'de ismin solundaki karşılaştırma artısı; iki oyuncu eklenir, alt tepside görünür. 375 + 1280, yalnız koyu.
// Ölçüm: taşma, axe serious/critical, konsol hatası, ağ 4xx-5xx (eski yerel imajda olmayan /squad/form 404'ü hariç), karşılaştırma listesindeki oyuncu sayısı.
// Kullanım: node scripts/fca-38-shots.mjs [--base http://localhost:4173]. Yalnız localhost; test hesabı koşu sonunda silinir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:4173'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = screensDir('FCA-38')
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))

await createGateAccount(base, 'gate-')
const session = (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  if (res.status >= 300) {
    throw new Error(`${method} ${path} → ${res.status}`)
  }
  return text ? JSON.parse(text).data : undefined
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'FCA-38 kapı', budgetEur: 5_000_000 })

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
const RESOURCE_LINE = /^Failed to load resource:/
for (const w of [375, 1280]) {
  const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 812 : 900 }, hasTouch: w < 768 })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !RESOURCE_LINE.test(m.text()) && errors.push(m.text()))
  page.on('response', (r) => r.url().includes('/api/') && r.status() >= 400 && !(r.status() === 404 && /\/squad\/form$/.test(new URL(r.url()).pathname)) && errors.push(`${r.status()} ${r.url()}`))
  await page.goto(`${base}/`)
  await page.evaluate(({ c, s }) => {
    localStorage.setItem('fc.theme', 'dark')
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.career', String(c))
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
    localStorage.removeItem('fc.compare')
  }, { c: career.id, s: session })
  await page.goto(`${base}/career/squad?sekme=liste&ui=v3`, { waitUntil: 'networkidle' })
  const plus = page.locator('[data-squad-table] td[data-col="name"]').getByRole('button', { name: 'Karşılaştırmaya ekle' })
  await plus.first().waitFor({ timeout: 15000 }).catch(async (e) => {
    await page.screenshot({ path: file(`hata-${w}.png`) })
    throw e
  })
  await page.screenshot({ path: file(`kadro-liste-${w}.png`) })
  await plus.nth(0).click()
  await plus.nth(0).click()
  await page.waitForTimeout(300)
  const compared = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.compare') ?? '[]').length)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const axe = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)
  await page.screenshot({ path: file(`kadro-liste-iki-eklendi-${w}.png`) })
  results.push({ w, compared, overflow, axe, errors })
  await context.close()
}
await browser.close()

writeFileSync(file('gates.json'), JSON.stringify(results, null, 2))
for (const r of results) {
  console.log(`kadro-liste ${r.w}: kıyasta ${r.compared} · taşma ${r.overflow}px · axe ${r.axe.join(',') || 'temiz'} · hata ${r.errors.length}${r.errors.length ? ` (${r.errors.slice(0, 2).join(' | ')})` : ''}`)
}
process.exit(results.some((r) => r.compared !== 2 || r.overflow > 0 || r.axe.length > 0 || r.errors.length > 0) ? 1 : 0)
