// KARIYER-UX 6 ekran kapıları (üretim derlemesi): Masa (zayıf halka + sözleşme), Kadro › Derinlik (matris + yaş bantları), Lab › Karşılaştır
// (rol farkı), oyuncu sayfası › Statlar (profil radarı), Oyuncular (PlayStyle süzgeci), Replikalar (kariyer modunda "Klonla → taslak").
// 6 sayfa × 375/768/1280 × koyu/açık = 36 çekim. Fikstür (yalnız bu tarayıcıda, LE içe aktarması gerektirdiği için): kadroda sözleşme bitişi oyun tarihinden 8 ay sonra.
// Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, minFont ≥ 11px + sayfaya özgü öğe sayısı. Kullanım: node scripts/kariyer-ux-6-shots.mjs [--base http://localhost:8081]
// Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir; ≤ 240 istek/dk (hız sınırı 300, OPS-02).
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { pageMinFont } from './lib/readability.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = new URL('../docs/review/v2/screens/KARIYER-UX-6/', import.meta.url)
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))
const MIN_FONT = 11
const GAME_DATE = '2027-01-20'
const CONTRACT_UNTIL = '2027-09-25'

const sent = []
const isApi = (url) => { const u = new URL(url); return u.pathname.startsWith('/api/v1/') && !u.pathname.startsWith('/api/v1/img/') }
async function pace() {
  for (;;) {
    const now = Date.now()
    while (sent.length && now - sent[0] > 61_000) sent.shift()
    if (sent.length < 240) return
    await new Promise((r) => setTimeout(r, 2_000))
  }
}

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status}`)
  const text = await res.text()
  return text ? JSON.parse(text).data : undefined
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'Kapı · KARIYER-UX 6', budgetEur: 5_000_000 })
await api('PATCH', `/careers/${career.id}`, { wageBudgetEur: 40_000, windowEndsOn: '2027-01-31', gameDate: GAME_DATE })
await api('GET', `/players?career=${career.id}&size=1`)
const starter = await api('GET', `/careers/${career.id}/starter-tactic`)
const squad = await api('GET', `/careers/${career.id}/squad`)
const roles = await api('GET', '/roles')
const tactic = { formation: starter.formationId, setup: starter.setup, slots: Object.fromEntries(starter.slots.map((s) => [s.slotId, { tags: [], roleId: s.roleId }])) }
await api('PUT', '/user-tactics/1', { careerId: career.id, name: `Ana ${starter.formationId}`, lineup: starter.lineup,
  tactic: { formation: starter.formationId, setup: starter.setup, slots: starter.slots.map((s) => ({ slotId: s.slotId, tags: [], roleId: s.roleId })) } })
await api('PUT', `/user-tactics/1/main?careerId=${career.id}`)
// Taslak: bir saha slotunda yedek oyuncu ve başka bir rol (Karşılaştır'da oyuncu, uyum ve rol farkı görünsün).
const swap = starter.slots.find((s) => s.position !== 'GK')
const otherRole = roles.find((r) => r.positions.includes(swap.position) && r.id !== swap.roleId)
const bench = squad.map((c) => c.player.id).find((id) => !Object.values(starter.lineup).includes(id))
const variantTactic = { ...tactic, slots: { ...tactic.slots, [swap.slotId]: { tags: [], roleId: otherRole.id } } }
const now = new Date().toISOString()
const lab = { [career.id]: { activeId: 'b', drafts: [
  { id: 'b', name: 'Deneme · rol ve yedek', origin: { kind: 'main', ref: '1' }, tactic: variantTactic, lineup: { ...starter.lineup, [swap.slotId]: bench }, dirty: true, updatedAt: now },
] } }
const playerId = Object.values(starter.lineup)[1]
const pool = await api('GET', `/players?career=${career.id}&size=1&ps_plus=FirstTouch`)
const psQuery = pool.totalItems > 0 ? 'psp=FirstTouch' : 'ps=FirstTouch'

const PAGES = [
  { name: 'masa', path: '/career/dashboard', ready: (p) => p.getByRole('region', { name: 'Zayıf halkalar' }).waitFor({ timeout: 30000 }), count: (p) => p.getByText(/Sözleşmesi \d+ ay içinde bitiyor/).count() },
  { name: 'kadro-derinlik', path: '/career/squad?sekme=derinlik', ready: (p) => p.getByRole('list', { name: 'Yaş bantları' }).waitFor({ timeout: 30000 }), count: (p) => p.getByText(/Yalnız genç yedek|Yedek yok|eksik|Yeterli/).count() },
  { name: 'lab-karsilastir', path: '/career/tactics-lab?sekme=karsilastir', ready: (p) => p.getByRole('listitem').filter({ hasText: /Rol: / }).first().waitFor({ timeout: 30000 }), count: (p) => p.getByText(/Rol: .+ → /).count() },
  { name: 'oyuncu-statlar', path: `/players/${playerId}`, ready: (p) => p.getByRole('img', { name: /Profil radarı/ }).waitFor({ timeout: 30000 }), count: (p) => p.getByRole('img', { name: /Profil radarı/ }).count() },
  { name: 'oyuncular-playstyle', path: `/players?${psQuery}`, ready: (p) => p.getByRole('status').filter({ hasText: /oyuncu · \d+ gösteriliyor|oyuncu/ }).first().waitFor({ timeout: 30000 }), count: async () => 1 },
  { name: 'replikalar-klon', path: '/replicas', ready: (p) => p.getByRole('button', { name: /Klonla → taslak/ }).first().waitFor({ timeout: 30000 }), count: (p) => p.getByRole('button', { name: /Klonla → taslak/ }).count() },
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    session = await login()
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await context.newPage()
    const problems = []
    page.on('request', (r) => isApi(r.url()) && sent.push(Date.now()))
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    await page.route(/\/api\/v1\/careers\/\d+\/squad$/, async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      if (Array.isArray(body.data)) {
        body.data.forEach((c) => { c.player.contractUntil = CONTRACT_UNTIL })
      }
      await route.fulfill({ response: res, json: body })
    })
    await page.goto(`${base}/`)
    await page.evaluate(({ t, s, c, l }) => {
      localStorage.setItem('fc.theme', t)
      localStorage.setItem('fc.mode', 'career')
      localStorage.setItem('fc.career', String(c))
      localStorage.setItem('fc.access', s.accessToken)
      localStorage.setItem('fc.refresh', s.refreshToken)
      localStorage.setItem('fc.lab.v1', JSON.stringify(l))
    }, { t: theme, s: session, c: career.id, l: lab })
    for (const p of PAGES) {
      await pace()
      await page.goto(`${base}${p.path}`, { waitUntil: 'networkidle' })
      await p.ready(page)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(400)
      await page.screenshot({ path: file(`${p.name}-${theme}-${w}.png`), fullPage: true })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${p.name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`),
        axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))), problems: [...problems],
        text: await page.evaluate(pageMinFont, MIN_FONT), found: await p.count(page) })
      problems.length = 0
    }
    await context.close()
  }
}
await browser.close()

writeFileSync(file('gates-report.json'), JSON.stringify({ career: career.id, psQuery, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0) || !(r.found > 0))
console.log(`çekim ${report.length}; sorunlu ${bad.length}; PlayStyle sorgusu ${psQuery}`)
bad.forEach((r) => console.log(' ✗', r.shot, JSON.stringify({ overflow: r.overflow, axe: r.axeNodes, problems: r.problems?.slice(0, 4), below: r.text?.below?.slice?.(0, 3), found: r.found })))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(`minFont ${Math.min(...mins)}px`)
