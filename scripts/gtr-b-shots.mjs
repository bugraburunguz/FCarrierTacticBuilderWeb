// GTR-b: Gelişim satırındaki "Son N ayda" ve Admin "Gelişim ölçümü" × 375/1280 × koyu; axe, taşma, konsol ve 4xx/5xx kapıları.
// API yanıtları dosyadan: --training <json> (GET /careers/{id}/training data'sı), --report <json> (backend GrowthTrackIntegrationTest'in yazdığı
// target/gtr-a-report-sample.json). growth-recent satırları training'den sabit kuralla üretilir (gençler +3 / 18 maç, zirve 0 / 30 maç, tecrübeliler −2,
// maç bilinmiyor; kiralıktakiler satırsız). Ağ dışarı çıkmaz: bütün /api/v1 istekleri tarayıcıda karşılanır; hesap açılmaz.
// Kullanım: VITE_UI_V2=off npx vite --port 5174 & sonra node scripts/gtr-b-shots.mjs --base http://localhost:5174 --training <dosya> --report <dosya>
import { AxeBuilder } from '@axe-core/playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const base = arg('--base', 'http://localhost:5174')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const training = JSON.parse(readFileSync(arg('--training'), 'utf8'))
const growthReport = JSON.parse(readFileSync(arg('--report'), 'utf8'))
const outDir = screensDir('GTR-b')
const file = (n) => fileURLToPath(new URL(n, outDir))

const CAREER = { id: 1, name: 'Port Vale', clubName: 'Port Vale', clubId: 1, gameVersionId: 27, season: 1, squadSize: training.length, gameDate: '2027-09-19', spoilerMode: 'SHOW' }
const ME = { id: 1, email: 'kapi@example.test', role: 'ADMIN', subscriptionType: 'FREE', creditBalance: 20, dailyCreditLimit: 20, showAds: false, emailVerified: true, privacyAckVersion: 99 }
const squad = training.filter((p) => !p.loanedOut).map((p) => ({ player: { id: p.playerId, name: p.name, positions: p.positions, overall: p.overall, potential: p.potential, age: p.age }, onLoan: false }))
const RECENT = { YOUTH: [3, 18], PEAK: [0, 30], VETERAN: [-2, null] }
const recent = training.filter((p) => !p.loanedOut).map((p) => ({ playerId: p.playerId, months: 3, overallDelta: RECENT[p.ageGroup][0], matches: RECENT[p.ageGroup][1] }))
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

const routes = [
  [/\/api\/v1\/me$/, () => ok(ME)],
  [/\/api\/v1\/careers$/, () => ok([CAREER])],
  [/\/api\/v1\/careers\/1\/training$/, () => ok(training)],
  [/\/api\/v1\/careers\/1\/growth-recent$/, () => ok(recent)],
  [/\/api\/v1\/careers\/1\/squad$/, () => ok(squad)],
  [/\/api\/v1\/careers\/1\/snapshots$/, () => ok([{ id: 1, takenAt: '2026-10-25T10:00:00Z', source: 'IMPORT', playerCount: training.length }])],
  [/\/api\/v1\/admin\/careers\/1\/growth-report$/, () => ok(growthReport)],
]

const SCREENS = [
  { name: 'gelisim', path: '/career/growth', ready: (page) => page.getByText(/^Son 3 ayda/).first().waitFor({ timeout: 30000 }) },
  {
    name: 'admin-olcum', path: '/admin/ut', ready: async (page) => {
      await page.getByRole('tab', { name: 'Gelişim ölçümü' }).click()
      await page.getByLabel('Kariyer kimliği').fill('1')
      await page.getByLabel('Başlangıç (oyun tarihi)').fill('2026-09-01')
      await page.getByLabel('Bitiş (oyun tarihi)').fill('2027-09-30')
      await page.getByRole('button', { name: 'Raporu getir' }).click()
      await page.getByRole('table', { name: 'Gelişim ölçümü' }).waitFor({ timeout: 30000 })
    },
  },
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const s of SCREENS) {
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
    await page.goto(`${base}${s.path}`, { waitUntil: 'networkidle' })
    await s.ready(page)
    await page.waitForTimeout(800)
    const name = `${s.name}-dark-${w}`
    await page.screenshot({ path: file(`${name}.png`), fullPage: true })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    const axe = await new AxeBuilder({ page }).analyze()
    const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
    report.push({ shot: name, overflow, axe: serious.map((v) => `${v.id}:${v.nodes.length}`), problems: [...problems], stubbed: [...unknown] })
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ report }, null, 2))
report.forEach((r) => console.log(JSON.stringify(r)))
