// V3-07b ekran kapıları: kadro grubu v3 sayfaları × 375/768/1280 × koyu/açık.
//  Kariyer: /squad (dolu: kadro sahası + kaydırılmış, oyuncular liste/kartlar, satış diyaloğu, hareketler, kariyer; boş: fikstür kadro=[]),
//           /squad/builder (dolu + kaydırılmış, oyuncu seçim paneli — masaüstü yan panel / mobil sheet, taktik kodu diyaloğu; boş: anonim).
//  UT: /ut/squad (boş, dolu + kaydırılmış, kart seçim paneli, taktik kodu diyaloğu).  Sihirbaz: /tactics/wizard her adım + sonuç.
//  Replika regresyonu (ApplyTab diyaloğu değişti): /replicas/:id?sekme=uygula (kariyer) + UT'de "oyuncu öner" diyaloğu.
// Ölçüm: yatay taşma, axe serious/critical, konsol/ağ 4xx-5xx, sayfa minFont ≥ 11, kaydırılmış çekimde yapışkan bant sızıntısı.
// Kullanım: node scripts/v307b-shots.mjs [--base http://localhost:8081]   (yerel test hesabı kurar, koşu sonunda siler)
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
const outDir = new URL('../docs/review/v2/screens/V3-07b/', import.meta.url)
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))
const MIN_FONT = 11
const REPLICA = '/replicas/guardiola_barcelona_2011'
const COMPOSE = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
const resetRateLimits = () => spawnSync('docker', ['compose', '-f', COMPOSE, 'exec', '-T', 'redis', 'sh', '-c', 'for k in $(redis-cli --scan --pattern "fc:ratelimit:*"); do redis-cli del $k >/dev/null; done'], { encoding: 'utf8' })

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  return text ? JSON.parse(text).data : undefined
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'kapı Crewe', budgetEur: 5_000_000 })
const squadSize = (await api('GET', `/careers/${career.id}/squad`))?.length ?? 0

// UT dolu kadro: 4-3-3'e katalogdan mevki başına en iyi oyuncular (q17 ile aynı yöntem).
const formations = (await (await fetch(`${base}/api/v1/formations`)).json()).data
const f433 = formations.find((f) => f.id === '4-3-3') ?? formations[0]
const used = new Set()
const utPicked = {}
for (const slot of f433.slots) {
  await new Promise((r) => setTimeout(r, 400))
  const items = (await (await fetch(`${base}/api/v1/players?pos=${slot.position}&sort=overall&order=desc&size=14&gender=0`)).json()).data.items
  const p = items.find((i) => !used.has(i.id))
  used.add(p.id)
  utPicked[slot.slotId] = { key: `p:${p.id}`, source: 'catalog', name: p.name, rating: p.overall, positions: p.positions, club: p.club, league: p.league, nationality: p.nationality, playerId: p.id, faceStats: p.faceStats, faceLabels: p.faceLabels, faceStatsSource: p.faceStatsSource, faceStatsApproximate: p.faceStatsApproximate }
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []

async function newPage(w, h, theme, { auth, mode, ut }) {
  const context = await browser.newContext({ viewport: { width: w, height: h } })
  await context.addInitScript(({ t, s, c, m, u }) => {
    localStorage.setItem('fc.theme', t)
    localStorage.setItem('fc.mode', m)
    if (u) {
      localStorage.setItem('fc.utSquad', JSON.stringify(u))
    }
    if (s) {
      localStorage.setItem('fc.career', String(c))
      localStorage.setItem('fc.access', s.accessToken)
      localStorage.setItem('fc.refresh', s.refreshToken)
    }
  }, { t: theme, s: auth ? session : null, c: career.id, m: mode, u: ut ?? null })
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
  page.on('pageerror', (e) => !e.message.includes("reading 'classList'") && problems.push(`pageerror: ${e.message.slice(0, 160)}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
  return { context, page, problems }
}

for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  const mobile = w < 820
  for (const theme of ['dark', 'light']) {
    resetRateLimits()
    session = await login()
    const shoot = async (ctx, name, extra = {}) => {
      const { page, problems } = ctx
      await page.waitForTimeout(450)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), fullPage: false })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`),
        axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))), problems: [...problems],
        text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
      problems.length = 0
    }
    const scrolled = async (ctx, name, y = 700) => {
      await ctx.page.evaluate((top) => window.scrollTo(0, top), y)
      await shoot(ctx, `${name}-kaydirilmis`, { band: await ctx.page.evaluate(stickyBand, ['header']) })
      await ctx.page.evaluate(() => window.scrollTo(0, 0))
    }
    const go = async (ctx, path) => {
      resetRateLimits()
      await ctx.page.goto(`${base}${path}${path.includes('?') ? '&' : '?'}ui=v3`, { waitUntil: 'networkidle' })
      await ctx.page.locator('main h1').first().waitFor({ state: 'attached', timeout: 20000 })
      await ctx.page.waitForTimeout(300)
    }
    const pitchReady = async (ctx, filled) => {
      await ctx.page.locator('[data-pitch-slot]').first().waitFor({ timeout: 20000 })
      if (filled) {
        await ctx.page.locator('[data-pitch-slot][aria-label*=", "]').first().waitFor({ timeout: 20000 })
      }
      await ctx.page.waitForLoadState('networkidle')
    }

    // Kariyer /squad
    const car = await newPage(w, h, theme, { auth: true, mode: 'career' })
    await go(car, '/squad')
    await pitchReady(car, true)
    await shoot(car, 'kadro-dolu')
    await scrolled(car, 'kadro-dolu')
    await go(car, '/squad?sekme=oyuncular')
    await car.page.getByRole('heading', { name: /Oyuncular ·/ }).waitFor()
    await shoot(car, 'kadro-oyuncular-liste')
    await scrolled(car, 'kadro-oyuncular-liste')
    await car.page.getByRole('radio', { name: 'Kartlar' }).click()
    await shoot(car, 'kadro-oyuncular-kartlar')
    await car.page.getByRole('button', { name: 'Sat', exact: true }).first().click()
    await car.page.getByRole('dialog').waitFor()
    await shoot(car, 'kadro-satis-diyalog')
    await car.page.keyboard.press('Escape')
    await go(car, '/squad?sekme=hareketler')
    await car.page.getByRole('heading', { name: 'Transfer piyasası' }).waitFor()
    await shoot(car, 'kadro-hareketler')
    await go(car, '/squad?sekme=kariyer')
    await car.page.getByRole('heading', { name: 'Kariyer ayarları' }).waitFor()
    await shoot(car, 'kadro-kariyer')

    // Kariyer kurucu
    await go(car, '/squad/builder')
    await pitchReady(car, true)
    await shoot(car, 'kurucu-kariyer-dolu')
    await scrolled(car, 'kurucu-kariyer-dolu')
    await car.page.getByRole('button', { name: 'Oyuna Aktar' }).first().waitFor()
    await car.page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent === 'Oyuna Aktar' && !b.disabled), undefined, { timeout: 20000 })
    await car.page.getByRole('button', { name: 'Oyuna Aktar' }).first().click()
    await car.page.getByRole('dialog', { name: 'Oyuna aktar' }).waitFor()
    await shoot(car, 'taktik-kodu-diyalog-kariyer')
    await car.page.keyboard.press('Escape')
    await car.page.locator('[data-pitch-slot]').first().click()
    await car.page.getByRole(mobile ? 'dialog' : 'complementary').first().waitFor()
    await car.page.waitForLoadState('networkidle')
    await shoot(car, `oyuncu-sec-${mobile ? 'sheet' : 'panel'}-kariyer`)
    await car.context.close()

    // Boş kariyer kadrosu (fikstür: yalnız bu tarayıcıda kadro boş döner)
    const empty = await newPage(w, h, theme, { auth: true, mode: 'career' })
    await empty.page.route(`**/api/v1/careers/${career.id}/squad`, (route) => route.request().method() === 'GET' ? route.fulfill({ json: { success: true, data: [] } }) : route.continue())
    await go(empty, '/squad')
    await empty.page.getByText(/en az 11 oyuncu/).waitFor()
    await shoot(empty, 'kadro-bos', { fixture: 'kadro = []' })
    await empty.context.close()

    // Boş kurucu (anonim)
    const anon = await newPage(w, h, theme, { auth: false, mode: 'career' })
    await go(anon, '/squad/builder')
    await pitchReady(anon, false)
    await shoot(anon, 'kurucu-kariyer-bos')
    await anon.context.close()

    // UT
    const utEmpty = await newPage(w, h, theme, { auth: true, mode: 'ut' })
    await go(utEmpty, '/ut/squad')
    await pitchReady(utEmpty, false)
    await shoot(utEmpty, 'ut-bos')
    await utEmpty.context.close()
    const ut = await newPage(w, h, theme, { auth: true, mode: 'ut', ut: { formationId: f433.id, setup: { buildUp: 'Balanced', depth: 55 }, picked: utPicked, roleOverride: {}, origin: 'manual' } })
    await go(ut, '/ut/squad')
    await pitchReady(ut, true)
    await shoot(ut, 'ut-dolu')
    await scrolled(ut, 'ut-dolu')
    await ut.page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent === 'Oyuna Aktar' && !b.disabled), undefined, { timeout: 20000 })
    await ut.page.getByRole('button', { name: 'Oyuna Aktar' }).first().click()
    await ut.page.getByRole('dialog', { name: 'Oyuna aktar' }).waitFor()
    await shoot(ut, 'taktik-kodu-diyalog-ut')
    await ut.page.keyboard.press('Escape')
    await ut.page.locator('[data-pitch-slot]').first().click()
    await ut.page.getByRole(mobile ? 'dialog' : 'complementary').first().waitFor()
    await ut.page.waitForLoadState('networkidle')
    await shoot(ut, `kart-sec-${mobile ? 'sheet' : 'panel'}-ut`)
    await ut.context.close()

    // Sihirbaz: 5 adım + sonuç
    const wiz = await newPage(w, h, theme, { auth: true, mode: 'career' })
    await go(wiz, '/tactics/wizard')
    for (let step = 1; step <= 6; step++) {
      if (step === 6) {
        await wiz.page.getByRole('list', { name: 'Sana en yakın taktikler' }).waitFor({ timeout: 20000 })
        await wiz.page.waitForLoadState('networkidle')
      } else {
        // Kabukta da bir radyo grubu var (mod seçici): sihirbaz paneliyle sınırla.
        const panel = wiz.page.locator('section[aria-labelledby="wizard-question"]')
        await panel.getByRole('radiogroup').waitFor()
        await panel.getByRole('radio').nth(step % 2).check({ force: true })
      }
      await shoot(wiz, step === 6 ? 'sihirbaz-sonuc' : `sihirbaz-adim-${step}`)
      if (step < 6) {
        await wiz.page.getByRole('button', { name: 'İleri' }).click()
      }
    }
    await scrolled(wiz, 'sihirbaz-sonuc', 500)
    await wiz.context.close()

    // Replika regresyonu: uygula sekmesi (kariyer) + UT'de oyuncu öner diyaloğu (AppDialog)
    const rep = await newPage(w, h, theme, { auth: true, mode: 'career' })
    await go(rep, `${REPLICA}?sekme=uygula`)
    await rep.page.getByRole('list', { name: 'Slot atamaları' }).waitFor({ timeout: 20000 })
    await shoot(rep, 'replika-uygula-kariyer')
    await rep.context.close()
    const repUt = await newPage(w, h, theme, { auth: true, mode: 'ut' })
    // Az sayıda kulüp kartı (yalnız bu tarayıcının IndexedDB'si): kalan slotlar boş kalır ve "öner" düğmesi çıkar (rep-shots ile aynı tohum yöntemi).
    await repUt.page.goto(`${base}/?ui=v3`, { waitUntil: 'networkidle' })
    await repUt.page.evaluate(async (value) => {
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
    }, { cards: Object.values(utPicked).slice(0, 4).map((c) => ({ ...c, key: `c:${c.playerId}`, source: 'club' })), importedAt: new Date().toISOString() })
    await go(repUt, `${REPLICA}?sekme=uygula`)
    await repUt.page.getByRole('list', { name: 'Slot atamaları' }).waitFor({ timeout: 20000 })
    const suggest = repUt.page.getByRole('button', { name: /için oyuncu öner/ }).first()
    if (await suggest.count()) {
      await suggest.click()
      await repUt.page.getByRole('dialog').waitFor()
      await repUt.page.waitForLoadState('networkidle')
      await shoot(repUt, 'replika-oyuncu-oner-diyalog-ut')
    } else {
      report.push({ shot: `replika-oyuncu-oner-diyalog-ut-${theme}-${w}`, skipped: 'öneri düğmesi yok (tüm slotlar dolu)', problems: [] })
    }
    await repUt.context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ career: { squadSize }, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0) || (r.band && (!r.band.ok || r.band.surfaces.some((s) => s.alpha < 1))))
console.log(`kariyer kadrosu ${squadSize} oyuncu; ${report.length} çekim; sorunlu ${bad.length}; atlanan ${report.filter((r) => r.skipped).length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r).slice(0, 700)))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(` · sayfa minFont: en küçük ${Math.min(...mins)}px`)
process.exitCode = bad.length ? 1 : 0
