// FCA-3 Parça 1 kapıları: kariyer kabuğu (Stitch Tactical Operations: sol menü + üst kariyer barı, yalnız koyu) ve UT'nin değişmediği.
// Üretim derlemesi (vite preview, /api yerel yığına vekil). 1280/768/375 × kariyer (Masa, Kadro) + UT 1280. Ölçüm: taşma, axe serious/critical,
// konsol hatası, ağ 4xx-5xx. Kullanım: node scripts/fca-3-shots.mjs [--base http://localhost:4173]. Yalnız localhost; test hesabı koşu sonunda silinir.
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
const outDir = screensDir('FCA-3')
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
const career = await api('POST', '/careers', { clubId: club.id, name: 'FCA-3 kapı', budgetEur: 5_000_000 })
await api('PATCH', `/careers/${career.id}`, { gameDate: '2027-09-19' })

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
// Yerel backend imajı MGR-a / GT-a / GTR'den eskiyse bu uçlar 404 döner (ortam, bu değişiklik değil); ayrı sayılır, kapıyı düşürmez.
const STALE_LOCAL = /\/me\/manager-profile|\/careers\/\d+\/(training|growth-recent)|Failed to load resource: the server responded with a status of 404/
async function shot(name, path, w, mode, theme = 'dark') {
  const context = await browser.newContext({ viewport: { width: w, height: 900 } })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('response', (r) => r.url().includes('/api/') && r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`))
  await page.goto(`${base}/`)
  await page.evaluate(({ c, s, m, t }) => {
    localStorage.setItem('fc.theme', t)
    localStorage.setItem('fc.mode', m)
    localStorage.setItem('fc.career', String(c))
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
  }, { c: career.id, s: session, m: mode, t: theme })
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const look = await page.evaluate(() => ({ surface: document.documentElement.dataset.surface ?? '-', dark: document.documentElement.classList.contains('dark') }))
  const axe = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)
  await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), fullPage: false })
  results.push({ name, w, theme, look, overflow, axe, errors: errors.filter((e) => !STALE_LOCAL.test(e)), staleLocal: errors.filter((e) => STALE_LOCAL.test(e)).length })
  await context.close()
}

for (const w of [1280, 900, 768, 375]) {
  await shot('masa', '/career/dashboard', w, 'career')
  await shot('kadro', '/career/squad', w, 'career')
}
// Parça 2: tablo, rozet ve panel başlığı olan ekranlar
for (const w of [1280, 375]) {
  await shot('transfer', '/career/transfer', w, 'career')
  await shot('altyapi', '/career/academy', w, 'career')
  await shot('gelisim', '/career/growth', w, 'career')
}
// Açık tema seçiliyken kariyer ekranı yine koyu; herkese açık sayfa ve UT kullanıcının temasında, eski kabukta.
await shot('masa', '/career/dashboard', 1280, 'career', 'light')
await shot('giris', '/about', 1280, 'career', 'light')
await shot('ut-kadro-kurucu', '/ut/squad', 1280, 'ut', 'light')
await browser.close()

const expectLook = (r) => (r.name === 'giris' || r.name.startsWith('ut-') ? r.look.surface === '-' && r.look.dark === (r.theme === 'dark') : r.look.surface === 'career' && r.look.dark)
writeFileSync(file('gates.json'), JSON.stringify(results, null, 2))
for (const r of results) {
  console.log(`${r.name} ${r.theme} ${r.w}: görünüm ${r.look.surface}/${r.look.dark ? 'koyu' : 'açık'} ${expectLook(r) ? 'doğru' : 'YANLIŞ'} · taşma ${r.overflow}px · axe ${r.axe.join(',') || 'temiz'} · hata ${r.errors.length} · eski yerel imaj 404 ${r.staleLocal}`)
}
const failed = results.some((r) => r.overflow > 0 || r.axe.length > 0 || r.errors.length > 0 || !expectLook(r))
process.exit(failed ? 1 : 0)
