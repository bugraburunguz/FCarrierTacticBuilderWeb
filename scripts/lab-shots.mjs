// KARIYER-UX FAZ 4a ekran kapıları: gerçek Taktik Laboratuvarı (/career/tactics-lab, üretim derlemesi).
// Durumlar arayüzden üretilir (aynı tarayıcı bağlamında): taslak yok → "Yeni taslak" (kirli taslak) → "Ana taktiğim yap" (Slot 1, kaydedildi).
// 375/768/1280 × koyu/açık = 18 çekim. Ayrıca Lab kurucusu açılışında API istek sayısı (uç başına).
// Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, minFont ≥ 11px. Kullanım: node scripts/lab-shots.mjs [--base http://localhost:8081]
// Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir. Hız sınırı (300/dk) aşılmasın diye kendi hızını ayarlar (≤ 240/dk).
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
const outDir = new URL('../docs/review/v2/screens/KARIYER-UX-4a/', import.meta.url)
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))
const MIN_FONT = 11

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
  const text = await res.text()
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status}`)
  return text ? JSON.parse(text).data : undefined
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'Kapı · Lab', budgetEur: 5_000_000 })
await api('GET', `/players?career=${career.id}&size=1`)
const starter = await api('GET', `/careers/${career.id}/starter-tactic`)
await api('PUT', '/user-tactics/2', { careerId: career.id, name: `Ana ${starter.formationId}`, lineup: starter.lineup,
  tactic: { formation: starter.formationId, setup: starter.setup, slots: starter.slots.map((s) => ({ slotId: s.slotId, tags: [], roleId: s.roleId })) } })
await api('PUT', `/user-tactics/2/main?careerId=${career.id}`)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
const newPage = async (w, h, theme) => {
  session = await login()
  const context = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await context.newPage()
  page.on('request', (r) => isApi(r.url()) && sent.push(Date.now()))
  await page.goto(`${base}/`)
  await page.evaluate(({ t, s, c }) => {
    localStorage.setItem('fc.theme', t)
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.career', String(c))
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
  }, { t: theme, s: session, c: career.id })
  return { context, page }
}

for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    await pace()
    const { context, page } = await newPage(w, h, theme)
    const problems = []
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    const shoot = async (name, extra = {}) => {
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(400)
      await page.screenshot({ path: file(`lab-${name}-${theme}-${w}.png`), fullPage: true })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `lab-${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`),
        axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))), problems: [...problems], text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
      problems.length = 0
    }
    await page.goto(`${base}/career/tactics-lab`, { waitUntil: 'networkidle' })
    await page.getByText('Henüz taslak yok').waitFor({ timeout: 20000 })
    await shoot('taslak-yok')

    const create = page.getByRole('button', { name: /Yeni taslak/ })
    await create.waitFor()
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find((b) => /Yeni taslak/.test(b.textContent ?? ''))?.disabled, null, { timeout: 20000 })
    await create.click()
    await page.getByRole('button', { name: "En iyi 11'i diz" }).waitFor({ timeout: 20000 })
    await page.getByText('Taslak · kaydedilmedi').first().waitFor()
    await shoot('kirli')

    await page.getByRole('button', { name: 'Ana taktiğim yap' }).click()
    await page.getByRole('radio', { name: /Slot 1/ }).click()
    await page.getByRole('button', { name: 'Kaydet ve ana taktik yap' }).click()
    // Önceki çekim Slot 1'e yazdıysa diyalog ikinci onay ister (SaveToSlot deseni).
    const overwrite = page.getByRole('button', { name: 'Üzerine yazmak için tekrar bas' })
    if (await overwrite.isVisible().catch(() => false)) {
      await overwrite.click()
    }
    await page.getByText('Taslak · Slot 1').first().waitFor({ timeout: 20000 })
    await shoot('ana-yapildi')
    await context.close()
  }
}

// İstek ölçümü (FAZ 4a madde 9): taslağı olan Lab kurucusu tam yükleme; uç başına sayı. /fit/role slot başına bir istek.
await new Promise((r) => setTimeout(r, 61_000))
const { context: mc, page: mp } = await newPage(1280, 900, 'dark')
await mp.evaluate((c) => {
  const lineup = {}
  localStorage.setItem('fc.lab.v1', JSON.stringify({ [c]: { activeId: 'm1', drafts: [{ id: 'm1', name: 'Ölçüm', origin: { kind: 'blank' }, tactic: { formation: '4-4-2', slots: {} }, lineup, dirty: true, updatedAt: new Date().toISOString() }] } }))
}, career.id)
const byPath = {}
mp.on('request', (r) => { if (isApi(r.url())) { const p = new URL(r.url()).pathname.replace(/\d+/g, ':id'); byPath[p] = (byPath[p] ?? 0) + 1 } })
await mp.goto(`${base}/career/tactics-lab`, { waitUntil: 'networkidle' })
await mp.getByRole('button', { name: "En iyi 11'i diz" }).waitFor({ timeout: 20000 })
await mp.waitForLoadState('networkidle')
await mp.waitForTimeout(1500)
await mc.close()
await browser.close()

const total = Object.values(byPath).reduce((a, b) => a + b, 0)
writeFileSync(file('gates-report.json'), JSON.stringify({ career: career.id, labOpenRequests: { total, byPath }, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' ✗', r.shot, JSON.stringify({ overflow: r.overflow, axe: r.axeNodes, problems: r.problems.slice(0, 4), below: r.text?.below?.slice?.(0, 3) })))
console.log(`minFont ${Math.min(...report.map((r) => r.text?.minFontPx).filter((v) => v != null))}px`)
console.log(`Lab açılışı: ${total} istek`, JSON.stringify(byPath))
