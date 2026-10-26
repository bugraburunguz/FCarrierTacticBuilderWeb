// GT-a: Gelişim (tüm takım antrenman planı) × 375/1280 × koyu; axe, taşma, konsol ve 4xx/5xx kapıları.
// API yanıtları dosyadan: --training <json> (GET /careers/{id}/training yanıtının data'sı; backend AcademyIntegrationTest'in Port Vale içe aktarmasından).
// Diğer kariyer uçları küçük sabit yanıtlar. Ağ dışarı çıkmaz: bütün /api/v1 istekleri tarayıcıda karşılanır; hesap açılmaz.
// Kullanım: Vite dev sunucusunu aç (VITE_UI_V2=off npx vite --port 5174), sonra node scripts/gt-a-shots.mjs --base http://localhost:5174 --training <dosya>
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const arg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const base = arg('--base', 'http://localhost:5174')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const training = JSON.parse(readFileSync(arg('--training'), 'utf8'))
const outDir = new URL('../docs/review/v2/screens/GT-a/', import.meta.url)
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))

const CAREER = { id: 1, name: 'Port Vale', clubName: 'Port Vale', clubId: 1, gameVersionId: 27, season: 1, squadSize: training.length, gameDate: '2027-09-19', spoilerMode: 'SHOW' }
const ME = { id: 1, email: 'kapi@example.test', subscriptionType: 'FREE', creditBalance: 20, dailyCreditLimit: 20, showAds: false, emailVerified: true, privacyAckVersion: 99 }
const squad = training.filter((p) => !p.loanedOut).map((p) => ({ player: { id: p.playerId, name: p.name, positions: p.positions, overall: p.overall, potential: p.potential, age: p.age }, onLoan: false }))
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
const routes = [
  [/\/api\/v1\/me$/, () => ok(ME)],
  [/\/api\/v1\/careers$/, () => ok([CAREER])],
  [/\/api\/v1\/careers\/1\/training$/, () => ok(training)],
  [/\/api\/v1\/careers\/1\/squad$/, () => ok(squad)],
  [/\/api\/v1\/careers\/1\/snapshots$/, () => ok([{ id: 1, takenAt: '2026-10-25T10:00:00Z', source: 'IMPORT', playerCount: training.length }])],
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const w of [375, 1280]) {
  const context = await browser.newContext({ viewport: { width: w, height: w === 375 ? 812 : 900 } })
  const page = await context.newPage()
  const problems = []
  const unknown = new Set()
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 160)}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
  await page.route('**/api/v1/**', (route) => {
    const url = new URL(route.request().url())
    const hit = routes.find(([re]) => re.test(url.pathname))
    if (!hit) {
      unknown.add(`${route.request().method()} ${url.pathname}`)
    }
    return route.fulfill(hit ? hit[1]() : ok([]))
  })
  await page.goto(`${base}/`)
  await page.evaluate(() => {
    localStorage.setItem('fc.theme', 'dark')
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.career', '1')
    localStorage.setItem('fc.access', 'kapi-sahte-token')
    localStorage.setItem('fc.refresh', 'kapi-sahte-token')
  })
  await page.goto(`${base}/career/growth`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Tecrübeliler' }).waitFor({ timeout: 30000 })
  await page.waitForTimeout(800)
  const name = `gelisim-dark-${w}`
  await page.screenshot({ path: file(`${name}.png`), fullPage: true })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  const axe = await new AxeBuilder({ page }).analyze()
  const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
  report.push({ shot: name, overflow, axe: serious.map((v) => `${v.id}:${v.nodes.length}`), problems: [...problems], stubbed: [...unknown] })
  await context.close()
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ report }, null, 2))
report.forEach((r) => console.log(JSON.stringify(r)))
