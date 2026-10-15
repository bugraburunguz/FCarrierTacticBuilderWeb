// V3-06b ekran kapıları: kariyer oyuncu sayfası (/players/:id, kariyer modu, v3 Detay) — kadroda / kadroda değil (sözleşme-değer verisi eksik) /
// kaleci / tam veri (fikstür: yalnız bu tarayıcıda /contract yanıtı değiştirilir; yerel kayıtlarda sözleşme ve oyun tarihi yok) × 4 sekme ×
// 375/768/1280 × koyu/açık, ayrıca kaydırılmış Statlar. Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, sayfa minFont (≥ 11px), kart içi
// minFont, yapışkan bant sızıntısı + alfa 1, sekme çubuğu üst kenarı (375×812 ≤ 640), "Kadronda" rozeti, Roller yardımında lig referansı.
// Veri: geçici test hesabı (yalnız localhost) + Crewe Alexandra kariyeri; koşu sonunda yalnız bu hesap silinir.
// Kullanım: node scripts/career-player-shots.mjs [--base http://localhost:8081]   Çıktı: docs/review/v2/screens/V3-06b/career-player/
import { AxeBuilder } from '@axe-core/playwright'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { cardMinFont, labelClipping, pageMinFont, stickyBand } from './lib/readability.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const out = new URL('../docs/review/v2/screens/V3-06b/career-player/', import.meta.url)
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))
const MIN_FONT = 11
const TAB_TOP_MAX = 640
const BAND = ['header']
const COMPOSE = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
const resetRateLimits = () => spawnSync('docker', ['compose', '-f', COMPOSE, 'exec', '-T', 'redis', 'sh', '-c', 'for k in $(redis-cli --scan --pattern "fc:ratelimit:*"); do redis-cli del $k >/dev/null; done'], { encoding: 'utf8' })
/** Tam veri fikstürü (yalnız görünüm): oyun tarihine göre 7 ay, tahmini değer, maaş, serbest bırakma bedeli, kiralık, kova, alım sonrası bütçe. */
const FULL_CONTRACT = { inSquad: false, onLoan: true, valuationEstimated: true, valueEur: 1_500_000, wageEur: 12_000, releaseClauseEur: 5_000_000,
  contractUntil: '2027-08-15', gameDate: '2027-01-15', monthsLeft: 7, feasibility: 'ZOR', budgetEur: 5_000_000, budgetAfterPurchaseEur: 3_500_000 }

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const auth = () => ({ authorization: `Bearer ${session.accessToken}` })
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = (await (await fetch(`${base}/api/v1/careers`, { method: 'POST', headers: { ...auth(), 'content-type': 'application/json' }, body: JSON.stringify({ clubId: club.id, name: 'kapı Crewe', budgetEur: 5_000_000 }) })).json()).data
const squad = (await (await fetch(`${base}/api/v1/careers/${career.id}/squad`, { headers: auth() })).json()).data
const squadIds = new Set(squad.map((c) => c.player.id))
const pool = (await (await fetch(`${base}/api/v1/players?career=${career.id}&size=60&sort=overall`, { headers: auth() })).json()).data.items
const outfield = (p) => !p.positions.includes('GK')
const players = {
  kadroda: squad.map((c) => c.player).find(outfield).id,
  disarida: pool.find((p) => !squadIds.has(p.id) && outfield(p)).id,
  kaleci: (squad.map((c) => c.player).find((p) => !outfield(p)) ?? pool.find((p) => !outfield(p))).id,
}
players['tam-veri'] = players.disarida

const TABS = [['statlar', ''], ['roller', 'roller'], ['gelisim', 'gelisim'], ['sozlesme', 'sozlesme']]
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  const mobile = w < 820
  for (const theme of ['dark', 'light']) {
    resetRateLimits()
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
    const shoot = async (name, extra = {}, fullPage = mobile) => {
      await page.waitForTimeout(300)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), fullPage })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`),
        axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))), problems: [...problems], text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
      problems.length = 0
    }
    for (const [state, id] of Object.entries(players)) {
      if (state === 'tam-veri') {
        await page.route('**/api/v1/players/*/contract*', (route) => route.fulfill({ json: { success: true, data: FULL_CONTRACT } }))
      }
      for (const [tab, param] of TABS) {
        await page.goto(`${base}/players/${id}?${param ? `sekme=${param}&` : ''}ui=v3`, { waitUntil: 'networkidle' })
        await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 20000 })
        const panel = page.getByRole('tabpanel')
        // Yardım içeriği kapalı <details> içinde: erişilebilirlik ağacında değil, DOM'da beklenir.
        if (tab === 'roller') await panel.locator('[role="note"]').first().waitFor({ state: 'attached', timeout: 20000 })
        if (tab === 'sozlesme') await panel.getByText('Ulaşılabilirlik').or(panel.getByText('Oyuncu kadronda', { exact: false })).first().waitFor({ timeout: 20000 })
        const extra = {
          player: state,
          card: await page.evaluate(cardMinFont, 'section[aria-label="Kart"]'),
          tabTop: await page.evaluate(() => Math.round(document.querySelector('[role="tablist"]').getBoundingClientRect().top)),
          inSquadBadge: await page.getByText('Kadronda', { exact: true }).count(),
        }
        if (w === 375) extra.tabTopOk = extra.tabTop <= TAB_TOP_MAX
        extra.inSquad = state !== 'tam-veri' && squadIds.has(id)
        extra.badgeOk = (extra.inSquadBadge > 0) === extra.inSquad
        if (tab === 'roller') extra.reference = (await panel.locator('[role="note"]').first().textContent())?.slice(0, 160)
        if (tab === 'statlar') extra.labels = await page.evaluate(labelClipping, '[role="tabpanel"]')
        if (tab === 'sozlesme') extra.contractRows = await panel.locator('dt').allTextContents()
        await shoot(`${state}-${tab}`, extra)
        if (tab === 'statlar' && state !== 'tam-veri') {
          await page.evaluate((m) => window.scrollTo(0, m ? 700 : 500), mobile)
          await shoot(`${state}-statlar-kaydirilmis`, { player: state, band: await page.evaluate(stickyBand, BAND) }, false)
        }
      }
      if (state === 'tam-veri') {
        await page.unroute('**/api/v1/players/*/contract*')
      }
    }
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ players, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || r.tabTopOk === false || r.badgeOk === false
  || (r.text && r.text.belowCount > 0) || (r.labels && r.labels.clipped.length > 0)
  || (r.card && r.card.cards > 0 && (r.card.minFontPx < MIN_FONT || r.card.ovrMinPx < 14)) || (r.band && (!r.band.ok || r.band.surfaces.some((s) => s.alpha < 1))))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r)))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(` · sayfa minFont: en küçük ${Math.min(...mins)}px`)
console.log(' · oyuncular', JSON.stringify(players))
report.filter((r) => /-roller-dark-1280$/.test(r.shot)).forEach((r) => console.log(' ·', r.shot, r.reference))
report.filter((r) => /-sozlesme-dark-1280$/.test(r.shot)).forEach((r) => console.log(' ·', r.shot, JSON.stringify(r.contractRows)))
report.filter((r) => r.band).filter((r) => r.shot.includes('dark')).forEach((r) => console.log(' ·', r.shot, JSON.stringify({ leakCount: r.band.leakCount, surfaces: r.band.surfaces.map((s) => `${s.el}:${s.alpha}`) })))
process.exitCode = bad.length ? 1 : 0
