// GROWTH-CAL: önce/sonra ölçümü (Masa'nın 3 işi, Altyapı'daki "Hazır" sayısı, Gelişim'de Dengeli önerilen sayısı) ve ekran kapıları
// (Altyapı, Gelişim, Masa × 375/1280 × koyu). Port Vale kariyeri; backend test fixture'ı (le-export/academy-portvale.log) API ile içe aktarılır.
// Kullanım: backend'i BILLING_STUB_ENABLED=true ile aç (içe aktarma PREMIUM ister; stub sağlayıcı, gerçek ödeme yok), sonra
// node scripts/growth-cal-shots.mjs [--base http://localhost:8081] [--measure-only] [--label once|sonra]. Yalnız localhost/127.0.0.1; test hesabı silinir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const base = arg('--base', 'http://localhost:8081')
const measureOnly = args.includes('--measure-only')
const label = arg('--label', 'sonra')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const fixture = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/src/test/resources/le-export/academy-portvale.log', import.meta.url))
const outDir = screensDir('GROWTH-CAL')
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
await api('POST', '/billing/subscribe')
const club = (await (await fetch(`${base}/api/v1/clubs?q=Port%20Vale&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'Kapı GROWTH-CAL', budgetEur: 5_000_000 })
const form = new FormData()
form.append('log', new Blob([readFileSync(fixture)], { type: 'text/plain' }), 'academy.log')
const imported = await fetch(`${base}/api/v1/careers/${career.id}/import`, { method: 'POST', headers: { authorization: `Bearer ${session.accessToken}` }, body: form })
if (imported.status >= 300) {
  throw new Error(`import → ${imported.status}`)
}

const academy = await api('GET', `/careers/${career.id}/academy`)
const youth = await api('GET', `/careers/${career.id}/youth`)
const measure = {
  label,
  ready: academy.players.filter((p) => p.status === 'READY').map((p) => `${p.name} (${p.age}, ${p.bestPosition}): ${p.promote?.text ?? ''}`),
  academy: academy.players.map((p) => `${p.name} ${p.age} ${p.status} ${p.plan?.label ?? '-'}${p.promoteInfo ? ` · ${p.promoteInfo.text}` : ''}`),
  balanced: youth.filter((p) => p.plan?.balanced).length,
  youth: youth.length,
  youthPlans: youth.map((p) => `${p.name} ${p.bestPosition}: ${p.plan?.label ?? '-'}${p.plan?.balanced ? ` — ${p.plan.text.split(' · ').slice(1).join(' · ')}` : ''}`),
}

// Dengeli "net mevkisi yok" gerekçeli gençlerin seçenekleri (hangi mevki grubuyla yarışıyor).
const recs = await api('POST', `/careers/${career.id}/development/recommendations`, { weakSlots: [] })
measure.noClearTarget = recs.filter((r) => r.reason === 'NO_CLEAR_TARGET')
  .map((r) => `${r.playerName}: ${r.options.map((o) => `${o.position} ${o.roleName} ${o.strength2}`).join(' | ')}`)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const w of measureOnly ? [1280] : [375, 1280]) {
  session = await login()
  const context = await browser.newContext({ viewport: { width: w, height: w === 375 ? 812 : 900 } })
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 160)}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
  await page.goto(`${base}/`)
  await page.evaluate(({ t, c }) => {
    localStorage.setItem('fc.theme', 'dark')
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.career', String(c))
    localStorage.setItem('fc.access', t.accessToken)
    localStorage.setItem('fc.refresh', t.refreshToken)
  }, { t: session, c: career.id })
  const SHOTS = [
    { name: 'masa', path: '/career/dashboard', wait: { text: 'Bu dönemin 3 işi' } },
    { name: 'altyapi', path: '/career/academy', wait: { role: 'list', name: 'Oyuncular' } },
    { name: 'gelisim', path: '/career/growth', wait: { role: 'list', name: 'Gelişim planları' } },
  ]
  for (const s of SHOTS) {
    await page.goto(`${base}${s.path}`, { waitUntil: 'networkidle' })
    await (s.wait.text ? page.getByText(s.wait.text) : page.getByRole(s.wait.role, { name: s.wait.name })).first().waitFor({ timeout: 30000 })
    await page.waitForTimeout(1200)
    if (s.name === 'masa' && w === 1280) {
      measure.masa = await page.evaluate(() => {
        const heading = [...document.querySelectorAll('h2,h3')].find((h) => h.textContent?.includes('Bu dönemin 3 işi'))
        const root = heading?.closest('section,div')
        return [...(root?.querySelectorAll('ol > li b') ?? [])].map((b) => b.textContent)
      })
    }
    if (measureOnly) {
      continue
    }
    await page.screenshot({ path: file(`${s.name}-dark-${w}.png`), fullPage: true })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    const axe = await new AxeBuilder({ page }).analyze()
    const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
    report.push({ shot: `${s.name}-dark-${w}`, overflow, axe: serious.map((v) => `${v.id}:${v.nodes.length}`), problems: [...problems] })
    problems.length = 0
  }
  await context.close()
}
await browser.close()
writeFileSync(file(`olcum-${label}.json`), JSON.stringify(measure, null, 2))
console.log(JSON.stringify(measure, null, 2))
if (!measureOnly) {
  writeFileSync(file('gates-report.json'), JSON.stringify({ career: career.id, report }, null, 2))
  report.forEach((r) => console.log(JSON.stringify(r)))
}
