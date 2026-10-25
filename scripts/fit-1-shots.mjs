// FIT-1 ekran kapıları: Masa, Lab (Kurucu: Uyum + Taktik riskleri), Lab › Karşılaştır × 375/1280 × koyu (kök CLAUDE.md, FIT-1 kabulü).
// Test kariyeri API ile: ana taktik (başlangıç önerisinden, derin hat → kurulum riski görünsün). Öneri hattı (kredili) tetiklenmez.
// Kullanım: node scripts/fit-1-shots.mjs [--base http://localhost:5176]. Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir.
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
const outDir = new URL('../docs/review/v2/screens/FIT-1/', import.meta.url)
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
const career = await api('POST', '/careers', { clubId: club.id, name: 'Kapı FIT-1', budgetEur: 5_000_000 })
await api('PATCH', `/careers/${career.id}`, { wageBudgetEur: 40_000, windowEndsOn: '2027-01-31', gameDate: '2027-01-20' })
const starter = await api('GET', `/careers/${career.id}/starter-tactic`)
await api('PUT', '/user-tactics/1', { careerId: career.id, name: 'Önceki taslak', lineup: starter.lineup,
  tactic: { formation: starter.formationId, setup: { ...starter.setup, depth: 85 }, slots: starter.slots.map((s) => ({ slotId: s.slotId, tags: [], roleId: s.roleId })) } })
await api('PUT', `/user-tactics/1/main?careerId=${career.id}`)

const PAGES = [
  { name: 'masa', path: '/career/dashboard', ready: { role: 'heading', name: 'Kariyer Masası' } },
  { name: 'lab', path: '/career/tactics-lab?sekme=kurucu', ready: { role: 'heading', name: /Laboratuvar|Lab/ } },
  { name: 'karsilastir', path: '/career/tactics-lab?sekme=karsilastir', ready: { role: 'heading', name: /Laboratuvar|Lab/ } },
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
    if (p.name === 'lab' && await page.getByText('Henüz taslak yok').count()) {
      await page.getByRole('button', { name: /Yeni taslak/ }).click()
      await page.getByRole('button', { name: "En iyi 11'i diz" }).waitFor({ timeout: 30000 })
    }
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.screenshot({ path: file(`${p.name}-dark-${w}.png`), fullPage: true })
    // FIT-1 metinleri sayfada mı (iki ad, zayıf halka sınıfı, taktik riskleri).
    const texts = await page.evaluate(() => ['Takım gücü', 'Rol oturması', 'Kalite açığı', 'Rol uyumsuz', 'Taktik riskleri', 'taktik riski', 'Öneri:'].filter((t) => document.body.innerText.includes(t)))
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    const axe = await new AxeBuilder({ page }).analyze()
    const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
    report.push({ shot: `${p.name}-dark-${w}`, texts, overflow, axe: serious.map((v) => `${v.id}:${v.nodes.length}`), problems: [...problems] })
    problems.length = 0
  }
  await context.close()
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ career: career.id, report }, null, 2))
report.forEach((r) => console.log(JSON.stringify(r)))
