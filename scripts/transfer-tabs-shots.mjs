// KARIYER-UX FAZ 5 ekran kapıları: Transfer (/career/transfer, üretim derlemesi). İki yerel test kariyeri (Crewe, API ile): ana taktik yok
// (başlangıç önerisi, "Otomatik öneri") · ana taktik var (+ kısa liste ve kaydedilmiş satış planı). 3 sekme × 2 durum + satış bağlantısı (?oyuncu=)
// + bütçe planı maaş bilinmiyor × 375/768/1280 × koyu/açık. Öneri hattı (kredili) tetiklenmez.
// Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, minFont ≥ 11px. Kullanım: node scripts/transfer-tabs-shots.mjs [--base http://localhost:8081]
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
const outDir = screensDir('KARIYER-UX-5')
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))
const MIN_FONT = 11
const TABS = ['adaylar', 'kisa-liste', 'satis']

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
  return c
}
const none = await career('Kapı · ana taktik yok')
const withMain = await career('Kapı · ana taktik')
const starter = await api('GET', `/careers/${withMain.id}/starter-tactic`)
await api('PUT', '/user-tactics/1', { careerId: withMain.id, name: `Ana ${starter.formationId}`, lineup: starter.lineup,
  tactic: { formation: starter.formationId, setup: starter.setup, slots: starter.slots.map((s) => ({ slotId: s.slotId, tags: [], roleId: s.roleId })) } })
await api('PUT', `/user-tactics/1/main?careerId=${withMain.id}`)
// Kaydedilmiş satış planı: kadronun en değerli iki yedeği satışta (biri istenen bedelle), biri kiralığa açık; kısa listede iki aday.
const squad = await api('GET', `/careers/${withMain.id}/squad`)
const starters = new Set(Object.values(starter.lineup))
const bench = squad.filter((c) => !starters.has(c.player.id)).sort((a, b) => (b.player.valueEur ?? 0) - (a.player.valueEur ?? 0))
await api('PUT', `/careers/${withMain.id}/tags/${bench[0].player.id}`, { tag: 'FOR_SALE', askingPriceEur: 750_000 })
await api('PUT', `/careers/${withMain.id}/tags/${bench[1].player.id}`, { tag: 'FOR_SALE' })
await api('PUT', `/careers/${withMain.id}/tags/${bench[2].player.id}`, { tag: 'LOAN_OK' })
const pool = await api('GET', `/players?career=${withMain.id}&size=2&positions=CM&sort=overall`)
for (const p of pool.items) {
  await api('PUT', `/careers/${withMain.id}/shortlist/${p.id}`, { maxFeeEur: 400_000 })
}
const focus = squad.find((c) => starters.has(c.player.id))?.player.id

// Kendi hızını ayarlar (squad-shots ile aynı): 60 sn'lik pencerede 240 API isteğini geçmez (sınır 300, değiştirilmez).
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
    const open = async (query) => {
      await pace()
      await page.goto(`${base}/career/transfer${query}`, { waitUntil: 'networkidle' })
      await page.getByRole('heading', { name: 'Transfer Merkezi' }).waitFor({ timeout: 20000 })
      await page.waitForLoadState('networkidle')
    }
    for (const [state, c] of [['yok', none], ['ana', withMain]]) {
      await prime(c.id)
      for (const tab of TABS) {
        await open(tab === 'adaylar' ? '' : `?sekme=${tab}`)
        if (tab === 'adaylar') {
          await page.getByRole('region', { name: 'İhtiyaçlar' }).getByRole('button').first().waitFor({ timeout: 30000 })
        }
        await shoot(`transfer-${tab}-${state}`, { auto: await page.getByText('Otomatik öneri · ana taktik değil').count() })
      }
    }
    await open(`?sekme=satis&oyuncu=${focus}`)
    await shoot('transfer-satis-baglanti', { focused: await page.locator('li[aria-current="true"]').count() })
    if (w < 1024) {
      await page.locator('summary', { hasText: 'Bütçe planı' }).click()
    }
    const wageNote = await page.getByText(/oyuncunun maaşı bilinmiyor — maaş verisi içe aktarmada gelmiyor/).count()
    await shoot('transfer-butce-maas-bilinmiyor', { wageNote })
    await context.close()
  }
}
await browser.close()

writeFileSync(file('gates-report.json'), JSON.stringify({ careers: { none: none.id, main: withMain.id }, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0)
  || (r.shot.startsWith('transfer-adaylar-yok') && r.auto < 1) || (r.shot.startsWith('transfer-adaylar-ana') && r.auto > 0)
  || (r.focused !== undefined && r.focused !== 1) || (r.wageNote !== undefined && r.wageNote < 1))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' ✗', r.shot, JSON.stringify({ overflow: r.overflow, axe: r.axeNodes, problems: r.problems?.slice(0, 4), below: r.text?.below?.slice?.(0, 3), auto: r.auto, focused: r.focused, wageNote: r.wageNote })))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(`minFont ${Math.min(...mins)}px`)
