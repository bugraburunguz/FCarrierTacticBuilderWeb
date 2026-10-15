// V3-05d ekran kapıları: SBC çözüm sayfası (/ut/sbc/:setId/:challengeId, v3).
// 1) Sentetik görevler (tests/fixtures/sbcClubFixture.ts; Playwright route ile yalnız bu tarayıcıda): çözüm, skor tabanlı, çözümsüz, doğrulanamayan şart,
//    kulüp boş, Özelleştir açık × 375/768/1280 × koyu/açık.
// 2) Gerçek içe aktarılmış setler (yerel bilgi tabanı, mock yok) + sentetik kulüp.
// 3) q17/Q18: çözüm sahası, tüm dizilişler × 375/768/1280×800 (ölçüm scripts/lib/pitchGate.mjs, kadro sayfasıyla ortak).
// Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, sayfa minFont ≥ 11, saha kartı minFont, bant sızıntısı, çözücü süresi (p95).
// Oturum: geçici yerel test hesabı (yalnız localhost; koşu sonunda yalnız bu hesap silinir). EA'ya istek yok; sayfa yalnız plan gösterir.
// Kullanım: node scripts/sbc-solve-shots.mjs [--base http://localhost:8081] [--skip-q17]   Çıktı: docs/review/v2/screens/V3-05d/
import { AxeBuilder } from '@axe-core/playwright'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { sbcClubFixture, sbcMarketFixture, sbcPricesFixture, sbcSetFixture } from '../tests/fixtures/sbcClubFixture.ts'
import { createGateAccount } from './lib/gateAccount.mjs'
import { LONGEST, measurePitch, q18Problems } from './lib/pitchGate.mjs'
import { cardMinFont, pageMinFont, stickyBand } from './lib/readability.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const OUT = new URL('../docs/review/v2/screens/V3-05d/', import.meta.url)
const dir = (sub) => {
  const url = new URL(sub, OUT)
  mkdirSync(url, { recursive: true })
  return (n) => fileURLToPath(new URL(n, url))
}
const fixtureFile = dir('./')
const realFile = dir('gercek/')
const COMPOSE = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
const resetRateLimits = () => spawnSync('docker', ['compose', '-f', COMPOSE, 'exec', '-T', 'redis', 'sh', '-c', 'for k in $(redis-cli --scan --pattern "fc:ratelimit:*"); do redis-cli del $k >/dev/null; done'], { encoding: 'utf8' })
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
const MIN_FONT = 11
const CLUB = { cards: sbcClubFixture(), importedAt: '2026-10-15T10:00:00Z' }

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
const solveTimes = []

async function newContext({ w, h, theme, seed, fixture, formation = '4-4-2' }) {
  resetRateLimits()
  const session = await login()
  const context = await browser.newContext({ viewport: { width: w, height: h } })
  await context.addInitScript(({ t, s, club }) => {
    localStorage.setItem('fc.theme', t)
    localStorage.setItem('fc.mode', 'ut')
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
    if (club) localStorage.setItem('fc.utCards', JSON.stringify(club))
  }, { t: theme, s: session, club: seed ? CLUB : null })
  if (fixture) {
    const now = Date.now()
    await context.route(/\/api\/v1\/ut\/kb\/sbc\/7700(\?|$)/, (r) => r.fulfill(ok(sbcSetFixture(now, formation))))
    await context.route(/\/api\/v1\/players\?/, (r) => {
      const pos = new URL(r.request().url()).searchParams.getAll('pos')
      return r.fulfill(ok({ items: sbcMarketFixture().filter((p) => pos.length === 0 || p.positions.some((x) => pos.includes(x))), page: 0, size: 100, totalItems: 0 }))
    })
    await context.route(/\/api\/v1\/ut\/kb\/prices\?/, (r) => r.fulfill(ok(sbcPricesFixture(new URL(r.request().url()).searchParams.getAll('resource').map(Number)))))
  }
  return context
}

async function open(context, path) {
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
  await page.goto(`${base}${path}${path.includes('?') ? '&' : '?'}ui=v3`, { waitUntil: 'networkidle' })
  // Hazır: kare plan (data-solve-ms), skor çubuğu, skor için boş kulüp ya da görev bilgisi yok.
  await page.locator('[data-solve-ms]').or(page.getByRole('progressbar')).or(page.getByText(/Skor planı kulüp kartlarından|görevin şartları/)).first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(500)
  const ms = await page.evaluate(() => Number(document.querySelector('[data-solve-ms]')?.getAttribute('data-solve-ms') ?? NaN))
  if (Number.isFinite(ms)) solveTimes.push(ms)
  return { page, problems, ms }
}

async function record(file, page, problems, name, extra = {}) {
  await page.screenshot({ path: file(`${name}.png`) })
  const axe = await new AxeBuilder({ page }).analyze()
  const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
  report.push({ shot: name, overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), axeSeriousCritical: serious.length,
    axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')}`.slice(0, 160))), problems: [...problems], text: await page.evaluate(pageMinFont, MIN_FONT),
    card: await page.evaluate(cardMinFont, 'section[aria-label="Saha"]'), ...extra })
  problems.length = 0
}

const STATES = [
  { name: 'cozum', path: '/ut/sbc/7700/77001', seed: true },
  { name: 'skor', path: '/ut/sbc/7700/77004', seed: true },
  { name: 'cozumsuz', path: '/ut/sbc/7700/77005', seed: true },
  { name: 'dogrulanamayan', path: '/ut/sbc/7700/77006', seed: true },
  { name: 'kulup-bos', path: '/ut/sbc/7700/77001', seed: false },
  { name: 'ozellestir', path: '/ut/sbc/7700/77001', seed: true, customize: true },
]
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    for (const state of STATES) {
      const context = await newContext({ w, h, theme, seed: state.seed, fixture: true })
      const { page, problems, ms } = await open(context, state.path)
      if (state.customize) {
        await page.getByText('Özelleştir', { exact: true }).click()
        await page.getByRole('checkbox', { name: 'Yalnız kulüp' }).scrollIntoViewIfNeeded()
      }
      const extra = { solveMs: ms }
      if (state.name === 'cozum') {
        await page.evaluate(() => window.scrollTo(0, 500))
        extra.band = await page.evaluate(stickyBand, ['header'])
        await page.evaluate(() => window.scrollTo(0, 0))
        extra.cards = await page.locator('section[aria-label="Saha"] [data-slot-group] [role="img"][aria-label*=", "]').count()
      }
      await record(fixtureFile, page, problems, `${state.name}-${theme}-${w}`, extra)
      await context.close()
    }
  }
}

// Gerçek içe aktarılmış setler (yerel bilgi tabanı): kare görevli 2 set + varsa skor tabanlı 1 set; kulüp sentetik.
const sets = (await (await fetch(`${base}/api/v1/ut/kb/sbc?active=true&challenges=true`)).json()).data ?? []
const squad = sets.filter((s) => (s.challenges ?? []).some((c) => c.kind !== 'ITEM_SCORE' && c.formation)).slice(0, 2)
const scored = sets.find((s) => (s.challenges ?? []).some((c) => c.kind === 'ITEM_SCORE'))
const real = [...squad.map((s) => ({ set: s, challenge: s.challenges.find((c) => c.kind !== 'ITEM_SCORE' && c.formation) })), ...(scored ? [{ set: scored, challenge: scored.challenges.find((c) => c.kind === 'ITEM_SCORE') }] : [])]
for (const { w, h } of [{ w: 375, h: 812 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    for (const [i, r] of real.entries()) {
      const context = await newContext({ w, h, theme, seed: true, fixture: false })
      const { page, problems, ms } = await open(context, `/ut/sbc/${r.set.id}/${r.challenge.id}`)
      // Fiyat kapsamı: alışveriş listesinde gözlenmiş fiyatı olan / "fiyat yok" kart sayısı.
      const prices = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('section[aria-label="Alışveriş listesi"] li')].map((li) => li.textContent ?? '')
        return { buy: rows.length, unknown: rows.filter((t) => t.includes('fiyat yok')).length }
      })
      await record(realFile, page, problems, `gercek-${i + 1}-${theme}-${w}`, { solveMs: ms, set: r.set.name, challenge: r.challenge.name, kind: r.challenge.kind, prices,
        cards: await page.locator('section[aria-label="Saha"] [data-slot-group] [role="img"][aria-label*=", "]').count() })
      await context.close()
    }
  }
}

// q17/Q18 çözüm sahası: tüm dizilişler (sentetik kare görev o dizilişte).
const q17 = []
if (!args.includes('--skip-q17')) {
  const formations = (await (await fetch(`${base}/api/v1/formations`)).json()).data
  for (const size of [{ name: '375', w: 375, h: 812 }, { name: '768', w: 768, h: 1024 }, { name: '1280x800', w: 1280, h: 800 }]) {
    for (const f of formations) {
      const context = await newContext({ w: size.w, h: size.h, theme: 'dark', seed: true, fixture: true, formation: f.id })
      const { page, ms } = await open(context, '/ut/sbc/7700/77001')
      const m = q18Problems(await page.evaluate(measurePitch, { formationId: f.id, expected: f.slots.length, longest: LONGEST }), size.w)
      q17.push({ size: size.name, formation: f.id, solveMs: ms, cardWidth: m.cardWidth && Math.round(m.cardWidth), minFont: m.minFont && Number(m.minFont.toFixed(1)), ovrFont: m.ovrFont && Number(m.ovrFont.toFixed(1)), problems: m.problems })
      await context.close()
    }
  }
}
await browser.close()

const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] : null
}
const timing = { samples: solveTimes.length, p50: pct(solveTimes, 50), p95: pct(solveTimes, 95), max: solveTimes.length ? Math.max(...solveTimes) : null }
writeFileSync(fixtureFile('gates-report.json'), JSON.stringify({ report, q17, timing }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || r.text?.belowCount > 0 || (r.card && r.card.cards > 0 && (r.card.minFontPx < MIN_FONT || r.card.ovrMinPx < 14))
  || (r.band && (!r.band.ok || r.band.surfaces.some((s) => s.alpha < 1))) || (r.shot.startsWith('cozum-') && r.cards !== 11))
const q17bad = q17.filter((r) => r.problems.length)
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r).slice(0, 500)))
console.log(`q17 çözüm sahası: ${q17.length} kombinasyon; sorunlu ${q17bad.length}`)
q17bad.slice(0, 20).forEach((r) => console.log(' -', r.size, r.formation, r.problems.join('; ')))
console.log(`gerçek setler: ${real.map((r) => `${r.set.name} / ${r.challenge.name} (${r.challenge.kind})`).join(' · ')}`)
console.log(`çözücü süresi (ms): ${JSON.stringify(timing)}`)
const fixturePrices = report.filter((r) => r.prices).map((r) => `${r.shot}: alınacak ${r.prices.buy}, fiyatı bilinmeyen ${r.prices.unknown}`)
console.log(`fiyat kapsamı (gerçek setler): ${fixturePrices.slice(0, 2).join(' · ')}`)
process.exitCode = bad.length || q17bad.length || (timing.p95 ?? 0) > 3000 ? 1 : 0
