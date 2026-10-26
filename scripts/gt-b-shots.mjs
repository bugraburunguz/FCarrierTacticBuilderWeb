// GT-b: Kadro › Derinlik (slot bazlı matris) × 375/1280 × koyu; axe, taşma, konsol ve 4xx/5xx kapıları. Görüntüler repo dışında:
// "Claude outputs/screens/GT-b/" (OPS-SCREENS kuralı).
// API yanıtları dosyadan: --squad <json> (Gelişim /training yanıtı: Port Vale A takımı, backend entegrasyon testinden). Ana taktik 4-4-2, diziliş her slota
// mevkiyi listeleyen en yüksek OVR'li oyuncu; formasyonlar backend seed'inden. Ağ dışarı çıkmaz; hesap açılmaz.
// Kullanım: VITE_UI_V2=off npx vite --port 5174 & sonra node scripts/gt-b-shots.mjs --base http://localhost:5174 --squad <dosya>
import { AxeBuilder } from '@axe-core/playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { screensDir, screensRoot } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const base = arg('--base', 'http://localhost:5174')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const rows = JSON.parse(readFileSync(arg('--squad'), 'utf8'))
// Proje kökü "Claude outputs"un üstü: backend seed'i oradan (ana checkout ya da worktree fark etmez).
const projectRoot = dirname(dirname(screensRoot()))
const formations = JSON.parse(readFileSync(join(projectRoot, 'FCarrierTacticBuilderBackend/src/main/resources/seed/formations.json'), 'utf8'))
const outDir = screensDir('GT-b')
const file = (n) => fileURLToPath(new URL(n, outDir))

const formation = formations.find((f) => f.id === '4-4-2') ?? formations[0]
const squad = rows.filter((p) => !p.loanedOut).map((p) => ({ player: { id: p.playerId, name: p.name, positions: p.positions, overall: p.overall, potential: p.potential, age: p.age, valuationEstimated: false }, onLoan: false }))
const used = new Set()
const lineup = {}
for (const s of formation.slots) {
  const pick = squad.filter((c) => c.player.positions.includes(s.position) && !used.has(c.player.id)).sort((a, b) => b.player.overall - a.player.overall)[0]
  if (pick) {
    used.add(pick.player.id)
    lineup[s.slotId] = pick.player.id
  }
}
const MAIN = {
  slot: 1, careerId: 1, name: 'Ana 4-4-2', formation: formation.id, buildUp: 'Balanced', defensiveApproach: null, lineHeight: null, eaCode: 'X', sourceReplicaId: null,
  slots: formation.slots.map((s) => ({ slot: s.slotId, position: s.position, roleId: s.defaultRole, tags: [] })), main: true, lineup, depth: 50, presetId: null,
  updatedAt: '2026-10-26T10:00:00Z', lineupDropped: 0,
}
const byId = new Map(squad.map((c) => [c.player.id, c.player]))
const fitLineup = {
  slots: formation.slots.filter((s) => lineup[s.slotId]).map((s) => ({
    slotId: s.slotId, position: s.position, roleId: s.defaultRole, roleName: s.defaultRole, tags: [], playerId: lineup[s.slotId],
    roleFit: { playerId: lineup[s.slotId], roleId: s.defaultRole, roleName: s.defaultRole, score: byId.get(lineup[s.slotId]).overall, levelFit: 60, fitLabel: 'AT_LEVEL', reasons: [], weaponChecks: [], projectedRating: byId.get(lineup[s.slotId]).overall, outOfPosition: false },
  })),
}
const CAREER = { id: 1, name: 'Port Vale', clubName: 'Port Vale', clubId: 1, gameVersionId: 27, season: 1, squadSize: squad.length, gameDate: '2027-09-19', spoilerMode: 'SHOW' }
const ME = { id: 1, email: 'kapi@example.test', subscriptionType: 'FREE', creditBalance: 20, dailyCreditLimit: 20, showAds: false, emailVerified: true, privacyAckVersion: 99 }
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
const routes = [
  [/\/api\/v1\/me$/, () => ok(ME)],
  [/\/api\/v1\/careers$/, () => ok([CAREER])],
  [/\/api\/v1\/careers\/1\/squad$/, () => ok(squad)],
  [/\/api\/v1\/careers\/1\/academy$/, () => ok({ found: false, players: [] })],
  [/\/api\/v1\/user-tactics\/main$/, () => ok(MAIN)],
  [/\/api\/v1\/fit\/lineup$/, () => ok(fitLineup)],
  [/\/api\/v1\/formations$/, () => ok(formations)],
  [/\/api\/v1\/careers\/1\/snapshots$/, () => ok([{ id: 1, takenAt: '2026-10-25T10:00:00Z', source: 'IMPORT', playerCount: squad.length }])],
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
  await page.goto(`${base}/career/squad?sekme=derinlik`, { waitUntil: 'networkidle' })
  await page.getByRole('list', { name: 'Slot derinliği' }).waitFor({ timeout: 30000 })
  await page.waitForTimeout(800)
  const name = `derinlik-dark-${w}`
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
