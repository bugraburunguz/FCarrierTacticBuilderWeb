// V3-06a ekran kapıları: kariyer oyuncu listesi (/players, kariyer modu, v3 Katalog) — ızgara, tablo, kaydırılmış ızgara/tablo, süzülmüş
// (kova + yaş + değer + rol sıralaması), mobil sheet, boş; 375/768/1280 × koyu/açık.
// Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, sayfa minFont (≥ 11px), kart içi minFont, yapışkan bant sızıntısı + alfa 1.
// Veri: geçici test hesabı (yalnız localhost) + Crewe Alexandra kariyeri (havuz ≈ 22 bin); koşu sonunda yalnız bu hesap silinir.
// Kullanım: node scripts/career-list-shots.mjs [--base http://localhost:8081]   Çıktı: docs/review/v2/screens/V3-06a/career-list/
// Hız sınırı backend belleğinde (OPS-02, Redis yok): koşu 429 alırsa backend'i yeniden başlat (docker compose restart backend).
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { cardMinFont, pageMinFont, stickyBand } from './lib/readability.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
// --out <screens altı klasör>: regresyon koşusu başka göreve yazılır (commit'li çekimler ezilmez).
const out = new URL(`../docs/review/v2/screens/${args.includes('--out') ? args[args.indexOf('--out') + 1] : 'V3-06a/career-list'}/`, import.meta.url)
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))
const MIN_FONT = 11
const BAND = ['header', 'section[aria-label="Süzgeçler"]', 'thead']

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = (await (await fetch(`${base}/api/v1/careers`, { method: 'POST', headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ clubId: club.id, name: 'kapı Crewe', budgetEur: 5_000_000 }) })).json()).data
const role = (await (await fetch(`${base}/api/v1/roles`)).json()).data.find((r) => r.positions.includes('ST'))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    session = await login()
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    await context.addInitScript(({ t, s, c }) => {
      localStorage.setItem('fc.theme', t)
      localStorage.setItem('fc.mode', 'career')
      localStorage.setItem('fc.career', String(c))
      localStorage.setItem('fc.access', s.accessToken)
      localStorage.setItem('fc.refresh', s.refreshToken)
    }, { t: theme, s: session, c: career.id })
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    const record = async (name, extra = {}) => {
      await page.waitForTimeout(400)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`) })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`), axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))), problems: [...problems], text: await page.evaluate(pageMinFont, MIN_FONT),
        // V3-06c: Lig seviyesi çipi (lig gücü bilinen Crewe kariyerinde) liste satırlarında görünür.
        leagueLevel: /^(bos|mobil-sheet)$/.test(name) ? undefined : await page.getByText(/^(Ligin üstünde|Ligin altında|Lig seviyesinde)/).count(), ...extra })
      problems.length = 0
    }
    const open = async (query, ready) => {
      await page.goto(`${base}/players?${query}${query ? '&' : ''}ui=v3`, { waitUntil: 'networkidle' })
      await ready()
    }
    const listReady = () => page.getByRole('status').filter({ hasText: /oyuncu · \d+ gösteriliyor/ }).waitFor({ timeout: 20000 })

    await open('', listReady)
    await record('izgara', { card: await page.evaluate(cardMinFont, 'main') })
    await page.evaluate(() => window.scrollTo(0, 1400))
    await record('izgara-kaydirilmis', { card: await page.evaluate(cardMinFont, 'main'), band: await page.evaluate(stickyBand, BAND) })
    await open('gorunum=table', listReady)
    await record('tablo')
    await page.evaluate(() => window.scrollTo(0, 900))
    await record('tablo-kaydirilmis', { band: await page.evaluate(stickyBand, BAND) })
    await open(`kova=ALINABILIR&kova=ZOR&yasmax=25&degermin=100000&butce=1&rol=${role.id}&sirala=role`, listReady)
    await record('suzulmus', { card: await page.evaluate(cardMinFont, 'main') })
    await open('degermin=1999000000', () => page.getByText('Bu süzgeçlere uyan oyuncu yok.').waitFor({ timeout: 20000 }))
    await record('bos')
    if (w < 820) {
      await open('', listReady)
      await page.getByRole('button', { name: /Filtreler/ }).click()
      await page.getByRole('dialog', { name: 'Filtreler' }).waitFor()
      await record('mobil-sheet')
    }
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(report, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0) || r.leagueLevel === 0
  || (r.card && r.card.cards > 0 && (r.card.minFontPx < MIN_FONT || r.card.ovrMinPx < 14)) || (r.band && (!r.band.ok || r.band.surfaces.some((s) => s.alpha < 1))))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r)))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(` · sayfa minFont: en küçük ${Math.min(...mins)}px`)
report.filter((r) => r.band).forEach((r) => console.log(' ·', r.shot, JSON.stringify({ leakCount: r.band.leakCount, surfaces: r.band.surfaces.map((s) => `${s.el}:${s.alpha}`) })))
process.exitCode = bad.length ? 1 : 0
