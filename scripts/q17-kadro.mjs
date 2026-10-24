// Q17 piyon (KARIYER-UX FAZ 3; FAZ 1'de ertelenen ölçüm): gerçek Kadro sayfası (/career/squad › Diziliş), salt okunur Cyber-Pitch piyon modu.
// 29 formasyon × 375/768/1280. Her formasyon için yerel test kariyerinde ana taktik kurulur (diziliş /fit/lineup ile doldurulur), sayfa açılır, ölçülür:
// kesişme yok, dokunma alanı ≥ 44px, etiket kesilmesi/taşması yok (scripts/lib/pitchGate.mjs measurePawnPitch).
// Kullanım: node scripts/q17-kadro.mjs [--formations 4-3-3,3-5-2] [--out dosya.json] [--base http://localhost:8081]
// Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir. Hız sınırı (300/dk) aşılmasın diye koşu kendi hızını ayarlar (≤ 240/dk).
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { measurePawnPitch } from './lib/pitchGate.mjs'

const args = process.argv.slice(2)
const flag = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback)
const base = flag('base', 'http://localhost:8081')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const only = flag('formations', undefined)?.split(',')
const outFile = flag('out', undefined)
const WIDTHS = [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]
const MIN_TOUCH = 44

const sent = []
async function pace() {
  for (;;) {
    const now = Date.now()
    while (sent.length && now - sent[0] > 61_000) sent.shift()
    if (sent.length < 240) return
    await new Promise((r) => setTimeout(r, 2_000))
  }
}

await createGateAccount(base, 'q17-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const api = async (method, path, body) => {
  await pace()
  sent.push(Date.now())
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status}`)
  return text ? JSON.parse(text).data : undefined
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'Q17 kadro' })
await api('GET', `/players?career=${career.id}&size=1`)
const formations = (await api('GET', '/formations')).filter((f) => !only || only.includes(f.id))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
let first = true
for (const formation of formations) {
  session = await login()
  const tactic = { formation: formation.id, slots: [], setup: { buildUp: 'Balanced', depth: 50 } }
  const fit = await api('POST', '/fit/lineup', { careerId: career.id, tactic })
  const lineup = Object.fromEntries(fit.slots.filter((s) => s.playerId).map((s) => [s.slotId, s.playerId]))
  await api('PUT', '/user-tactics/1', { careerId: career.id, name: `Q17 ${formation.id}`, tactic, lineup })
  if (first) {
    await api('PUT', `/user-tactics/1/main?careerId=${career.id}`)
    first = false
  }
  for (const { w, h } of WIDTHS) {
    await pace()
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await context.newPage()
    page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/v1/') && !u.pathname.startsWith('/api/v1/img/')) sent.push(Date.now()) })
    await page.addInitScript(({ s, c }) => {
      localStorage.setItem('fc.theme', 'dark')
      localStorage.setItem('fc.mode', 'career')
      localStorage.setItem('fc.career', String(c))
      localStorage.setItem('fc.access', s.accessToken)
      localStorage.setItem('fc.refresh', s.refreshToken)
    }, { s: session, c: career.id })
    let report
    try {
      await page.goto(`${base}/career/squad`, { waitUntil: 'networkidle' })
      await page.waitForFunction((n) => document.querySelectorAll('[data-pitch-marker="pawn"]').length === n, formation.slots.length, { timeout: 20000 })
      await page.waitForTimeout(300)
      report = await page.evaluate(measurePawnPitch, { formationId: formation.id, expected: formation.slots.length, minTouch: MIN_TOUCH })
    } catch (e) {
      report = { formationId: formation.id, problems: [`sayfa yüklenmedi: ${String(e).slice(0, 80)}`] }
    }
    results.push({ formation: formation.id, width: w, fieldWidth: report.fieldWidth && Math.round(report.fieldWidth), minTarget: report.minTarget && Math.round(report.minTarget), problems: report.problems })
    await context.close()
  }
}
await browser.close()

const bad = results.filter((r) => r.problems.length > 0)
console.log(`${formations.length} formasyon × ${WIDTHS.length} genişlik = ${results.length}; sorunlu ${bad.length}; en küçük dokunma alanı ${Math.min(...results.map((r) => r.minTarget ?? Infinity))}px`)
bad.slice(0, 40).forEach((r) => console.log(` ✗ ${r.formation}/${r.width}: ${r.problems.join('; ')}`))
if (outFile) writeFileSync(outFile, JSON.stringify({ total: results.length, failed: bad.length, results }, null, 1) + '\n')
process.exit(bad.length > 0 ? 1 : 0)
