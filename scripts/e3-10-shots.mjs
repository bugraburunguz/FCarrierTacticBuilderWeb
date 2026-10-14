// E3-10 ekran kapıları: kadro sahasında slota tıkla → "Öneriler" sekmesi → önerileri getir; Transfer Merkezi.
// Kullanım: node scripts/e3-10-shots.mjs [--base http://localhost:8081] (yerel test hesabı kurar, koşu sonunda siler)
// Çıktı: docs/review/v2/screens/E3-10/*.png ve gates-report.json (axe serious/critical, taşma, konsol/ağ hataları, kontrast).
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
const out = new URL('../docs/review/v2/screens/E3-10/', import.meta.url)
mkdirSync(out, { recursive: true })
const file = (name) => fileURLToPath(new URL(name, out))

await createGateAccount(base, 'gate-')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const probe = await browser.newContext()
const login = await probe.request.post(`${base}/api/v1/auth/login`, { data: { email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD } })
const session = (await login.json()).data
// Ücretsiz üye: onay adımı da görünsün diye abonelik YOK; kredi bakiyesi günlük 20.
await probe.close()

const report = { shots: [] }
const SIZES = [
  { w: 375, h: 812 },
  { w: 1280, h: 900 },
]
const THEMES = ['dark', 'light']

async function setup(w, h, theme) {
  const context = await browser.newContext({ viewport: { width: w, height: h } })
  await context.addInitScript(
    ({ theme, session }) => {
      localStorage.setItem('fc.theme', theme)
      localStorage.setItem('fc.mode', 'career')
      localStorage.setItem('fc.access', session.accessToken)
      localStorage.setItem('fc.refresh', session.refreshToken)
      document.documentElement.classList.toggle('dark', theme === 'dark')
    },
    { theme, session },
  )
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 200)}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
  return { context, page, problems }
}

async function record(page, problems, name) {
  await page.screenshot({ path: file(name), mask: [page.locator('[data-private]')] })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  const axe = await new AxeBuilder({ page }).analyze()
  const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
  report.shots.push({
    file: name,
    horizontalOverflow: overflow,
    axeSeriousCritical: serious.length,
    axeViolations: axe.violations.map((a) => ({ id: a.id, impact: a.impact, nodes: a.nodes.length, sample: a.nodes[0]?.target })),
    consoleAndNetwork: [...problems],
  })
  problems.length = 0
}

for (const { w, h } of SIZES) {
  for (const theme of THEMES) {
    // 1) Kadro sahası: slot → Öneriler sekmesi → onay → sonuç
    {
      const { context, page, problems } = await setup(w, h, theme)
      await page.goto(`${base}/squad/builder?ui=v3`, { waitUntil: 'networkidle' })
      await page.locator('[data-pitch-slot="ST"]').first().click()
      await page.getByRole('radio', { name: 'Öneriler' }).click()
      await page.waitForTimeout(300)
      await record(page, problems, `slot-oneriler-bos-${theme}-${w}.png`)
      await page.getByRole('button', { name: /Önerileri getir/ }).click()
      await page.getByRole('alertdialog').waitFor()
      await record(page, problems, `slot-oneriler-onay-${theme}-${w}.png`)
      await page.getByRole('checkbox', { name: 'Hayal transferlerini göster' }).check()
      await page.getByRole('button', { name: /Onayla/ }).click()
      await page.getByRole('region', { name: 'Öneriler' }).waitFor({ timeout: 60000 })
      await page.waitForTimeout(500)
      await record(page, problems, `slot-oneriler-sonuc-${theme}-${w}.png`)
      await context.close()
    }
    // 2) Transfer Merkezi
    {
      const { context, page, problems } = await setup(w, h, theme)
      await page.goto(`${base}/career/transfer?ui=v3`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      await record(page, problems, `transfer-${theme}-${w}.png`)
      await context.close()
    }
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(report, null, 2) + '\n')
const bad = report.shots.filter((s) => s.horizontalOverflow || s.axeSeriousCritical > 0 || s.consoleAndNetwork.length > 0)
console.log(`${report.shots.length} görüntü; sorunlu: ${bad.length}`)
for (const s of report.shots) {
  console.log(`${s.file}: taşma=${s.horizontalOverflow} axe(serious/critical)=${s.axeSeriousCritical} konsol/ağ=${s.consoleAndNetwork.length}`)
}
process.exit(bad.length > 0 ? 1 : 0)
