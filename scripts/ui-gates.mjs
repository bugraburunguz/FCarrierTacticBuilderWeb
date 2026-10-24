// Ekran doğrulama döngüsü (CLAUDE.md "Tasarım araçları", 11 §8): matris ekran görüntüsü + axe + konsol/ağ hataları.
// Kullanım: node scripts/ui-gates.mjs <görev-id> <yol> [--mode ut|career] [--auth] [--matrix full|core] [--base http://localhost:8081]
// Yalnız localhost/127.0.0.1. --auth: yerel test hesabıyla API'den giriş yapar (GATE_EMAIL / GATE_PASSWORD ortam değişkenleri; form doldurulmaz, değer yazdırılmaz).
// E-posta/token içeren öğeler `[data-private]` ile işaretlidir ve görüntüde maskelenir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'

const args = process.argv.slice(2)
const [taskId, rawRoute] = args
// Git Bash '/yol' argümanını Windows yoluna çevirir: baştaki '/' olmadan da verilebilir (örn. ut/squad)
const route = rawRoute ? (rawRoute.startsWith('/') ? rawRoute : `/${rawRoute}`) : rawRoute
const flag = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback)
if (!taskId || !route || /^[A-Za-z]:/.test(route.slice(1))) {
  console.error('Kullanım: node scripts/ui-gates.mjs <görev-id> <yol> [--mode ut|career] [--auth] [--matrix full|core]')
  process.exit(2)
}
const base = flag('base', 'http://localhost:8081')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
if (args.includes('--auto-account')) {
  await createGateAccount(base, 'gate-') // koşu sonunda yerel DB'den silinir (scripts/teardown-gate-accounts.sql)
}
const mode = flag('mode', route.startsWith('/ut') ? 'ut' : 'career')
const auth = args.includes('--auth') || args.includes('--auto-account')
const matrix = flag('matrix', 'full')
// --formation <id>: UT örnek kadrosu ve kariyer taktiği bu formasyonla başlar (örn. 3-5-2).
// --career <id>: kariyer modunda aktif kariyer (fc.career) bu id ile başlar (örn. replika "Kadroma uyanlar").
// Ek durum: sayfa yüklendikten sonra --click <css seçici> ile tıklanır ve dosya adına --tag eklenir
const clickSelector = flag('click', undefined)
const stateTag = flag('tag', clickSelector ? 'state' : '')
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

// --squad-sample (gerçek katalog yanıtından, yüz değerleri dahil): UT kadro kurucu için API'deki en iyi katalog oyuncularından dolu bir 4-2-3-1 (2) kadro tohumlar (yalnız localStorage).
let squadSample
if (args.includes('--squad-sample')) {
  const formations = (await (await fetch(`${base}/api/v1/formations`)).json()).data
  const formation = formations.find((f) => f.id === flag('formation', '4-2-3-1 (2)')) ?? formations[0]
  const used = new Set()
  const picked = {}
  for (const slot of formation.slots) {
    const res = await (await fetch(`${base}/api/v1/players?pos=${slot.position}&sort=overall&order=desc&size=12&gender=0`)).json()
    const p = res.data.items.find((i) => !used.has(i.id))
    used.add(p.id)
    picked[slot.slotId] = { key: `p:${p.id}`, source: 'catalog', name: p.name, rating: p.overall, positions: p.positions, club: p.club, league: p.league, nationality: p.nationality, playerId: p.id, faceUrl: p.faceUrl, faceStats: p.faceStats, faceLabels: p.faceLabels, faceStatsSource: p.faceStatsSource, faceStatsApproximate: p.faceStatsApproximate }
  }
  squadSample = { formationId: formation.id, setup: { buildUp: 'Balanced', depth: 55 }, picked, roleOverride: {}, origin: 'manual' }
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
  await new Promise((r) => setTimeout(r, 2500)) // anonim istek hız sınırına (429) takılmamak için
  const context = await browser.newContext({ viewport: { width: v.w, height: v.w === 375 ? 812 : 900 }, reducedMotion: v.reducedMotion ?? 'no-preference' })
  await context.addInitScript(
    ({ theme, mode, reducedTransparency, session, squadSample, careerFormation, careerId }) => {
      localStorage.setItem('fc.theme', theme)
      localStorage.setItem('fc.mode', mode)
      if (careerId) {
        localStorage.setItem('fc.career', careerId)
      }
      if (reducedTransparency) {
        localStorage.setItem('fc.transparency', 'reduced')
      }
      if (session) {
        localStorage.setItem('fc.access', session.accessToken)
        localStorage.setItem('fc.refresh', session.refreshToken)
      }
      if (squadSample) {
        localStorage.setItem('fc.utSquad', JSON.stringify(squadSample))
      }
      if (careerFormation) {
        localStorage.setItem('fc.tactic', JSON.stringify({ formation: careerFormation, slots: {} }))
      }
      document.documentElement.classList.toggle('dark', theme === 'dark')
    },
    { theme: v.theme, mode, reducedTransparency: v.reducedTransparency ?? false, session, squadSample, careerFormation: mode === 'career' ? flag('formation', undefined) : undefined, careerId: mode === 'career' ? flag('career', undefined) : undefined },
  )
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 200)}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
  const sep = route.includes('?') ? '&' : '?'
  await page.goto(`${base}${route}${sep}ui=v3`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  if (clickSelector) {
    await page.locator(clickSelector).first().click()
    await page.waitForTimeout(500)
  }
  const name = `${mode}-${v.theme}-${v.w}${v.tag}${stateTag ? `-${stateTag}` : ''}.png`
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

const reportPath = fileURLToPath(new URL(`gates-report-${mode}${stateTag ? `-${stateTag}` : ''}.json`, out))
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
const bad = report.shots.filter((s) => s.horizontalOverflow || s.axeSeriousCritical > 0 || s.consoleAndNetwork.length > 0)
console.log(`${report.shots.length} görüntü; sorunlu: ${bad.length}`)
for (const s of report.shots) {
  console.log(`${s.file}: taşma=${s.horizontalOverflow} axe(serious/critical)=${s.axeSeriousCritical} konsol/ağ=${s.consoleAndNetwork.length}`)
}
process.exit(bad.length > 0 ? 1 : 0)
