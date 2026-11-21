// FCA-30 kapıları: Replikalar listesinde "Benim stilim" sekmesi ve "Tümü"ndeki ilk grup, 375 ve 1280 px, yalnız koyu.
// Backend gerekmez: /api/v1/replicas yanıtı backend worktree seed'inden üretilir (kod alanı "ÖRNEK" yer tutucusu); diğer /api istekleri boş yanıt alır.
// Ölçüm: yatay taşma, axe serious/critical, konsol hatası.
// Kullanım: npx vite preview --port 4173 & node scripts/fca-30-shots.mjs [--base http://localhost:4173] [--seed <replicas.fc27.json>] [--formations <formations.json>]
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d)
const base = arg('--base', 'http://localhost:4173')
const seedPath = arg('--seed', '../fca-30-backend/src/main/resources/seed/replicas.fc27.json')
const formationsPath = arg('--formations', '../fca-30-backend/src/main/resources/seed/formations.json')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const formationId = new Map(JSON.parse(readFileSync(formationsPath, 'utf8')).map((f) => [f.eaLabel, f.id]))
const toSlot = (s) => ({ slotId: s.slot, position: s.position, role: s.role, focus: s.focus, roleId: `${s.role}_${s.focus}`.toLowerCase().replace(/[^a-z0-9]+/g, '_') })
const summaries = JSON.parse(readFileSync(seedPath, 'utf8')).map((r) => ({
  id: r.id, category: r.category, variant: r.variant ?? null, club: r.club, coach: r.coach, season: r.season, league: r.league,
  formationId: formationId.get(r.fc27.formation), eaFormation: r.fc27.formation, buildUp: r.fc27.buildUp, defensiveApproach: r.fc27.defensiveApproach,
  lineHeight: r.fc27.lineHeight, fidelity: r.replicaFidelity?.score ?? null, tacticCode: 'ÖRNEK', slots: r.fc27.slots.map(toSlot), eaOrderedSlots: r.fc27.slots.map(toSlot),
  attentionCount: 0, verified: (r.verify ?? []).length === 0,
}))
const outDir = screensDir('FCA-30')
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
for (const w of [375, 1280]) {
  const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 812 : 900 }, hasTouch: w < 768 })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !/^Failed to load resource:/.test(m.text()) && errors.push(m.text()))
  await page.route('**/api/**', (route) => {
    const url = route.request().url()
    const data = /\/api\/v1\/replicas(\?|$)/.test(url) ? summaries : url.includes('/formations') ? [] : null
    return route.fulfill({ status: 200, json: { success: true, data } })
  })
  await page.goto(`${base}/`)
  await page.evaluate(() => localStorage.setItem('fc.theme', 'dark'))
  for (const [name, path] of [[`replikalar-tumu-${w}-koyu.png`, '/replicas'], [`replikalar-benim-stilim-${w}-koyu.png`, '/replicas?lig=benim-stilim']]) {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
    await page.getByText('Buğra FC').first().waitFor({ timeout: 10000 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: file(name), fullPage: path.includes('lig=') })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    const axe = await new AxeBuilder({ page }).include('main').analyze()
    const serious = axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id} (${v.nodes.length})`)
    results.push({ width: w, shot: name, overflow, axe: serious, errors: [...errors] })
  }
  await context.close()
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
