// V3-06d ekran kapıları: Kariyer Masası (/career/desk, v3) + tek kariyer menüsü.
// Masa: dolu kariyer (bütçe, maaş bütçesi, dönem sonu ve oyun tarihi API ile gerçekten yazılır; kadro maaş toplamı ve iki oyuncunun sözleşme bitişi
// kayıt verisi gerektirdiği için yalnız bu tarayıcıda facets/squad yanıtına eklenir — fikstür), verisi eksik kariyer (yeni açılmış, bütçesiz), Ayarlar sekmesi;
// 375/768/1280 × koyu/açık + kaydırılmış. Menü: her kariyer rotasında aktif öğe (sol ray 1280, alt çubuk 375) + mobil "Daha fazla" sheet'i.
// Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, sayfa minFont (≥ 11px), yapışkan bant sızıntısı + alfa 1, aria-current doğru öğede.
// Kullanım: node scripts/desk-shots.mjs [--base http://localhost:8081] [--out V3-06d]
import { AxeBuilder } from '@axe-core/playwright'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { pageMinFont, stickyBand } from './lib/readability.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const root = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'V3-06d'
const dirOf = (sub) => {
  const url = new URL(`../docs/review/v2/screens/${root}/${sub}/`, import.meta.url)
  mkdirSync(url, { recursive: true })
  return (n) => fileURLToPath(new URL(n, url))
}
const deskFile = dirOf('desk')
const menuFile = dirOf('menu')
const MIN_FONT = 11
const BAND = ['header']
const COMPOSE = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
const resetRateLimits = () => spawnSync('docker', ['compose', '-f', COMPOSE, 'exec', '-T', 'redis', 'sh', '-c', 'for k in $(redis-cli --scan --pattern "fc:ratelimit:*"); do redis-cli del $k >/dev/null; done'], { encoding: 'utf8' })
const ROUTES = [['/career/desk', 'Masa'], ['/players', 'Oyuncular'], ['/squad/builder', 'Taktik & Kadro'], ['/career/transfer', 'Transfer'], ['/career/growth', 'Gelişim'], ['/teams', 'Takımlar'], ['/career/import', 'İçe aktar']]
const MOBILE_ACTIVE = { 'Taktik & Kadro': 'Kadro', Gelişim: 'Daha fazla', Takımlar: 'Daha fazla', 'İçe aktar': 'Daha fazla' }

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : undefined }
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const full = (await api('POST', '/careers', { clubId: club.id, name: 'kapı dolu', budgetEur: 5_000_000 })).body.data
const patched = await api('PATCH', `/careers/${full.id}`, { wageBudgetEur: 40_000, windowEndsOn: '2027-01-31', gameDate: '2027-01-20' })
if (patched.status !== 200) {
  console.error('Kariyer güncellenemedi', patched.status)
  process.exit(1)
}
const sparse = (await api('POST', '/careers', { clubId: club.id, name: 'kapı eksik' })).body.data
await api('GET', `/players?career=${full.id}&size=1`)
await api('GET', `/players?career=${sparse.id}&size=1`)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  const mobile = w < 820
  for (const theme of ['dark', 'light']) {
    resetRateLimits()
    session = await login()
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    // Fikstür (yalnız dolu kariyer): kadro maaş toplamı ve iki oyuncunun sözleşme bitişi (kayıt verisi gerektirir).
    await page.route(`**/api/v1/players/facets?career=${full.id}`, async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      body.data.squadWageEur = 31_500
      await route.fulfill({ response: res, json: body })
    })
    await page.route(`**/api/v1/careers/${full.id}/squad`, async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      body.data.slice(0, 2).forEach((c, i) => { c.player.contractUntil = i === 0 ? '2027-04-30' : '2027-06-30' })
      await route.fulfill({ response: res, json: body })
    })
    const prime = async (careerId) => {
      await page.goto(`${base}/?ui=v3`)
      await page.evaluate(({ t, s, c }) => {
        localStorage.setItem('fc.theme', t)
        localStorage.setItem('fc.mode', 'career')
        localStorage.setItem('fc.career', String(c))
        localStorage.setItem('fc.access', s.accessToken)
        localStorage.setItem('fc.refresh', s.refreshToken)
      }, { t: theme, s: session, c: careerId })
    }
    const shoot = async (file, name, extra = {}, fullPage = mobile) => {
      await page.waitForTimeout(400)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), fullPage })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`),
        axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))), problems: [...problems], text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
      problems.length = 0
    }
    const openDesk = async (query = '') => {
      await page.goto(`${base}/career/desk?${query}${query ? '&' : ''}ui=v3`, { waitUntil: 'networkidle' })
      await page.getByRole('heading', { name: 'Kariyer Masası' }).waitFor({ timeout: 20000 })
      if (!query.includes('ayarlar')) {
        await page.getByRole('img', { name: /Takım uyumu/ }).or(page.getByText('Dizilim henüz kurulmadı')).first().waitFor({ timeout: 30000 })
      }
      await page.waitForLoadState('networkidle')
    }
    const band = () => page.getByRole('region', { name: 'Dönem', exact: true }).locator('span').allTextContents()

    await prime(full.id)
    await openDesk()
    // Zayıf halka kartları gerçek motorla: otomatik dizilimde kaleci ile bir saha oyuncusunun yeri değiştirilir (yalnız bu tarayıcının dizilimi) → iki yanlış rol.
    const swapped = await page.evaluate(({ careerId, gk }) => {
      const all = JSON.parse(localStorage.getItem('fc.lineup') ?? '{}')
      const lineup = all[String(careerId)] ?? {}
      const gkSlot = Object.keys(lineup).find((s) => /^GK/.test(s))
      const outfield = Object.keys(lineup).find((s) => !/^GK/.test(s))
      if (!gkSlot || !outfield || !gk) return false
      ;[lineup[gkSlot], lineup[outfield]] = [lineup[outfield], lineup[gkSlot]]
      all[String(careerId)] = lineup
      localStorage.setItem('fc.lineup', JSON.stringify(all))
      return true
    }, { careerId: full.id, gk: true })
    if (swapped) await openDesk()
    await shoot(deskFile, 'dolu', { fixture: 'squadWageEur + 2 sözleşme', band: await band(), gauge: await page.getByRole('img', { name: /Takım uyumu/ }).getAttribute('aria-label'),
      weak: await page.getByRole('region', { name: 'Zayıf halkalar' }).locator('li').count(), contractAlerts: await page.getByRole('region', { name: 'Uyarılar' }).getByText(/sözleşmesi/).count() })
    await page.getByRole('region', { name: 'Zaman çizelgesi' }).scrollIntoViewIfNeeded()
    await shoot(deskFile, 'dolu-kaydirilmis', { band: await page.evaluate(stickyBand, BAND) }, false)
    await openDesk('sekme=ayarlar')
    await page.getByText('Kariyer ayarları ve yedek').waitFor()
    await shoot(deskFile, 'ayarlar')
    await prime(sparse.id)
    await openDesk()
    await shoot(deskFile, 'eksik', { missingNote: await page.getByRole('region', { name: 'Dönem', exact: true }).getByText(/girilmemiş/).count(), contractAlerts: await page.getByRole('region', { name: 'Uyarılar' }).getByText(/sözleşmesi/).count() })

    // Menü: her kariyer rotasında aktif öğe (yalnız 375 ve 1280).
    if (w !== 768) {
      for (const [path, label] of ROUTES) {
        await page.goto(`${base}${path}?ui=v3`, { waitUntil: 'networkidle' })
        await page.locator('main').waitFor()
        await page.waitForTimeout(600)
        const nav = mobile ? page.getByRole('navigation', { name: 'Mobil menü' }) : page.getByRole('navigation', { name: 'Ana menü' })
        const current = await nav.locator('[aria-current="page"]').allTextContents()
        const expected = mobile ? (MOBILE_ACTIVE[label] ?? label) : label
        await shoot(menuFile, `menu-${path.split('/').filter(Boolean).join('-')}`, { current, expected, activeOk: current.length === 1 && current[0] === expected }, false)
      }
      if (mobile) {
        await page.goto(`${base}/career/growth?ui=v3`, { waitUntil: 'networkidle' })
        await page.getByRole('button', { name: 'Daha fazla' }).click()
        await page.getByRole('dialog', { name: 'Daha fazla' }).waitFor()
        const items = await page.getByRole('dialog', { name: 'Daha fazla' }).getByRole('link').allTextContents()
        await shoot(menuFile, 'daha-fazla-sheet', { items, sheetOk: items.join('|') === 'Gelişim|Takımlar|İçe aktar|Yeni kariyer' }, false)
      }
    }
    await context.close()
  }
}
await browser.close()
writeFileSync(deskFile('gates-report.json'), JSON.stringify({ careers: { full: full.id, sparse: sparse.id }, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0)
  || (r.band && !Array.isArray(r.band) && (!r.band.ok || r.band.surfaces.some((s) => s.alpha < 1))) || r.activeOk === false || r.sheetOk === false
  // Zayıf halka sayısı yalnız raporlanır (taze kadroda 0 olabilir; sayfa "Zayıf halka yok" der).
  || (r.shot.startsWith('dolu-') && !r.shot.includes('kaydirilmis') && r.contractAlerts === 0) || (r.shot.startsWith('eksik') && (r.missingNote === 0 || r.contractAlerts > 0)))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r).slice(0, 600)))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(` · sayfa minFont: en küçük ${Math.min(...mins)}px`)
report.filter((r) => r.shot.endsWith('dark-1280') && (r.gauge || r.missingNote !== undefined)).forEach((r) => console.log(' ·', r.shot, JSON.stringify({ gauge: r.gauge, band: r.band, weak: r.weak, contractAlerts: r.contractAlerts, missingNote: r.missingNote })))
report.filter((r) => r.current).filter((r) => r.shot.includes('dark')).forEach((r) => console.log(' ·', r.shot, JSON.stringify({ current: r.current, expected: r.expected })))
process.exitCode = bad.length ? 1 : 0
