// KARIYER-UX FAZ 4b ekran kapıları: gerçek Taktik Laboratuvarı sekmeleri (Kurucu · Sihirbaz · Replikalar · Kod · Karşılaştır), üretim derlemesi.
// Yerel test kariyerinde ana taktik (API) + iki taslak (tarayıcıda: ana taktiğin kopyası ve bir slotu değiştirilmiş hâli, Karşılaştır dolsun diye).
// 5 sekme × 375/768/1280 × koyu/açık = 30 çekim. Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, minFont ≥ 11px.
// Kullanım: node scripts/lab-tabs-shots.mjs [--base http://localhost:8081]. Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir; ≤ 240 istek/dk.
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
const outDir = new URL('../docs/review/v2/screens/KARIYER-UX-4b/', import.meta.url)
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))
const TABS = ['kurucu', 'sihirbaz', 'replikalar', 'kod', 'karsilastir']
const READY = { kurucu: "En iyi 11'i diz", sihirbaz: 'İleri', replikalar: null, kod: 'Taslak olarak aç', karsilastir: null }

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
  return (await res.json()).data
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'Kapı · Lab 4b', budgetEur: 5_000_000 })
await api('GET', `/players?career=${career.id}&size=1`)
const starter = await api('GET', `/careers/${career.id}/starter-tactic`)
const squad = await api('GET', `/careers/${career.id}/squad`)
const tactic = { formation: starter.formationId, setup: starter.setup, slots: Object.fromEntries(starter.slots.map((s) => [s.slotId, { tags: [], roleId: s.roleId }])) }
await api('PUT', '/user-tactics/1', { careerId: career.id, name: `Ana ${starter.formationId}`, lineup: starter.lineup,
  tactic: { formation: starter.formationId, setup: starter.setup, slots: starter.slots.map((s) => ({ slotId: s.slotId, tags: [], roleId: s.roleId })) } })
await api('PUT', `/user-tactics/1/main?careerId=${career.id}`)
// İkinci taslak: bir saha slotuna yedekten bir oyuncu (Karşılaştır'da fark ve etiket değişimi görünsün).
const bench = squad.map((c) => c.player.id).find((id) => !Object.values(starter.lineup).includes(id))
const swapSlot = Object.keys(starter.lineup).find((s) => !/^GK/.test(s))
const variant = { ...starter.lineup, [swapSlot]: bench }
const now = new Date().toISOString()
const lab = { [career.id]: { activeId: 'b', drafts: [
  { id: 'a', name: `Ana ${starter.formationId}`, origin: { kind: 'main', ref: '1' }, tactic, lineup: starter.lineup, dirty: false, savedTo: { slot: 1, at: now }, updatedAt: now },
  { id: 'b', name: 'Deneme · yedek', origin: { kind: 'main', ref: '1' }, tactic, lineup: variant, dirty: true, updatedAt: now },
] } }

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
    await page.goto(`${base}/`)
    await page.evaluate(({ t, s, c, lab }) => {
      localStorage.setItem('fc.theme', t)
      localStorage.setItem('fc.mode', 'career')
      localStorage.setItem('fc.career', String(c))
      localStorage.setItem('fc.access', s.accessToken)
      localStorage.setItem('fc.refresh', s.refreshToken)
      localStorage.setItem('fc.lab.v1', JSON.stringify(lab))
    }, { t: theme, s: session, c: career.id, lab })
    for (const tab of TABS) {
      await pace()
      await page.goto(`${base}/career/tactics-lab${tab === 'kurucu' ? '' : `?sekme=${tab}`}`, { waitUntil: 'networkidle' })
      await page.getByRole('tab', { name: { kurucu: 'Kurucu', sihirbaz: 'Sihirbaz', replikalar: 'Replikalar', kod: 'Kod', karsilastir: 'Karşılaştır' }[tab], selected: true }).waitFor({ timeout: 20000 })
      if (READY[tab]) await page.getByRole('button', { name: READY[tab] }).first().waitFor({ timeout: 20000 })
      if (tab === 'replikalar') await page.getByRole('button', { name: /Klonla → taslak/ }).first().waitFor({ timeout: 20000 })
      if (tab === 'karsilastir') await page.getByRole('region', { name: 'Slot slot' }).getByRole('listitem').first().waitFor({ timeout: 20000 })
      if (tab === 'kod') await page.getByLabel('EA taktik kodu').waitFor({ timeout: 20000 })
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(400)
      await page.screenshot({ path: file(`lab-${tab}-${theme}-${w}.png`), fullPage: true })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      const extra = tab === 'karsilastir' ? { compare: (await page.getByRole('region', { name: 'Slot slot' }).getByRole('listitem').allTextContents()).slice(0, 3), total: await page.getByRole('region', { name: 'Takım uyumu farkı' }).textContent() } : {}
      report.push({ shot: `lab-${tab}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`),
        axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))), problems: [...problems], text: await page.evaluate(pageMinFont, 11), ...extra })
      problems.length = 0
    }
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ career: career.id, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' ✗', r.shot, JSON.stringify({ overflow: r.overflow, axe: r.axeNodes, problems: r.problems.slice(0, 4), below: r.text?.below?.slice?.(0, 3) })))
console.log(`minFont ${Math.min(...report.map((r) => r.text?.minFontPx).filter((v) => v != null))}px`)
report.filter((r) => r.shot === 'lab-karsilastir-dark-1280').forEach((r) => console.log(' ·', JSON.stringify({ compare: r.compare, total: r.total })))
