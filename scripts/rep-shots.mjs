// REP-04/07 ekran kapıları: replika listesi, filtreli liste, detay (4 sekme), kadromla uygula (kariyer + UT).
// Kullanım: node scripts/rep-shots.mjs [--base http://localhost:8081]   (yerel test hesabı kurar, koşu sonunda siler)
// Çıktı: docs/review/v2/screens/REP/*.png ve gates-report.json (axe serious/critical, yatay taşma, konsol/ağ hataları).
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const out = new URL('../docs/review/v2/screens/REP/', import.meta.url)
mkdirSync(out, { recursive: true })
const file = (name) => fileURLToPath(new URL(name, out))

await createGateAccount(base, 'gate-')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const probe = await browser.newContext()
const login = await probe.request.post(`${base}/api/v1/auth/login`, { data: { email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD } })
const session = (await login.json()).data
await probe.close()

const SIZES = [
  { w: 375, h: 812 },
  { w: 1280, h: 900 },
]
const THEMES = ['dark', 'light']
const DETAIL = '/replicas/guardiola_barcelona_2011'
const report = { shots: [], keyboard: [] }

// UT kulüp kartı tohumu: katalogdan mevki başına en iyi oyuncular (kopyalama yok, yalnız kimlik + görünür alanlar).
async function utCards() {
  const positions = ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW', 'CAM', 'CB']
  const seen = new Set()
  const cards = []
  for (const pos of positions) {
    await new Promise((r) => setTimeout(r, 450))
    const res = await fetch(`${base}/api/v1/players?pos=${pos}&sort=overall&order=desc&size=6&gender=0`)
    const items = (await res.json()).data.items
    const pick = items.find((p) => !seen.has(p.id))
    if (!pick) continue
    seen.add(pick.id)
    cards.push({ key: `c:${pick.id}`, source: 'club', name: pick.name, rating: pick.overall, positions: pick.positions, club: pick.club, league: pick.league, nationality: pick.nationality, playerId: pick.id, faceUrl: pick.faceUrl, faceStats: pick.faceStats, faceLabels: pick.faceLabels })
  }
  return cards
}
const cards = await utCards()

// Yerel yığında genel API hız sınırı (dakikada 120) çok sayfalı çekimde dolar: her senaryodan önce yerel Redis sayaçları sıfırlanır (yalnız localhost).
const COMPOSE = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
function resetRateLimits() {
  spawnSync('docker', ['compose', '-f', COMPOSE, 'exec', '-T', 'redis', 'sh', '-c', 'for k in $(redis-cli --scan --pattern "fc:ratelimit:*"); do redis-cli del $k >/dev/null; done'], { encoding: 'utf8' })
}

async function setup(w, h, theme, mode) {
  resetRateLimits()
  const context = await browser.newContext({ viewport: { width: w, height: h } })
  await context.addInitScript(
    ({ theme, mode, session }) => {
      localStorage.setItem('fc.theme', theme)
      localStorage.setItem('fc.mode', mode)
      localStorage.setItem('fc.access', session.accessToken)
      localStorage.setItem('fc.refresh', session.refreshToken)
      document.documentElement.classList.toggle('dark', theme === 'dark')
    },
    { theme, mode, session },
  )
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 200)}`))
  page.on('pageerror', (e) => !e.message.includes("reading 'classList'") && problems.push(`pageerror: ${e.message.slice(0, 200)}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
  return { context, page, problems }
}

async function seedUtCards(page) {
  resetRateLimits()
  await page.goto(`${base}/`, { waitUntil: 'networkidle' })
  await page.evaluate(async (value) => {
    await new Promise((resolve, reject) => {
      const open = indexedDB.open('fcareer')
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const tx = open.result.transaction('kv', 'readwrite')
        tx.objectStore('kv').put({ key: 'utCards', schemaVersion: 1, value })
        tx.oncomplete = () => resolve(undefined)
        tx.onerror = () => reject(tx.error)
      }
    })
  }, { cards, importedAt: new Date().toISOString() })
}

async function listReady(page, problems) {
  try {
    await page.getByRole('list', { name: 'Slot atamaları' }).waitFor({ timeout: 15000 })
  } catch (error) {
    console.error('Slot listesi gelmedi:', page.url(), problems.slice(0, 4), (await page.locator('body').innerText()).slice(0, 400))
    throw error
  }
}

async function record(page, problems, name) {
  await page.waitForTimeout(350)
  await page.screenshot({ path: file(name), fullPage: false, mask: [page.locator('[data-private]')] })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  const axe = await new AxeBuilder({ page }).analyze()
  const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
  report.shots.push({
    file: name,
    horizontalOverflow: overflow,
    axeSeriousCritical: serious.length,
    axeViolations: axe.violations.map((a) => ({ id: a.id, impact: a.impact, nodes: a.nodes.length, sample: a.nodes[0]?.target })),
    consoleAndNetwork: [...problems],
  })
  problems.length = 0
}

for (const { w, h } of SIZES) {
  for (const theme of THEMES) {
    // 1) liste + filtreli liste
    {
      const { context, page, problems } = await setup(w, h, theme, 'career')
      await page.goto(`${base}/replicas?ui=v3`, { waitUntil: 'networkidle' })
      await page.getByRole('link', { name: /Barcelona/ }).first().waitFor()
      await record(page, problems, `liste-${theme}-${w}.png`)
      await page.goto(`${base}/replicas?kategori=TURKISH_BIG4&build=BALANCED&ui=v3`, { waitUntil: 'networkidle' })
      await page.getByRole('link', { name: /Beşiktaş|Fenerbahçe|Galatasaray|Trabzonspor/ }).first().waitFor()
      await record(page, problems, `liste-filtreli-${theme}-${w}.png`)
      await context.close()
    }
    // 2) detay: 4 sekme (kariyer modu)
    {
      const { context, page, problems } = await setup(w, h, theme, 'career')
      for (const tab of ['taktik', 'hikaye', 'dikkat', 'uygula']) {
        await page.goto(`${base}${DETAIL}?sekme=${tab}&ui=v3`, { waitUntil: 'networkidle' })
        await page.getByRole('tab', { selected: true }).waitFor()
        if (tab === 'uygula') {
          await listReady(page, problems)
        }
        await record(page, problems, `detay-${tab}-${theme}-${w}.png`)
      }
      // klavye: sekmeler ok tuşlarıyla gezilir, Enter/Space gerekmez (otomatik seçim)
      await page.goto(`${base}${DETAIL}?ui=v3`, { waitUntil: 'networkidle' })
      await page.getByRole('tab', { name: 'Taktik' }).focus()
      await page.keyboard.press('ArrowRight')
      report.keyboard.push({ size: w, theme, afterArrow: await page.getByRole('tab', { selected: true }).innerText() })
      await context.close()
    }
    // 3) kadromla uygula: UT (kulüp kartlarıyla)
    {
      const { context, page, problems } = await setup(w, h, theme, 'ut')
      await seedUtCards(page)
      await page.goto(`${base}${DETAIL}?sekme=uygula&ui=v3`, { waitUntil: 'networkidle' })
      await listReady(page, problems)
      await record(page, problems, `uygula-ut-${theme}-${w}.png`)
      await context.close()
    }
  }
}

await browser.close()
const failing = report.shots.filter((s) => s.horizontalOverflow || s.axeSeriousCritical > 0 || s.consoleAndNetwork.length > 0)
writeFileSync(file('gates-report.json'), JSON.stringify(report, null, 2))
console.log(`çekim ${report.shots.length}; sorunlu ${failing.length}`)
failing.forEach((s) => console.log(' -', s.file, s.horizontalOverflow ? 'TAŞMA' : '', s.axeSeriousCritical ? `axe ${s.axeSeriousCritical}` : '', s.consoleAndNetwork.slice(0, 2).join(' | ')))
