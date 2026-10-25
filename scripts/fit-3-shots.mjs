// FIT-3 ekran kapıları: Gelişim (plan önerileri), Kadro › Liste (taraf gerekçesi, dönüşüm rozeti), oyuncu › Roller (rol bazlı öneri) × 375/1280 × koyu.
// Test kariyeri API ile (Crewe, başlangıç önerisi ana taktik). Öneri hattı (kredili) tetiklenmez.
// Kullanım: node scripts/fit-3-shots.mjs [--base http://localhost:5176]. Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = new URL('../docs/review/v2/screens/FIT-3/', import.meta.url)
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  if (res.status >= 300) {
    throw new Error(`${method} ${path} → ${res.status}`)
  }
  return text ? JSON.parse(text).data : undefined
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'Kapı FIT-3', budgetEur: 5_000_000 })
await api('PATCH', `/careers/${career.id}`, { wageBudgetEur: 40_000, windowEndsOn: '2027-01-31', gameDate: '2027-01-20' })
const starter = await api('GET', `/careers/${career.id}/starter-tactic`)
await api('PUT', '/user-tactics/1', { careerId: career.id, name: 'Kapı ana taktik', lineup: starter.lineup,
  tactic: { formation: starter.formationId, setup: starter.setup, slots: starter.slots.map((s) => ({ slotId: s.slotId, tags: [], roleId: s.roleId })) } })
await api('PUT', `/user-tactics/1/main?careerId=${career.id}`)
const advice = await api('GET', `/advisor/positions/${career.id}`)
const pick = advice.find((a) => a.conversion) ?? advice.find((a) => a.sideReason) ?? advice[0]
console.log(JSON.stringify({ conversions: advice.filter((a) => a.conversion).map((a) => a.conversion.text), sides: advice.filter((a) => a.sideReason).map((a) => a.sideReason), pick: pick?.playerName }))

const PAGES = [
  { name: 'gelisim', path: '/career/growth', ready: { role: 'heading', name: 'Gelişim' }, wait: { role: 'region', name: 'Gelişim planı önerileri' } },
  { name: 'kadro-liste', path: '/career/squad?sekme=liste', ready: { role: 'heading', name: /Kadro/ } },
  { name: 'oyuncu-roller', path: `/players/${pick.playerId}?sekme=roller`, ready: { role: 'tab', name: 'Roller' } },
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 1280, h: 900 }]) {
  session = await login()
  const context = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 160)}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
  await page.goto(`${base}/`)
  await page.evaluate(({ s, c }) => {
    localStorage.setItem('fc.theme', 'dark')
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.career', String(c))
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
  }, { s: session, c: career.id })
  for (const p of PAGES) {
    await page.goto(`${base}${p.path}`, { waitUntil: 'networkidle' })
    await page.getByRole(p.ready.role, { name: p.ready.name }).first().waitFor({ timeout: 30000 })
    if (p.wait) {
      await page.getByRole(p.wait.role, { name: p.wait.name }).first().waitFor({ timeout: 30000 })
    }
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    await page.screenshot({ path: file(`${p.name}-dark-${w}.png`), fullPage: true })
    const texts = await page.evaluate(() => ['Gelişim planı önerileri', 'tahmin · kalibre edilmedi', 'Dengeli', '2 sezonda', 'Dönüşüm:', 'Rol bazlı mevki önerisi', 'Rol bazlı en iyi', 'Taraf:']
      .filter((t) => document.body.innerText.includes(t)))
    const sideHelp = await page.getByLabel('Taraf gerekçesi').count()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    const axe = await new AxeBuilder({ page }).analyze()
    const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
    report.push({ shot: `${p.name}-dark-${w}`, texts, sideHelp, overflow, axe: serious.map((v) => `${v.id}:${v.nodes.length}`), problems: [...problems] })
    problems.length = 0
  }
  await context.close()
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ career: career.id, pick: pick?.playerName, report }, null, 2))
report.forEach((r) => console.log(JSON.stringify(r)))
