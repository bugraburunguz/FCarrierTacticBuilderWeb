// ACADEMY-b ekran kapıları: Kadro › Altyapı (dolu) ve boş durum × 375/1280 × koyu.
// Dolu: Port Vale kariyeri, backend test fixture'ı (le-export/academy-portvale.log) API ile içe aktarılır. Boş: içe aktarmasız Crewe kariyeri.
// Kullanım: backend'i BILLING_STUB_ENABLED=true ile aç, sonra node scripts/academy-shots.mjs [--base http://localhost:8081] [--fixture <log yolu>].
// Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const base = arg('--base', 'http://localhost:8081')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const fixture = arg('--fixture', fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/src/test/resources/le-export/academy-portvale.log', import.meta.url)))
const outDir = new URL('../docs/review/v2/screens/ACADEMY/', import.meta.url)
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  if (res.status >= 300) {
    throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 200)}`)
  }
  return text ? JSON.parse(text).data : undefined
}
const clubId = async (q) => (await (await fetch(`${base}/api/v1/clubs?q=${encodeURIComponent(q)}&limit=1&gender=0`)).json()).data[0].id
// İçe aktarma PREMIUM ister: yerel backend BILLING_STUB_ENABLED=true ile açılmış olmalı (stub sağlayıcı, gerçek ödeme yok).
await api('POST', '/billing/subscribe')
const full = await api('POST', '/careers', { clubId: await clubId('Port Vale'), name: 'Kapı ACADEMY', budgetEur: 5_000_000 })
const form = new FormData()
form.append('log', new Blob([readFileSync(fixture)], { type: 'text/plain' }), 'academy.log')
const imported = await fetch(`${base}/api/v1/careers/${full.id}/import`, { method: 'POST', headers: { authorization: `Bearer ${session.accessToken}` }, body: form })
if (imported.status >= 300) {
  throw new Error(`import → ${imported.status} ${(await imported.text()).slice(0, 200)}`)
}
const empty = await api('POST', '/careers', { clubId: await clubId('Crewe'), name: 'Kapı ACADEMY boş', budgetEur: 5_000_000 })
const academy = await api('GET', `/careers/${full.id}/academy`)
console.log(JSON.stringify({ name: academy.name, players: academy.players.map((p) => ({ name: p.name, best: p.bestPosition, plan: p.plan?.name, promote: p.promote?.text })) }))

const SHOTS = [
  { name: 'altyapi', career: full.id, wait: { role: 'link', name: academy.players[0]?.name ?? 'x' } },
  { name: 'altyapi-bos', career: empty.id, wait: { text: 'Altyapıda oyuncu yok.' } },
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
  for (const s of SHOTS) {
    await page.goto(`${base}/`)
    await page.evaluate(({ t, c }) => {
      localStorage.setItem('fc.theme', 'dark')
      localStorage.setItem('fc.mode', 'career')
      localStorage.setItem('fc.career', String(c))
      localStorage.setItem('fc.access', t.accessToken)
      localStorage.setItem('fc.refresh', t.refreshToken)
    }, { t: session, c: s.career })
    await page.goto(`${base}/career/squad?sekme=altyapi`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: /Altyapı/ }).first().waitFor({ timeout: 30000 })
    await (s.wait.text ? page.getByText(s.wait.text) : page.getByRole(s.wait.role, { name: s.wait.name })).first().waitFor({ timeout: 30000 })
    await page.waitForTimeout(800)
    await page.screenshot({ path: file(`${s.name}-dark-${w}.png`), fullPage: true })
    const tab = await page.getByRole('tab', { name: /Altyapı/ }).first().textContent()
    const hidden = await page.evaluate(() => ['–', 'belirsiz', 'Tier', 'swing'].filter((t) => document.querySelector('[data-academy-table]')?.textContent?.includes(t)))
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    const axe = await new AxeBuilder({ page }).analyze()
    const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
    report.push({ shot: `${s.name}-dark-${w}`, tab, leakedFields: hidden, overflow, axe: serious.map((v) => `${v.id}:${v.nodes.length}`), problems: [...problems] })
    problems.length = 0
  }
  await context.close()
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ career: full.id, empty: empty.id, report }, null, 2))
report.forEach((r) => console.log(JSON.stringify(r)))
