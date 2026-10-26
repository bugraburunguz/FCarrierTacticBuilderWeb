// FIT-2 ekran kapıları: Lab rol seçici (oyuncuya göre) + "Daha uygun rol" + Taktik riskleri, Masa ROL_UYUMSUZ kartı × 375/1280 × koyu (FIT-2 kabulü).
// Test kariyeri API ile: ana taktik başlangıç önerisinden; en güçlü oyunculardan birine bilerek oturmayan rol (ROL_UYUMSUZ görünsün),
// bekler Attacking Wingback (Attack) (kontra riski kuralı tetiklenebilsin). Öneri hattı (kredili) tetiklenmez.
// Kullanım: node scripts/fit-2-shots.mjs [--base http://localhost:5176]. Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = screensDir('FIT-2')
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
const career = await api('POST', '/careers', { clubId: club.id, name: 'Kapı FIT-2', budgetEur: 5_000_000 })
await api('PATCH', `/careers/${career.id}`, { wageBudgetEur: 40_000, windowEndsOn: '2027-01-31', gameDate: '2027-01-20' })
const starter = await api('GET', `/careers/${career.id}/starter-tactic`)
const roles = Object.fromEntries(starter.slots.map((s) => [s.slotId, s.roleId]))
const tacticOf = () => ({ formation: starter.formationId, setup: { ...starter.setup, depth: 55 }, slots: Object.entries(roles).map(([slotId, roleId]) => ({ slotId, tags: [], roleId })) })
// Bekler bindirsin (kontra riski: ≥2 bindiren bek + yavaş stoper + tek pivot).
starter.slots.filter((s) => s.position === 'LB' || s.position === 'RB').forEach((s) => { roles[s.slotId] = 'attacking_wingback_attack' })
// Rol uyumsuzu: Güç'ü yüksek kalan ama Rol oturması < 40 olan bir alternatif (en yüksek Güç'lü olan).
const probe = await api('POST', '/fit/lineup', { careerId: career.id, tactic: tacticOf(), locked: starter.lineup, roleAlternatives: true })
const misfit = probe.slots.flatMap((s) => (s.roleAlternatives ?? []).filter((a) => a.levelFit !== null && a.levelFit !== undefined && a.levelFit < 35 && !['LB', 'RB', 'GK'].includes(s.position))
  .map((a) => ({ slotId: s.slotId, roleId: a.roleId, roleName: a.roleName, strength: a.currentFit })))
  .sort((a, b) => b.strength - a.strength)[0]
if (misfit) {
  roles[misfit.slotId] = misfit.roleId
}
await api('PUT', '/user-tactics/1', { careerId: career.id, name: 'Kapı ana taktik', lineup: starter.lineup, tactic: tacticOf() })
await api('PUT', `/user-tactics/1/main?careerId=${career.id}`)
const check = await api('POST', '/fit/lineup', { careerId: career.id, tactic: tacticOf(), locked: starter.lineup, roleAlternatives: true })
const misfitSlot = check.slots.find((s) => s.slotId === misfit?.slotId)
console.log(JSON.stringify({ misfit, weakClass: misfitSlot?.weakClass, betterRole: misfitSlot?.betterRole, classes: check.slots.map((s) => `${s.slotId}:${s.weakClass}`) }))

const PAGES = [
  { name: 'masa', path: '/career/dashboard', ready: { role: 'heading', name: 'Kariyer Masası' } },
  { name: 'lab', path: '/career/tactics-lab?sekme=kurucu', ready: { role: 'heading', name: /Laboratuvar|Lab/ } },
  { name: 'lab-rol-secici', path: '/career/tactics-lab?sekme=kurucu', ready: { role: 'heading', name: /Laboratuvar|Lab/ }, rolePicker: true },
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
    if (p.name.startsWith('lab') && await page.getByText('Henüz taslak yok').count()) {
      await page.getByRole('button', { name: /Yeni taslak/ }).click()
      await page.getByRole('button', { name: "En iyi 11'i diz" }).waitFor({ timeout: 30000 })
    }
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    let roleChange
    if (p.name === 'masa') {
      roleChange = await page.getByRole('link', { name: /Rolü değiştir/ }).first().getAttribute('href').catch(() => null)
    }
    if (p.rolePicker && misfitSlot) {
      // Saha rol etiketi "Temel · Odak" (useCareerSquadBuilder); sunucu adı "Temel (Odak)".
      await page.getByRole('button', { name: misfitSlot.roleName.replace(/\s*\((.*)\)$/, ' · $1'), exact: true }).first().click()
      await page.getByRole('radiogroup', { name: 'Rol' }).waitFor({ timeout: 10000 })
      await page.waitForTimeout(300)
    }
    await page.screenshot({ path: file(`${p.name}-dark-${w}.png`), fullPage: !p.rolePicker })
    const texts = await page.evaluate(() => ['Kalite açığı', 'Rol uyumsuz', 'Daha uygun rol', 'Rolü değiştir', 'Taktik riskleri', 'Kontra riski yüksek', 'Yaratıcılık yetersiz', 'Santrfor yalnız', 'Rol oturması %', 'Öneri:']
      .filter((t) => document.body.innerText.includes(t)))
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    const axe = await new AxeBuilder({ page }).analyze()
    const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
    report.push({ shot: `${p.name}-dark-${w}`, texts, roleChange, overflow, axe: serious.map((v) => `${v.id}:${v.nodes.length}`), problems: [...problems] })
    problems.length = 0
  }
  await context.close()
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ career: career.id, misfit, report }, null, 2))
report.forEach((r) => console.log(JSON.stringify(r)))
