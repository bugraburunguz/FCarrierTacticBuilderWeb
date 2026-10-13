// Ekran doğrulama döngüsü (CLAUDE.md "Tasarım araçları", 11 §8): matris ekran görüntüsü + axe + konsol/ağ hataları.
// Kullanım: node scripts/ui-gates.mjs <görev-id> <yol> [--mode ut|career] [--auth] [--matrix full|core] [--base http://localhost:8081]
// Yalnız localhost/127.0.0.1. --auth: yerel test hesabıyla API'den giriş yapar (GATE_EMAIL / GATE_PASSWORD ortam değişkenleri; form doldurulmaz, değer yazdırılmaz).
// E-posta/token içeren öğeler `[data-private]` ile işaretlidir ve görüntüde maskelenir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const [taskId, route] = args
const flag = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback)
if (!taskId || !route) {
  console.error('Kullanım: node scripts/ui-gates.mjs <görev-id> <yol> [--mode ut|career] [--auth] [--matrix full|core]')
  process.exit(2)
}
const base = flag('base', 'http://localhost:8081')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const mode = flag('mode', route.startsWith('/ut') ? 'ut' : 'career')
const auth = args.includes('--auth')
const matrix = flag('matrix', 'full')
const out = new URL(`../docs/review/v2/screens/${taskId}/`, import.meta.url)
mkdirSync(out, { recursive: true })

const widths = matrix === 'core' ? [375, 1280] : [375, 768, 1280]
const themes = matrix === 'core' ? ['dark'] : ['dark', 'light']
const variants = [
  ...widths.flatMap((w) => themes.map((theme) => ({ w, theme, tag: '' }))),
  { w: 1280, theme: 'dark', tag: '-reduced-motion', reducedMotion: 'reduce' },
  { w: 1280, theme: 'dark', tag: '-reduced-transparency', reducedTransparency: true },
]

async function login(request) {
  const email = process.env.GATE_EMAIL
  const password = process.env.GATE_PASSWORD
  if (!email || !password) {
    throw new Error('--auth için GATE_EMAIL ve GATE_PASSWORD ortam değişkenleri gerekli')
  }
  const res = await request.post(`${base}/api/v1/auth/login`, { data: { email, password } })
  const body = await res.json()
  return body.data
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = { taskId, route, mode, matrix, base, shots: [] }
let session
if (auth) {
  const probe = await browser.newContext()
  session = await login(probe.request)
  await probe.close()
}

for (const v of variants) {
  const context = await browser.newContext({ viewport: { width: v.w, height: v.w === 375 ? 812 : 900 }, reducedMotion: v.reducedMotion ?? 'no-preference' })
  await context.addInitScript(
    ({ theme, mode, reducedTransparency, session }) => {
      localStorage.setItem('fc.theme', theme)
      localStorage.setItem('fc.mode', mode)
      if (reducedTransparency) {
        localStorage.setItem('fc.transparency', 'reduced')
      }
      if (session) {
        localStorage.setItem('fc.access', session.accessToken)
        localStorage.setItem('fc.refresh', session.refreshToken)
      }
      document.documentElement.classList.toggle('dark', theme === 'dark')
    },
    { theme: v.theme, mode, reducedTransparency: v.reducedTransparency ?? false, session },
  )
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 200)}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
  const sep = route.includes('?') ? '&' : '?'
  await page.goto(`${base}${route}${sep}ui=v3`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const name = `${mode}-${v.theme}-${v.w}${v.tag}.png`
  await page.screenshot({ path: new URL(name, out).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: false, mask: [page.locator('[data-private]')] })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  const axe = await new AxeBuilder({ page }).analyze()
  const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
  report.shots.push({
    file: name,
    horizontalOverflow: overflow,
    axeSeriousCritical: serious.length,
    axeViolations: axe.violations.map((a) => ({ id: a.id, impact: a.impact, nodes: a.nodes.length, sample: a.nodes[0]?.target })),
    consoleAndNetwork: problems,
  })
  await context.close()
}
await browser.close()

const reportPath = new URL('gates-report.json', out).pathname.replace(/^\/([A-Za-z]:)/, '$1')
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
const bad = report.shots.filter((s) => s.horizontalOverflow || s.axeSeriousCritical > 0 || s.consoleAndNetwork.length > 0)
console.log(`${report.shots.length} görüntü; sorunlu: ${bad.length}`)
for (const s of report.shots) {
  console.log(`${s.file}: taşma=${s.horizontalOverflow} axe(serious/critical)=${s.axeSeriousCritical} konsol/ağ=${s.consoleAndNetwork.length}`)
}
process.exit(bad.length > 0 ? 1 : 0)
