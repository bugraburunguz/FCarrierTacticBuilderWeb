// FCA-32 kapıları: Yönetici sayfası "Kadro yükle" sekmesi (panel, onay, sonuç) ve kariyer menüsündeki "Yönetici" bağlantısı (375 + 1280, koyu).
// ADMIN oturumu ortamdan: GATE_ADMIN_EMAIL / GATE_ADMIN_PASSWORD (yazdırılmaz). import-base ve squad-versions uçları page.route ile örnek
// yanıtla taklit edilir; gerçek yükleme yapılmaz. Ölçüm: taşma, axe serious/critical, konsol hatası, ağ 4xx-5xx. Rapor: gates-report.json.
// Kullanım: GATE_ADMIN_EMAIL=… GATE_ADMIN_PASSWORD=… node scripts/fca-32-shots.mjs [--base http://localhost:4173]. Yalnız localhost.
import { AxeBuilder } from '@axe-core/playwright'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:4173'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const email = process.env.GATE_ADMIN_EMAIL
const password = process.env.GATE_ADMIN_PASSWORD
if (!email || !password) {
  console.error('GATE_ADMIN_EMAIL ve GATE_ADMIN_PASSWORD ortam değişkenleri gerekli (yerel ADMIN hesabı).')
  process.exit(2)
}
const outDir = screensDir('FCA-32')
const file = (n) => fileURLToPath(new URL(n, outDir))

const login = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })
if (login.status >= 300) {
  console.error(`Giriş başarısız (${login.status}).`)
  process.exit(2)
}
const session = (await login.json()).data
const me = (await (await fetch(`${base}/api/v1/me`, { headers: { authorization: `Bearer ${session.accessToken}` } })).json()).data
if (me?.role !== 'ADMIN') {
  console.error('Hesap ADMIN değil.')
  process.exit(2)
}

const VERSIONS = [
  { id: 2, versionNo: 2, label: 'Kadro güncellemesi 20.11.2026', gameBuild: '1.2.3', exportedAt: '2026-11-20T10:00:00Z', playerCount: 18234, latest: true },
  { id: 1, versionNo: 1, label: 'Çıkış kadrosu', gameBuild: null, exportedAt: null, playerCount: 18000, latest: false },
]
const RESULT = {
  playersInFile: 18300, existing: 18000, created: 120, skippedNoTeam: 3, skippedNoPosition: 0, nationalitiesCreated: 0, clubsCreated: 1, leaguesCreated: 0,
  updated: 4521, changesRecorded: 4521, squadVersionId: 3, squadVersionNo: 3, archivedPlayers: 18000,
}
const SQUAD_VERSIONS = /\/api\/v1\/squad-versions(\?|$)/
const IMPORT_BASE = /\/api\/v1\/admin\/ingestion\/import-base(\?|$)/
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

async function measure(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const axe = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)
  return { overflow, axe }
}

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
const RESOURCE_LINE = /^Failed to load resource:/
for (const w of [375, 1280]) {
  const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 812 : 900 }, hasTouch: w < 768 })
  const page = await context.newPage()
  let uploaded = false
  await page.route(SQUAD_VERSIONS, (route) => route.fulfill(ok(uploaded ? [{ ...VERSIONS[0], id: 3, versionNo: 3, label: 'Kasım güncellemesi', latest: true }, { ...VERSIONS[0], latest: false }, VERSIONS[1]] : VERSIONS)))
  await page.route(IMPORT_BASE, async (route) => {
    await new Promise((r) => setTimeout(r, 400))
    uploaded = true
    await route.fulfill(ok(RESULT))
  })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !RESOURCE_LINE.test(m.text()) && errors.push(m.text()))
  page.on('response', (r) => r.url().includes('/api/') && r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`))
  await page.goto(`${base}/`)
  await page.evaluate((s) => {
    localStorage.setItem('fc.theme', 'dark')
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
  }, session)

  const states = {}
  await page.goto(`${base}/admin/ut?ui=v3&sekme=kadro`, { waitUntil: 'networkidle' })
  await page.getByRole('list', { name: 'Kadro sürümleri' }).waitFor({ timeout: 10000 })
  states.panel = await measure(page)
  await page.screenshot({ path: file(`kadro-panel-dark-${w}.png`), fullPage: true })

  await page.getByLabel('Log dosyası').setInputFiles({ name: 'base.log', mimeType: 'text/plain', buffer: Buffer.from('LE base export örnek\n'.repeat(200)) })
  await page.getByLabel('Etiket (isteğe bağlı)').fill('Kasım güncellemesi')
  await page.getByRole('button', { name: 'Yükle' }).click()
  await page.getByText('Yeni kadro sürümü açılır; mevcut kariyerler eski sürümde kalır.').waitFor()
  states.confirm = await measure(page)
  await page.screenshot({ path: file(`kadro-onay-dark-${w}.png`), fullPage: true })

  await page.getByRole('button', { name: 'Onayla' }).click()
  await page.getByText('Yükleniyor…').waitFor({ timeout: 5000 })
  await page.screenshot({ path: file(`kadro-yukleniyor-dark-${w}.png`), fullPage: true })
  await page.getByRole('region', { name: 'Yükleme sonucu' }).waitFor({ timeout: 10000 })
  await page.waitForLoadState('networkidle')
  states.result = await measure(page)
  await page.screenshot({ path: file(`kadro-sonuc-dark-${w}.png`), fullPage: true })

  await page.goto(`${base}/career/dashboard?ui=v3`, { waitUntil: 'networkidle' })
  if (w < 820) {
    await page.getByRole('navigation', { name: 'Mobil menü' }).getByRole('button', { name: 'Daha fazla' }).click()
    await page.getByRole('dialog', { name: 'Daha fazla' }).getByRole('link', { name: 'Yönetici' }).waitFor({ timeout: 10000 })
  } else {
    await page.getByRole('navigation', { name: 'Ana menü' }).getByRole('link', { name: 'Yönetici' }).waitFor({ timeout: 10000 })
  }
  states.menu = await measure(page)
  await page.screenshot({ path: file(`menu-yonetici-dark-${w}.png`) })

  results.push({ w, states, errors })
  await context.close()
}
await browser.close()

writeFileSync(file('gates-report.json'), JSON.stringify(results, null, 2))
let failed = false
for (const r of results) {
  for (const [name, s] of Object.entries(r.states)) {
    failed ||= s.overflow > 0 || s.axe.length > 0
    console.log(`${name} dark ${r.w}: taşma ${s.overflow}px · axe ${s.axe.join(',') || 'temiz'}`)
  }
  failed ||= r.errors.length > 0
  console.log(`dark ${r.w}: konsol/ağ hatası ${r.errors.length}${r.errors.length ? ` (${r.errors.slice(0, 2).join(' | ')})` : ''}`)
}
process.exit(failed ? 1 : 0)
