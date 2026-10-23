// Q17 + Q18 Lab kurucusu (KARIYER-UX FAZ 4a): gerçek /career/tactics-lab, Cyber-Pitch, kart ve piyon modu. 29 formasyon × 375/768/1280.
// Her formasyon için taslak (fc.lab.v1, boş diziliş) tarayıcıya yazılır; kurucu ilk açılışta /fit/lineup ile dizer. Kart: measurePitch + q18Problems
// (kesişme, saha dışı, rol etiketi kesilmesi, kart ≥ 48/56px, kart içi yazı ≥ 11px); piyon: measurePawnPitch (kesişme, dokunma ≥ 44px, etiket).
// Kullanım: node scripts/q17-lab.mjs [--formations 4-3-3] [--out dosya.json] [--base http://localhost:8081]. Yalnız localhost; test hesabı koşu sonunda silinir.
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { LONGEST, measurePawnPitch, measurePitch, q18Problems } from './lib/pitchGate.mjs'

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
const authed = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status}`)
  return (await res.json()).data
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = await authed('POST', '/careers', { clubId: club.id, name: 'Q17 Lab' })
await authed('GET', `/players?career=${career.id}&size=1`)
const formations = (await authed('GET', '/formations')).filter((f) => !only || only.includes(f.id))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
for (const formation of formations) {
  session = await login()
  for (const { w, h } of WIDTHS) {
    await pace()
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await context.newPage()
    page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/v1/') && !u.pathname.startsWith('/api/v1/img/')) sent.push(Date.now()) })
    await page.addInitScript(({ s, c, f }) => {
      localStorage.setItem('fc.theme', 'dark')
      localStorage.setItem('fc.mode', 'career')
      localStorage.setItem('fc.career', String(c))
      localStorage.setItem('fc.access', s.accessToken)
      localStorage.setItem('fc.refresh', s.refreshToken)
      if (!localStorage.getItem('fc.lab.v1')) {
        localStorage.setItem('fc.lab.v1', JSON.stringify({ [c]: { activeId: 'q17', drafts: [{ id: 'q17', name: `Q17 ${f}`, origin: { kind: 'blank' }, tactic: { formation: f, slots: {} }, lineup: {}, dirty: true, updatedAt: new Date().toISOString() }] } }))
      }
    }, { s: session, c: career.id, f: formation.id })
    const row = { formation: formation.id, width: w, problems: [] }
    try {
      await page.goto(`${base}/career/tactics-lab`, { waitUntil: 'networkidle' })
      await page.waitForFunction((n) => document.querySelectorAll('[data-slot-group] [data-card-design]').length === n || document.querySelectorAll('[data-slot-group] [role="img"]').length === n, formation.slots.length, { timeout: 25000 })
      await page.waitForTimeout(500)
      const card = q18Problems(await page.evaluate(measurePitch, { formationId: formation.id, expected: formation.slots.length, longest: LONGEST }), w)
      row.card = { cardWidth: card.cardWidth && Math.round(card.cardWidth), minFont: card.minFont && Number(card.minFont.toFixed(1)) }
      row.problems.push(...card.problems.map((p) => `kart: ${p}`))
      await page.reload({ waitUntil: 'networkidle' }) // ölçüm rol etiketlerini uzun adlarla değiştirdi; piyon temiz sayfada ölçülür
      await page.getByRole('radio', { name: 'Piyon' }).click()
      await page.waitForFunction((n) => document.querySelectorAll('[data-pitch-marker="pawn"]').length === n, formation.slots.length, { timeout: 15000 })
      await page.waitForTimeout(300)
      const pawn = await page.evaluate(measurePawnPitch, { formationId: formation.id, expected: formation.slots.length, minTouch: 44 })
      row.pawn = { minTarget: pawn.minTarget && Math.round(pawn.minTarget) }
      row.problems.push(...pawn.problems.map((p) => `piyon: ${p}`))
    } catch (e) {
      row.problems.push(`sayfa yüklenmedi: ${String(e).slice(0, 100)}`)
    }
    results.push(row)
    await context.close()
  }
}
await browser.close()

const bad = results.filter((r) => r.problems.length > 0)
console.log(`${formations.length} formasyon × ${WIDTHS.length} genişlik × kart/piyon = ${results.length * 2} ölçüm; sorunlu satır ${bad.length}`)
console.log(`en küçük kart ${Math.min(...results.map((r) => r.card?.cardWidth ?? Infinity))}px, kart içi yazı ${Math.min(...results.map((r) => r.card?.minFont ?? Infinity))}px, piyon dokunma ${Math.min(...results.map((r) => r.pawn?.minTarget ?? Infinity))}px`)
bad.slice(0, 40).forEach((r) => console.log(` ✗ ${r.formation}/${r.width}: ${r.problems.join('; ')}`))
if (outFile) writeFileSync(outFile, JSON.stringify({ total: results.length, failed: bad.length, results }, null, 1) + '\n')
process.exit(bad.length > 0 ? 1 : 0)
