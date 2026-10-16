// V3-07a ekran kapıları.
//  A) Envanter: App.tsx'teki her sayfa rotası 1280 koyu (girişli kapı hesabı; /ut/* UT modunda) → screens/V3-07a/envanter/.
//  B) Yeni sayfalar × 375/768/1280 × koyu/açık: giriş, kayıt, doğrulama (bağlantı eksik / geçersiz token), gizlilik, ana sayfa (kariyer anonim + girişli,
//     UT girişli), içe aktarma (boş; dolu ve hata durumları fikstür: yalnız bu tarayıcıda /me PREMIUM + /import yanıtı), yeni kariyer (boş, kulüp seçili),
//     profil (dolu, şifre hatası — gerçek 422). Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx (fikstür hata durumu hariç), minFont ≥ 11, bant.
// Kullanım: node scripts/v307a-shots.mjs [--base http://localhost:8081]
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
const dirOf = (sub) => {
  const url = new URL(`../docs/review/v2/screens/V3-07a/${sub}/`, import.meta.url)
  mkdirSync(url, { recursive: true })
  return (n) => fileURLToPath(new URL(n, url))
}
const invFile = dirOf('envanter')
const pageFile = dirOf('sayfalar')
const MIN_FONT = 11
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
const player = (await api('GET', `/players?career=${career.id}&size=1&sort=overall`)).items[0]
const replica = (await (await fetch(`${base}/api/v1/replicas`)).json()).data[0]
const sbcSet = ((await (await fetch(`${base}/api/v1/ut/kb/sbc?active=true`)).json()).data ?? [])[0]
const FIXTURE_SUMMARY = { players: 21620, teams: 841, unmatchedPlayers: 12, freeAgents: 310, guessedTeamId: 121, guessedTeamName: 'Crewe Alexandra', squadSynced: 27, warnings: ['NOT_IN_CAREER'] }

const ROUTES = ['/', '/about', '/login', '/register', '/verify-email', '/privacy', '/players', `/players/${player.id}`, '/compare', '/wonderkids', '/tactics/wizard', '/squad', '/squad/builder',
  '/replicas', `/replicas/${replica.id}`, '/career/import', '/career/desk', '/career/new', '/career/transfer', '/career/growth', '/teams', '/ut/players/231747', '/ut/squad', '/ut/meta',
  '/ut/sbc', ...(sbcSet ? [`/ut/sbc/${sbcSet.id}`] : []), '/ut/objectives', '/ut/club', '/ut/import', '/ut/evo', '/admin/ut', '/profile']

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
const inventory = []

async function newPage(w, h, theme, { auth, mode }) {
  const context = await browser.newContext({ viewport: { width: w, height: h } })
  await context.addInitScript(({ t, s, c, m }) => {
    localStorage.setItem('fc.theme', t)
    localStorage.setItem('fc.mode', m)
    if (s) {
      localStorage.setItem('fc.career', String(c))
      localStorage.setItem('fc.access', s.accessToken)
      localStorage.setItem('fc.refresh', s.refreshToken)
    }
  }, { t: theme, s: auth ? session : null, c: career.id, m: mode })
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
  return { context, page, problems }
}

// A) Envanter: 1280 koyu, girişli.
resetRateLimits()
session = await login()
for (const path of ROUTES) {
  const ut = path.startsWith('/ut/')
  const { context, page } = await newPage(1280, 900, 'dark', { auth: !['/login', '/register'].includes(path), mode: ut ? 'ut' : 'career' })
  await page.goto(`${base}${path}${path.includes('?') ? '&' : '?'}ui=v3`, { waitUntil: 'networkidle' }).catch(() => undefined)
  await page.waitForTimeout(800)
  const slug = path === '/' ? 'ana-sayfa' : path.slice(1).replace(/[/:]/g, '-')
  await page.screenshot({ path: invFile(`${slug}-dark-1280.png`) })
  inventory.push({ path, file: `${slug}-dark-1280.png`, h1: await page.locator('h1').first().textContent().catch(() => null) })
  await context.close()
}

// B) Yeni sayfalar.
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  const mobile = w < 820
  for (const theme of ['dark', 'light']) {
    resetRateLimits()
    session = await login()
    const shoot = async (ctx, name, extra = {}, allowProblems = false) => {
      const { page, problems } = ctx
      await page.waitForTimeout(400)
      await page.screenshot({ path: pageFile(`${name}-${theme}-${w}.png`), fullPage: mobile })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`),
        axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))), problems: allowProblems ? [] : [...problems], expectedProblems: allowProblems ? [...problems] : undefined,
        text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
      problems.length = 0
    }
    const go = async (ctx, path) => {
      await ctx.page.goto(`${base}${path}${path.includes('?') ? '&' : '?'}ui=v3`, { waitUntil: 'networkidle' })
      await ctx.page.locator('main h1').first().waitFor({ timeout: 20000 })
      await ctx.page.waitForTimeout(300)
    }

    // Anonim: hesap ekranları + ana sayfa tanıtımı.
    const anon = await newPage(w, h, theme, { auth: false, mode: 'career' })
    await go(anon, '/login')
    await shoot(anon, 'giris')
    await anon.page.getByLabel('E-posta').fill('yok@example.test')
    await anon.page.getByLabel('Şifre', { exact: true }).fill('yanlis-sifre-1')
    await anon.page.getByRole('button', { name: 'Giriş yap' }).click()
    await anon.page.getByRole('alert').waitFor()
    await shoot(anon, 'giris-hata', { expected: 'HTTP 401 (yanlış şifre)' }, true)
    await go(anon, '/register')
    await shoot(anon, 'kayit')
    await go(anon, '/verify-email')
    await shoot(anon, 'dogrulama-eksik')
    await go(anon, '/verify-email?token=gecersiz-token')
    await anon.page.getByRole('alert').waitFor({ timeout: 20000 })
    await shoot(anon, 'dogrulama-hata', { expected: 'HTTP 400 (geçersiz token)' }, true)
    await go(anon, '/privacy')
    await shoot(anon, 'gizlilik')
    await go(anon, '/')
    await shoot(anon, 'ana-sayfa-anonim')
    await anon.context.close()

    // Girişli: ana sayfa (kariyer + UT), içe aktarma, yeni kariyer, profil.
    const auth = await newPage(w, h, theme, { auth: true, mode: 'career' })
    await go(auth, '/')
    await auth.page.getByRole('region', { name: 'Kariyerine devam et' }).waitFor({ timeout: 20000 })
    await shoot(auth, 'ana-sayfa-kariyer')
    await go(auth, '/career/import')
    await shoot(auth, 'ice-aktarma-bos')
    await go(auth, '/career/new')
    await shoot(auth, 'yeni-kariyer-bos')
    await auth.page.getByLabel('Kulüp').fill('Crewe')
    await auth.page.getByRole('option', { name: /Crewe/ }).first().click()
    await shoot(auth, 'yeni-kariyer-kulup')
    await go(auth, '/profile')
    await shoot(auth, 'profil')
    const box = auth.page.getByRole('region', { name: 'Şifre değiştir' })
    await box.getByLabel('Mevcut şifre').fill('yanlis-sifre-1')
    await box.getByLabel(/Yeni şifre/).fill('yeni-sifre-12')
    await box.getByRole('button', { name: 'Şifreyi değiştir' }).click()
    await box.getByRole('alert').waitFor()
    await shoot(auth, 'profil-sifre-hata', { expected: 'HTTP 422 (mevcut şifre yanlış)' }, true)
    await auth.context.close()

    // Fikstür (yalnız bu tarayıcı): PREMIUM + içe aktarma sonucu / hatası.
    const fx = await newPage(w, h, theme, { auth: true, mode: 'career' })
    await fx.page.route('**/api/v1/me', async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      body.data.subscriptionType = 'PREMIUM'
      await route.fulfill({ response: res, json: body })
    })
    let failImport = false
    await fx.page.route('**/api/v1/careers/*/import', (route) => (failImport
      ? route.fulfill({ status: 422, json: { success: false, error: { code: 'fc.exception.0011', message: 'Dosya okunamadı: geçerli bir Live Editor log dosyası değil.' } } })
      : route.fulfill({ json: { success: true, data: FIXTURE_SUMMARY } })))
    await go(fx, '/career/import')
    await fx.page.locator('input[type=file]').first().setInputFiles({ name: 'live_editor_2026.log', mimeType: 'text/plain', buffer: Buffer.alloc(1536 * 1024, 120) })
    await fx.page.getByRole('button', { name: 'Yükle' }).click()
    await fx.page.getByRole('table', { name: 'Doğrulama sonucu' }).waitFor()
    await shoot(fx, 'ice-aktarma-sonuc', { fixture: 'PREMIUM + import özeti (NOT_IN_CAREER)' })
    failImport = true
    await go(fx, '/career/import')
    await fx.page.locator('input[type=file]').first().setInputFiles({ name: 'bozuk.log', mimeType: 'text/plain', buffer: Buffer.alloc(820 * 1024, 120) })
    await fx.page.getByRole('button', { name: 'Yükle' }).click()
    await fx.page.getByRole('alert').first().waitFor()
    await shoot(fx, 'ice-aktarma-hata', { fixture: 'PREMIUM + 422 import yanıtı', expected: 'HTTP 422 (fikstür)' }, true)
    await fx.context.close()

    const ut = await newPage(w, h, theme, { auth: true, mode: 'ut' })
    await go(ut, '/')
    await ut.page.getByRole('region', { name: "Bugünün SBC'leri" }).waitFor({ timeout: 20000 })
    await ut.page.waitForLoadState('networkidle')
    await shoot(ut, 'ana-sayfa-ut', { sbcCards: await ut.page.getByRole('region', { name: "Bugünün SBC'leri" }).locator('li').count() })
    await ut.page.evaluate(() => window.scrollTo(0, 600))
    await shoot(ut, 'ana-sayfa-ut-kaydirilmis', { band: await ut.page.evaluate(stickyBand, ['header']) }, false)
    await ut.context.close()
  }
}
await browser.close()
writeFileSync(pageFile('gates-report.json'), JSON.stringify({ inventory, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0) || (r.band && (!r.band.ok || r.band.surfaces.some((s) => s.alpha < 1))))
console.log(`envanter ${inventory.length} çekim; sayfalar ${report.length} çekim; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r).slice(0, 700)))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(` · sayfa minFont: en küçük ${Math.min(...mins)}px`)
report.filter((r) => r.expectedProblems?.length).slice(0, 4).forEach((r) => console.log(' · beklenen hata', r.shot, JSON.stringify(r.expectedProblems)))
process.exitCode = bad.length ? 1 : 0
