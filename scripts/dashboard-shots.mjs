// KARIYER-UX FAZ 2 ekran kapıları: gerçek Kariyer Masası (/career/dashboard, üretim derlemesi), önizleme değil.
// Üç durum, her biri ayrı yerel test kariyeri (Crewe, API ile kurulur): ana taktik yok (başlangıç önerisi) · ana taktik var · dizilişten oyuncu düşmüş
// (ana taktikteki bir oyuncu SELL olayıyla satılır → /fit/lineup kilitli doldurur). Ana taktikte kaleci ile bir saha oyuncusu yer değiştirir (zayıf halka kartları gerçek motorla).
// Fikstür (yalnız bu tarayıcıda, kayıt verisi LE içe aktarması gerektirdiği için): kadro satırlarında maaş/kiralık bitişi/sözleşme ve iki IMPORT snapshot'ı (Δ).
// 375/768/1280 × koyu/açık + Ayarlar sekmesi + /career/desk?sekme=ayarlar yönlendirmesi. Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, minFont ≥ 11px.
// Kullanım: node scripts/dashboard-shots.mjs [--base http://localhost:8081]. Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir.
// Hız sınırı backend belleğinde (OPS-02): koşu 429 alırsa backend'i yeniden başlat (docker compose restart backend).
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
const outDir = new URL('../docs/review/v2/screens/KARIYER-UX-2/', import.meta.url)
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))
const MIN_FONT = 11

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

/** Başlangıç önerisini ana taktik yapar; kaleci ile bir saha oyuncusu yer değiştirir. Döner: dizilişteki saha oyuncusu (satılacak aday). */
async function makeMain(careerId, slot) {
  const starter = await api('GET', `/careers/${careerId}/starter-tactic`)
  const lineup = { ...starter.lineup }
  const gk = Object.keys(lineup).find((s) => /^GK/.test(s))
  const outfield = Object.keys(lineup).filter((s) => !/^GK/.test(s))
  ;[lineup[gk], lineup[outfield[0]]] = [lineup[outfield[0]], lineup[gk]]
  const tactic = { formation: starter.formationId, setup: starter.setup, slots: starter.slots.map((s) => ({ slotId: s.slotId, tags: [], roleId: s.roleId })) }
  await api('PUT', `/user-tactics/${slot}`, { careerId, name: `Ana ${starter.formationId}`, tactic, lineup })
  await api('PUT', `/user-tactics/${slot}/main?careerId=${careerId}`)
  return lineup[outfield[1]]
}

const none = await career('Kapı · ana taktik yok')
const withMain = await career('Kapı · ana taktik')
await makeMain(withMain.id, 1)
const dropped = await career('Kapı · oyuncu düştü')
const sold = await makeMain(dropped.id, 2)
await api('POST', `/careers/${dropped.id}/events`, { type: 'SELL', playerId: sold, feeEur: 1_200_000 })
const dropCheck = await api('GET', `/user-tactics/main?careerId=${dropped.id}`)

const STATES = [['yok', none], ['ana', withMain], ['dustu', dropped]]
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
    // Fikstür: kayıt verisi (maaş, kiralık bitişi, sözleşme) ve iki IMPORT snapshot'ı (bütçe/maaş Δ).
    await page.route(/\/api\/v1\/careers\/\d+\/squad$/, async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      body.data.forEach((c, i) => {
        if (i >= 2) c.wageEur = 1_500 + (i % 5) * 500
      })
      const bench = body.data[body.data.length - 1]
      if (bench) {
        bench.onLoan = true
        bench.loanUntil = '2027-02-12'
      }
      if (body.data[3]) body.data[3].player.contractUntil = '2027-04-30'
      if (body.data[5]) body.data[5].player.contractUntil = '2027-06-30'
      await route.fulfill({ response: res, json: body })
    })
    await page.route(/\/api\/v1\/careers\/\d+\/snapshots$/, (route) => route.fulfill({ json: { success: true, data: [
      { id: 2, takenAt: '2026-10-19T12:00:00Z', source: 'IMPORT', playerCount: 31, budgetEur: 5_000_000, squadWageEur: 38_500 },
      { id: 1, takenAt: '2026-10-05T12:00:00Z', source: 'IMPORT', playerCount: 30, budgetEur: 3_800_000, squadWageEur: 36_000 },
    ] } }))
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
    const sources = () => page.locator('[data-source]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-source')}:${e.textContent}`))

    for (const [state, c] of STATES) {
      await prime(c.id)
      await page.goto(`${base}/career/dashboard`, { waitUntil: 'networkidle' })
      await page.getByRole('heading', { name: 'Kariyer Masası' }).waitFor({ timeout: 20000 })
      if (state === 'yok') {
        await page.getByText('Otomatik öneri · ana taktik değil').first().waitFor({ timeout: 30000 })
      } else {
        await page.getByRole('img', { name: /Takım uyumu/ }).waitFor({ timeout: 30000 })
      }
      if (state === 'dustu') {
        await page.getByText(/otomatik dolduruldu/).waitFor({ timeout: 30000 })
      }
      await page.waitForLoadState('networkidle')
      await page.getByRole('region', { name: 'Bu dönemin 3 işi' }).getByRole('listitem').first().waitFor({ timeout: 30000 })
      const weak = await page.getByRole('region', { name: 'Zayıf halkalar' }).getByRole('listitem').allTextContents()
      // FAZ 2 düzeltme: "3 iş" Masa sekmesinin ilk bölümü. Lab girişleri FAZ 4a'dan beri açık; sayı yalnız raporlanır.
      const jobsFirst = await page.locator('[role="tabpanel"] section').first().getAttribute('aria-label')
      const labEntries = await page.getByText(/Lab'd|Lab'a|Rolü değiştir/).count()
      const jobs = await page.getByRole('region', { name: 'Bu dönemin 3 işi' }).getByRole('listitem').allTextContents()
      await shoot(`masa-${state}`, { sources: await sources(), weak: weak.map((t) => t.slice(0, 120)), jobs: jobs.map((t) => t.slice(0, 90)), jobsFirst, labEntries })
    }

    await prime(withMain.id)
    await page.goto(`${base}/career/desk?sekme=ayarlar`, { waitUntil: 'networkidle' })
    await page.getByLabel('Ad').waitFor({ timeout: 20000 })
    await shoot('ayarlar', { redirectedTo: new URL(page.url()).pathname + new URL(page.url()).search })
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ careers: { none: none.id, main: withMain.id, dropped: dropped.id }, droppedOnServer: dropCheck?.lineupDropped, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0)
  || (r.jobsFirst !== undefined && r.jobsFirst !== 'Bu dönemin 3 işi'))
console.log(`çekim ${report.length}; sorunlu ${bad.length}; sunucuda düşen oyuncu ${dropCheck?.lineupDropped}`)
bad.forEach((r) => console.log(' ✗', r.shot, JSON.stringify({ overflow: r.overflow, axe: r.axeNodes, problems: r.problems, below: r.text?.below?.slice?.(0, 3) })))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(`minFont ${Math.min(...mins)}px`)
report.filter((r) => r.shot.endsWith('dark-1280')).forEach((r) => console.log(' ·', r.shot, JSON.stringify({ jobsFirst: r.jobsFirst, labEntries: r.labEntries, jobs: r.jobs, weak: r.weak, redirectedTo: r.redirectedTo })))
