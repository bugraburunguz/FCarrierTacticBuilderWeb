// FCA-27 kapıları: kariyer açarken kadro sürümü seçici ve Masa › Ayarlar'daki kadro rozeti (375 + 1280, koyu).
// Sürüm listesi tarayıcıda iki sürümle yanıtlanır (yerel veritabanında yalnız Sürüm 1 olabilir); rozet için kariyer yanıtındaki sürüm "eski" yapılır.
// Hesap ve kariyer yerel backend'den. Ölçüm: taşma, axe serious/critical, konsol hatası, ağ 4xx-5xx.
// Kullanım: node scripts/fca-27-shots.mjs [--base http://localhost:4173]. Yalnız localhost; test hesabı koşu sonunda silinir.
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
const outDir = screensDir('FCA-27')
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
const real = await api('GET', '/squad-versions')
const club = (await (await fetch(`${base}/api/v1/clubs?q=FC&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'FCA-27 kapı', budgetEur: 5_000_000 })
if (!career.squadVersion) {
  throw new Error('kariyer yanıtında squadVersion yok')
}

const first = real[real.length - 1]
const versions = [
  { id: first.id + 1000, versionNo: 2, label: 'Kadro güncellemesi 22.11.2026 (1.0.142)', gameBuild: '1.0.142.20665', exportedAt: '2026-11-22T11:51:11Z', playerCount: 22154, latest: true },
  { ...first, latest: false },
]
const MOCK_VERSIONS = /\/api\/v1\/squad-versions(\?|$)/
const CAREER_RESPONSE = new RegExp(`/api/v1/careers(/${career.id})?(\\?|$)`)
const markOld = (value) => {
  if (Array.isArray(value)) return value.map(markOld)
  if (value && typeof value === 'object' && value.squadVersion) return { ...value, squadVersion: { ...value.squadVersion, latest: false } }
  return value
}

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
const RESOURCE_LINE = /^Failed to load resource:/
async function measure(page, name, w, target) {
  await target.waitFor({ timeout: 10000 })
  await target.scrollIntoViewIfNeeded()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const axe = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)
  await page.screenshot({ path: file(`${name}-dark-${w}.png`) })
  return { overflow, axe }
}
for (const w of [375, 1280]) {
  const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 812 : 900 }, hasTouch: w < 768 })
  const page = await context.newPage()
  await page.route(MOCK_VERSIONS, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: versions }) }))
  await page.route(CAREER_RESPONSE, async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const json = await response.json()
    await route.fulfill({ response, json: { ...json, data: markOld(json.data) } })
  })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !RESOURCE_LINE.test(m.text()) && errors.push(m.text()))
  page.on('response', (r) => r.url().includes('/api/') && r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`))
  await page.goto(`${base}/?ui=v3`)
  await page.evaluate(({ c, s }) => {
    localStorage.setItem('fc.theme', 'dark')
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.career', String(c))
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
  }, { c: career.id, s: session })

  await page.goto(`${base}/career/new`, { waitUntil: 'networkidle' })
  const picker = page.getByLabel('Kadro sürümü')
  const pickerGate = await measure(page, 'surum-secici', w, picker)
  const options = await picker.locator('option').allTextContents()
  const selected = await picker.inputValue()
  results.push({ screen: 'surum-secici', w, ...pickerGate, options, defaultIsLatest: selected === String(versions[0].id), errors: [...errors] })

  errors.length = 0
  await page.goto(`${base}/career/dashboard?sekme=ayarlar`, { waitUntil: 'networkidle' })
  const badge = page.getByText(/^Kadro: .* · eski sürüm$/)
  const badgeGate = await measure(page, 'kadro-rozeti', w, badge)
  results.push({ screen: 'kadro-rozeti', w, ...badgeGate, text: await badge.textContent(), errors: [...errors] })
  await context.close()
}
await browser.close()

writeFileSync(file('gates-report.json'), JSON.stringify(results, null, 2))
for (const r of results) {
  console.log(`${r.screen} dark ${r.w}: taşma ${r.overflow}px · axe ${r.axe.join(',') || 'temiz'} · hata ${r.errors.length}${r.errors.length ? ` (${r.errors.slice(0, 2).join(' | ')})` : ''}${r.options ? ` · seçenekler ${r.options.join(' / ')} · varsayılan en yeni ${r.defaultIsLatest}` : ''}${r.text ? ` · ${r.text}` : ''}`)
}
process.exit(results.some((r) => r.overflow > 0 || r.axe.length > 0 || r.errors.length > 0 || r.defaultIsLatest === false) ? 1 : 0)
