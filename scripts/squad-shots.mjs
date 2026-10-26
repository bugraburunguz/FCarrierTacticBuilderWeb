// KARIYER-UX FAZ 3 ekran kapıları: gerçek Kadro Analizi (/career/squad, üretim derlemesi), önizleme değil.
// İki yerel test kariyeri (Crewe, API ile): ana taktik yok (başlangıç önerisi) · ana taktik var. 4 sekme × 2 durum × 375/768/1280 × koyu/açık = 48 çekim.
// Fikstür (yalnız bu tarayıcıda, LE içe aktarması gerektirdiği için): kadro satırlarında maaş, kiralık bitişi, sözleşme ve bir IMPORT snapshot'ı.
// Ek: /squad?sekme=oyuncular yönlendirmesi ve hız sınırı ölçümü (Masa → Kadro → Transfer, tam yükleme ve uygulama içi geçiş; istek sayısı).
// Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, minFont ≥ 11px. Kullanım: node scripts/squad-shots.mjs [--base http://localhost:8081]
// Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir. Hız sınırı backend belleğinde (OPS-02): 429 alırsa docker compose restart backend.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { pageMinFont } from './lib/readability.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = screensDir('KARIYER-UX-3')
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))
const MIN_FONT = 11
const TABS = ['dizilis', 'liste', 'derinlik', 'hareketler']

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
async function career(name) {
  const c = await api('POST', '/careers', { clubId: club.id, name, budgetEur: 5_000_000 })
  await api('PATCH', `/careers/${c.id}`, { wageBudgetEur: 40_000, windowEndsOn: '2027-01-31', gameDate: '2027-01-20' })
  await api('GET', `/players?career=${c.id}&size=1`)
  return c
}
const none = await career('Kapı · ana taktik yok')
const withMain = await career('Kapı · ana taktik')
const starter = await api('GET', `/careers/${withMain.id}/starter-tactic`)
await api('PUT', '/user-tactics/1', { careerId: withMain.id, name: `Ana ${starter.formationId}`, lineup: starter.lineup,
  tactic: { formation: starter.formationId, setup: starter.setup, slots: starter.slots.map((s) => ({ slotId: s.slotId, tags: [], roleId: s.roleId })) } })
await api('PUT', `/user-tactics/1/main?careerId=${withMain.id}`)

const fixtures = async (page) => {
  await page.route(/\/api\/v1\/careers\/\d+\/squad$/, async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    if (!Array.isArray(body.data)) {
      return route.fulfill({ response: res, json: body })
    }
    body.data.forEach((c, i) => { if (i >= 2) c.wageEur = 1_500 + (i % 5) * 500 })
    const bench = body.data[body.data.length - 1]
    if (bench) { bench.onLoan = true; bench.loanUntil = '2027-02-12' }
    ;[[3, '2027-04-30'], [5, '2027-06-30'], [7, '2028-06-30'], [9, '2029-06-30']].forEach(([i, d]) => { if (body.data[i]) body.data[i].player.contractUntil = d })
    await route.fulfill({ response: res, json: body })
  })
  await page.route(/\/api\/v1\/careers\/\d+\/snapshots$/, (route) => route.fulfill({ json: { success: true, data: [{ id: 1, takenAt: '2026-10-19T12:00:00Z', source: 'IMPORT', playerCount: 31 }] } }))
}

// Kendi hızını ayarlar: koşu art arda tam yükleme yapar (her biri ~25 API isteği); 60 sn'lik pencerede 240'ı geçmeden bekler (sınır 300, değiştirilmez).
const sent = []
const PACE = 240
async function pace() {
  for (;;) {
    const now = Date.now()
    while (sent.length && now - sent[0] > 61_000) sent.shift()
    if (sent.length < PACE) return
    await new Promise((r) => setTimeout(r, 2_000))
  }
}
const track = (page) => page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/v1/') && !u.pathname.startsWith('/api/v1/img/')) sent.push(Date.now()) })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    session = await login()
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    await fixtures(page)
    track(page)
    const prime = async (careerId) => {
      await page.goto(`${base}/`)
      await page.evaluate(({ t, s, c }) => {
        localStorage.setItem('fc.theme', t)
        localStorage.setItem('fc.mode', 'career')
        localStorage.setItem('fc.career', String(c))
        localStorage.setItem('fc.access', s.accessToken)
        localStorage.setItem('fc.refresh', s.refreshToken)
      }, { t: theme, s: session, c: careerId })
    }
    const shoot = async (name, extra = {}) => {
      await page.waitForTimeout(400)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), fullPage: true })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`),
        axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))), problems: [...problems], text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
      problems.length = 0
    }
    for (const [state, c] of [['yok', none], ['ana', withMain]]) {
      await prime(c.id)
      for (const tab of TABS) {
        await pace()
        await page.goto(`${base}/career/squad${tab === 'dizilis' ? '' : `?sekme=${tab}`}`, { waitUntil: 'networkidle' })
        await page.getByRole('heading', { name: 'Kadro', exact: true }).waitFor({ timeout: 20000 })
        if (tab === 'dizilis') {
          await page.locator('[data-pitch-marker="pawn"]').first().waitFor({ timeout: 30000 })
        }
        await page.waitForLoadState('networkidle')
        const labEntries = await page.getByText(/Lab'd|Lab'a/).count()
        const sources = await page.locator('[data-source]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-source')}:${e.textContent}`))
        await shoot(`kadro-${tab}-${state}`, { labEntries, sources })
      }
    }
    await prime(withMain.id)
    await page.goto(`${base}/squad?sekme=oyuncular`, { waitUntil: 'networkidle' })
    report.push({ shot: `redirect-${theme}-${w}`, redirectedTo: new URL(page.url()).pathname + new URL(page.url()).search, problems: [] })
    await context.close()
  }
}

// Hız sınırı ölçümü (OPS-02 "api:" kovası: kullanıcı başına dakikada 300): her sayfa açılışında kaç API isteği gider.
await new Promise((r) => setTimeout(r, 61_000)) // ölçüm temiz bir dakika penceresinde başlasın
session = await login()
const load = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const lp = await load.newPage()
await fixtures(lp)
let counted = 0
const statuses = []
lp.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/v1/') && !u.pathname.startsWith('/api/v1/img/')) counted += 1 })
lp.on('response', (r) => { if (r.status() === 429) statuses.push(new URL(r.url()).pathname) })
await lp.goto(`${base}/`)
await lp.evaluate(({ s, c }) => {
  localStorage.setItem('fc.mode', 'career')
  localStorage.setItem('fc.career', String(c))
  localStorage.setItem('fc.access', s.accessToken)
  localStorage.setItem('fc.refresh', s.refreshToken)
}, { s: session, c: withMain.id })
const loads = []
const step = async (label, run) => {
  counted = 0
  await run()
  await lp.waitForLoadState('networkidle')
  await lp.waitForTimeout(500)
  loads.push({ label, requests: counted })
}
for (const [path, label] of [['/career/dashboard', 'Masa'], ['/career/squad', 'Kadro'], ['/career/transfer', 'Transfer']]) {
  await step(`${label} (tam yükleme)`, () => lp.goto(`${base}${path}`, { waitUntil: 'networkidle' }))
}
for (let round = 1; round <= 3; round += 1) {
  await step(`tur ${round}: Masa (uygulama içi)`, () => lp.getByRole('navigation', { name: 'Ana menü' }).getByRole('link', { name: 'Masa' }).click())
  await step(`tur ${round}: Kadro (uygulama içi)`, () => lp.getByRole('navigation', { name: 'Ana menü' }).getByRole('link', { name: 'Taktik & Kadro' }).click())
  await step(`tur ${round}: Transfer (uygulama içi)`, () => lp.getByRole('navigation', { name: 'Ana menü' }).getByRole('link', { name: 'Transfer' }).click())
}
await load.close()
await browser.close()

writeFileSync(file('gates-report.json'), JSON.stringify({ careers: { none: none.id, main: withMain.id }, rateLimit: { bucket: 'api', perMinute: 300, loads, got429: statuses }, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0)
  || (r.redirectedTo !== undefined && r.redirectedTo !== '/career/squad?sekme=liste'))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' ✗', r.shot, JSON.stringify({ overflow: r.overflow, axe: r.axeNodes, problems: r.problems?.slice(0, 4), below: r.text?.below?.slice?.(0, 3), labEntries: r.labEntries, redirectedTo: r.redirectedTo })))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(`minFont ${Math.min(...mins)}px`)
console.log('istek sayıları:', JSON.stringify(loads), '429:', statuses.length)
