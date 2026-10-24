// KARIYER-UX FAZ 4b istek ölçümü: Lab kurucusu, Masa ve Kadro tam yüklemede kaç API isteği atıyor (uç başına). Rol uyumu toplu çağrıya
// (/fit/lineup, tüm slotlar kilitli) geçmeden önce ve sonra aynı betikle ölçülür. Kullanım: node scripts/fit-requests.mjs [--out dosya.json] [--base http://localhost:8081]
// Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir.
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'

const args = process.argv.slice(2)
const flag = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback)
const base = flag('base', 'http://localhost:8081')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
await createGateAccount(base, 'gate-')
const session = (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status}`)
  return (await res.json()).data
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'Ölçüm', budgetEur: 5_000_000 })
await api('GET', `/players?career=${career.id}&size=1`)
const starter = await api('GET', `/careers/${career.id}/starter-tactic`)
await api('PUT', '/user-tactics/1', { careerId: career.id, name: 'Ana', lineup: starter.lineup,
  tactic: { formation: starter.formationId, setup: starter.setup, slots: starter.slots.map((s) => ({ slotId: s.slotId, tags: [], roleId: s.roleId })) } })
await api('PUT', `/user-tactics/1/main?careerId=${career.id}`)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const result = {}
for (const [label, path, ready] of [['Lab', '/career/tactics-lab', "En iyi 11'i diz"], ['Masa', '/career/dashboard', null], ['Kadro', '/career/squad', null]]) {
  await new Promise((r) => setTimeout(r, 21_000)) // her ölçüm hız sınırından uzak bir dilimde
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  await page.goto(`${base}/`)
  await page.evaluate(({ s, c, lineup, tactic }) => {
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.career', String(c))
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
    localStorage.setItem('fc.lab.v1', JSON.stringify({ [c]: { activeId: 'm', drafts: [{ id: 'm', name: 'Ölçüm', origin: { kind: 'main', ref: '1' }, tactic, lineup, dirty: true, updatedAt: new Date().toISOString() }] } }))
  }, { s: session, c: career.id, lineup: starter.lineup, tactic: { formation: starter.formationId, setup: starter.setup, slots: Object.fromEntries(starter.slots.map((x) => [x.slotId, { tags: [], roleId: x.roleId }])) } })
  const byPath = {}
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.pathname.startsWith('/api/v1/') && !u.pathname.startsWith('/api/v1/img/')) {
      const p = u.pathname.replace(/\/\d+/g, '/:id')
      byPath[p] = (byPath[p] ?? 0) + 1
    }
  })
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
  if (ready) await page.getByRole('button', { name: ready }).waitFor({ timeout: 20000 })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  result[label] = { total: Object.values(byPath).reduce((a, b) => a + b, 0), fitRole: byPath['/api/v1/fit/role'] ?? 0, fitLineup: byPath['/api/v1/fit/lineup'] ?? 0, byPath }
  await context.close()
}
await browser.close()
for (const [k, v] of Object.entries(result)) console.log(`${k}: ${v.total} istek (fit/role ${v.fitRole}, fit/lineup ${v.fitLineup})`)
const out = flag('out', undefined)
if (out) writeFileSync(out, JSON.stringify(result, null, 1) + '\n')
