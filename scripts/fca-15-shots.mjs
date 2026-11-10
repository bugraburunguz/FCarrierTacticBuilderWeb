// FCA-15 kapıları: Kadro › Derinlik ve Masa (derinlik işi), 375 ve 1280, yalnız koyu, kariyer. Üretim derlemesi (vite preview, /api yerel yığına vekil).
// Ölçüm: yatay taşma, axe serious/critical, konsol hatası, ağ 4xx-5xx; /fit/lineup yanıtında slots[].depth var mı, "Derinlik bilgisi yok" sayısı.
// Kullanım: node scripts/fca-15-shots.mjs [--base http://localhost:4174]. Yalnız localhost; test hesabı koşu sonunda silinir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d)
const base = arg('--base', 'http://localhost:4174')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = screensDir('FCA-15')
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
const career = await api('POST', '/careers', { clubId: club.id, name: 'FCA-15 kapı', budgetEur: 5_000_000 })
await api('PATCH', `/careers/${career.id}`, { gameDate: '2027-09-19' })

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
const STALE_LOCAL = /\/me\/manager-profile|\/careers\/\d+\/(training|growth-recent)|\/recommendations\/reachable-leagues/
const RESOURCE_LINE = /^Failed to load resource:/
async function shot(name, path, w) {
  const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 812 : 900 }, hasTouch: w < 768 })
  const page = await context.newPage()
  const errors = []
  const lineup = { calls: 0, withDepth: 0, slots: 0 }
  page.on('console', (m) => m.type() === 'error' && !RESOURCE_LINE.test(m.text()) && errors.push(m.text()))
  page.on('response', async (r) => {
    if (r.url().includes('/api/') && r.status() >= 400) {
      errors.push(`${r.status()} ${r.url()}`)
    }
    if (r.url().includes('/fit/lineup') && r.request().method() === 'POST' && r.status() < 300) {
      const slots = (await r.json().catch(() => ({})))?.data?.slots ?? []
      lineup.calls += 1
      lineup.slots += slots.length
      lineup.withDepth += slots.filter((s) => Array.isArray(s.depth)).length
    }
  })
  await page.goto(`${base}/`)
  await page.evaluate(({ c, s }) => {
    localStorage.setItem('fc.theme', 'dark')
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.career', String(c))
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
  }, { c: career.id, s: session })
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const text = await page.evaluate(() => document.body.innerText)
  const count = (re) => (text.match(re) ?? []).length
  const axe = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)
  await page.screenshot({ path: file(`${name}-${w}-ekran.png`) })
  await page.screenshot({ path: file(`${name}-${w}.png`), fullPage: true })
  results.push({ name, w, overflow, axe, lineup, noInfo: count(/Derinlik bilgisi yok/g), noBackup: count(/Yedek yok/g), weak: count(/Yedek zayıf/g),
    depthJobs: count(/Derinlik: /g), errors: errors.filter((e) => !STALE_LOCAL.test(e)), staleLocal: errors.filter((e) => STALE_LOCAL.test(e)).length })
  await context.close()
}

for (const w of [375, 1280]) {
  await shot('kadro-derinlik', '/career/squad?sekme=derinlik', w)
  await shot('masa', '/career/dashboard', w)
}
await browser.close()

writeFileSync(file('gates.json'), JSON.stringify(results, null, 2))
for (const r of results) {
  console.log(`${r.name} ${r.w}: taşma ${r.overflow}px · axe ${r.axe.join(',') || 'temiz'} · hata ${r.errors.length} · eski yerel imaj 404 ${r.staleLocal}`
    + ` · /fit/lineup ${r.lineup.calls} çağrı, depth'li slot ${r.lineup.withDepth}/${r.lineup.slots} · "Derinlik bilgisi yok" ${r.noInfo} · "Yedek yok" ${r.noBackup} · "Yedek zayıf" ${r.weak} · derinlik işi ${r.depthJobs}`)
}
