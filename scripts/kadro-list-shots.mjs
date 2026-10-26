// KARIYER-UX FAZ 3.1 ekran kapıları: Kadro Liste sekmesi (/career/squad?sekme=liste, üretim derlemesi) — liste mevki/hat gruplaması, kartlar mevki/hat;
// 375/768/1280 × koyu/açık. Sütun kapısı: her sütunun hücreleri (tüm gruplarda ve başlıkta) aynı x'te başlar (±1 px); dar ekranda gizli sütunlar hariç.
// Fikstür (yalnız bu tarayıcıda, LE içe aktarması gerektirdiği için): bir oyuncu kiralıkta (başka takımda), biri kiralık (bizde), IMPORT snapshot'ı; maaş yok (gerçek veride de yok).
// Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, minFont ≥ 11px. Kullanım: node scripts/kadro-list-shots.mjs [--base http://localhost:8081]
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
const outDir = screensDir('KARIYER-UX-3-1')
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
const career = await api('POST', '/careers', { clubId: club.id, name: 'Kapı · kadro liste', budgetEur: 5_000_000 })
await api('PATCH', `/careers/${career.id}`, { wageBudgetEur: 40_000, windowEndsOn: '2027-01-31', gameDate: '2027-01-20' })

const loanedOutIds = new Set()
const fixtures = async (page) => {
  await page.route(/\/api\/v1\/careers\/\d+\/squad$/, async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    if (!Array.isArray(body.data)) {
      return route.fulfill({ response: res, json: body })
    }
    const out = body.data[body.data.length - 1]
    if (out) { out.loanedOut = true; out.loanUntil = '2027-05-31' }
    const loan = body.data[body.data.length - 2]
    if (loan) { loan.onLoan = true; loan.loanUntil = '2027-02-12' }
    loanedOutIds.add(out?.player.id)
    await route.fulfill({ response: res, json: body })
  })
  // Gerçekte kiralıktaki (başka takımda) oyuncu mevki önerisine girmez (CareerService.squadPlayerIds); fikstür de çıkarır.
  await page.route(/\/api\/v1\/advisor\/positions\/\d+$/, async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    if (Array.isArray(body.data)) {
      body.data = body.data.filter((a) => !loanedOutIds.has(a.playerId))
    }
    await route.fulfill({ response: res, json: body })
  })
  await page.route(/\/api\/v1\/careers\/\d+\/snapshots$/, (route) => route.fulfill({ json: { success: true, data: [{ id: 1, takenAt: '2026-10-19T12:00:00Z', source: 'IMPORT', playerCount: 31 }] } }))
}

// Her sütunun görünür hücrelerinin sol kenarı (başlık dahil) — tüm tbody'lerde aynı olmalı.
const columnGate = () => {
  const table = document.querySelector('[data-squad-table]')
  if (!table) {
    return { found: false }
  }
  const heads = [...table.querySelectorAll('thead th')]
  const firstRow = table.querySelector('tbody tr:nth-child(2)')
  const cols = [...firstRow.querySelectorAll('td[data-col]')].map((td) => td.dataset.col)
  const result = {}
  cols.forEach((col, i) => {
    const xs = [...table.querySelectorAll(`td[data-col="${col}"]`)].map((td) => td.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => Math.round(r.left))
    const head = heads[i].getBoundingClientRect()
    if (xs.length === 0) {
      result[col] = { hidden: true }
      return
    }
    const all = head.width > 0 ? [...xs, Math.round(head.left)] : xs
    result[col] = { cells: xs.length, spread: Math.max(...all) - Math.min(...all) }
  })
  // Hiza tek başına yetmez: isim sütunu okunur genişlikte olmalı ve hiçbir hücrenin içeriği taşmamalı (çip, başlık).
  const nameWidth = Math.round(table.querySelector('td[data-col="name"]').getBoundingClientRect().width)
  const clipped = [...table.querySelectorAll('td, th')].filter((c) => c.getBoundingClientRect().width > 0 && [...c.querySelectorAll('*')].some((n) => {
    const r = n.getBoundingClientRect()
    const box = c.getBoundingClientRect()
    return r.width > 0 && (r.right > box.right + 1 || r.left < box.left - 1)
  })).map((c) => `${c.dataset.col ?? c.tagName}:${c.textContent.slice(0, 30)}`)
  const groups = [...table.querySelectorAll('th[scope="rowgroup"]')].map((th) => th.textContent)
  const tableWidth = table.getBoundingClientRect().width
  const containerWidth = table.parentElement.getBoundingClientRect().width
  return { found: true, groups, tbodies: table.querySelectorAll('tbody').length, theads: table.querySelectorAll('thead').length, columns: result, nameWidth, clipped: clipped.slice(0, 6),
    aligned: Object.values(result).every((c) => c.hidden || c.spread <= 1), fits: tableWidth <= containerWidth + 1 && nameWidth >= 120 && clipped.length === 0,
    note: document.body.innerText.includes('Maaş verisi içe aktarmada gelmiyor.') }
}

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
    await page.goto(`${base}/`)
    await page.evaluate(({ t, s, c }) => {
      localStorage.setItem('fc.theme', t)
      localStorage.setItem('fc.mode', 'career')
      localStorage.setItem('fc.career', String(c))
      localStorage.setItem('fc.access', s.accessToken)
      localStorage.setItem('fc.refresh', s.refreshToken)
    }, { t: theme, s: session, c: career.id })
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
    for (const grup of ['mevki', 'hat']) {
      await page.goto(`${base}/career/squad?sekme=liste${grup === 'hat' ? '&grup=hat' : ''}`, { waitUntil: 'networkidle' })
      await page.locator('[data-squad-table]').waitFor({ timeout: 30000 })
      await page.waitForLoadState('networkidle')
      await shoot(`liste-${grup}`, { columns: await page.evaluate(columnGate), loanedOutBest: await page.locator('td[data-col="best"]', { hasText: 'Kiralıkta' }).count() })
      await page.getByRole('radio', { name: 'Kartlar' }).click()
      await page.getByRole('radio', { name: 'Kartlar', checked: true }).waitFor()
      await shoot(`kartlar-${grup}`, { headings: await page.locator('main h3').allTextContents() })
    }
    await context.close()
  }
}
await browser.close()

writeFileSync(file('gates-report.json'), JSON.stringify({ career: career.id, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0)
  || (r.columns && (!r.columns.found || !r.columns.aligned || !r.columns.fits || r.columns.theads !== 1 || !r.columns.note || r.loanedOutBest < 1)))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' ✗', r.shot, JSON.stringify({ overflow: r.overflow, axe: r.axeNodes, problems: r.problems?.slice(0, 4), below: r.text?.below?.slice?.(0, 3), columns: r.columns, loanedOutBest: r.loanedOutBest })))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(`minFont ${Math.min(...mins)}px`)
const sample = report.find((r) => r.shot === 'liste-mevki-dark-1280')
console.log('gruplar (1280):', JSON.stringify(sample?.columns?.groups), 'sütunlar:', JSON.stringify(sample?.columns?.columns))
