// Masa menajer satırı: profil yokken "Menajer profilini oluştur → …", varken "Menajer: … · itibar …"; 375/1280 × koyu; axe, taşma, konsol kapıları.
// Görüntüler repo dışında: "Claude outputs/screens/MASA-MANAGER/". API yanıtları tarayıcıda (küçük sabit kariyer); ağ dışarı çıkmaz, hesap açılmaz.
// Kullanım: VITE_UI_V2=off npx vite --port 5174 & sonra node scripts/masa-manager-shots.mjs --base http://localhost:5174
import { AxeBuilder } from '@axe-core/playwright'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:5174'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = screensDir('MASA-MANAGER')
const file = (n) => fileURLToPath(new URL(n, outDir))

const CAREER = { id: 1, name: 'Port Vale', clubName: 'Port Vale', clubId: 1, gameVersionId: 27, season: 1, squadSize: 1, gameDate: '2027-09-19', spoilerMode: 'SHOW' }
const ME = { id: 1, email: 'kapi@example.test', subscriptionType: 'FREE', creditBalance: 20, dailyCreditLimit: 20, showAds: false, emailVerified: true, privacyAckVersion: 99 }
const PROFILE = { profile: { name: 'Buğra', licence: 'NATIONAL_A', background: 'PRO_REGIONAL', style: 'COUNTER', priorities: [], difficulty: 'MEDIUM' }, reputation: 46, band: 'Ulusal tanınırlık' }
const STARTER = { formationId: '4-3-3', setup: { buildUp: 'BALANCED', depth: 50 }, slots: [], lineup: {}, squadFit: 0, alternatives: [] }
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const [state, profile] of [['profil-yok', null], ['profil-var', PROFILE]]) {
  for (const w of [375, 1280]) {
    const context = await browser.newContext({ viewport: { width: w, height: w === 375 ? 812 : 900 } })
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    await page.route('**/api/v1/**', (route) => {
      const path = new URL(route.request().url()).pathname
      return route.fulfill(path.endsWith('/me') ? ok(ME) : path.endsWith('/careers') ? ok([CAREER]) : path.endsWith('/me/manager-profile') ? ok(profile)
        : path.endsWith('/user-tactics/main') ? ok(null) : path.endsWith('/starter-tactic') ? ok(STARTER) : ok([]))
    })
    await page.goto(`${base}/?ui=v3`)
    await page.evaluate(() => {
      localStorage.setItem('fc.theme', 'dark')
      localStorage.setItem('fc.mode', 'career')
      localStorage.setItem('fc.career', '1')
      localStorage.setItem('fc.access', 'kapi-sahte-token')
      localStorage.setItem('fc.refresh', 'kapi-sahte-token')
    })
    await page.goto(`${base}/career/dashboard?ui=v3`, { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: /^Menajer/ }).first().waitFor({ timeout: 30000 })
    await page.waitForTimeout(600)
    const name = `masa-${state}-dark-${w}`
    await page.screenshot({ path: file(`${name}.png`), fullPage: false })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    const axe = await new AxeBuilder({ page }).analyze()
    const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
    report.push({ shot: name, overflow, axe: serious.map((v) => `${v.id}:${v.nodes.length}`), problems: [...problems] })
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ report }, null, 2))
report.forEach((r) => console.log(JSON.stringify(r)))
