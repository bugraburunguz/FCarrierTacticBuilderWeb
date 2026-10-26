// PROD-PREP ekran kapıları: Gizlilik, kayıt (onay kutusu), aydınlatma bandı, profil hesap silme akışı, beta etiketi, /about
// × 375/768/1280 × koyu/açık. Ölçüm: yatay taşma, axe serious/critical, konsol (CSP ihlali dahil) ve ağ 4xx/5xx, sayfa minFont ≥ 11.
// Bant ekranı için /me yanıtındaki privacyAckVersion yalnız bu tarayıcıda (page.route) kaldırılır: raporda "fixture".
// Beta etiketi için yığın FCAREER_FREE_BETA=true ile açılmış olmalı (betik /config/app'ten doğrular).
// Kullanım: node scripts/prodprep-shots.mjs [--base http://localhost:8081]   (yerel test hesabı kurar, sonunda yalnız kendisini siler)
// Hız sınırı backend belleğinde (OPS-02, Redis yok): koşu 429 alırsa backend'i yeniden başlat (docker compose restart backend).
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
const outDir = screensDir('PROD-PREP')
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))
const MIN_FONT = 11

const config = (await (await fetch(`${base}/api/v1/config/app`)).json()).data
await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()

// Güvenlik başlıkları (6d): sayfa ve API yanıtında.
const headerCheck = {}
for (const path of ['/', '/api/v1/config/app']) {
  const res = await fetch(`${base}${path}`)
  headerCheck[path] = Object.fromEntries(['content-security-policy', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'x-frame-options', 'strict-transport-security']
    .map((h) => [h, res.headers.get(h)]))
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []

async function newPage(w, h, theme, { auth = true, stripAck = false } = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h } })
  await context.addInitScript(({ t, s }) => {
    localStorage.setItem('fc.theme', t)
    localStorage.setItem('fc.mode', 'career')
    if (s) {
      localStorage.setItem('fc.access', s.accessToken)
      localStorage.setItem('fc.refresh', s.refreshToken)
    }
  }, { t: theme, s: auth ? session : null })
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => (m.type() === 'error' || /Content Security Policy/i.test(m.text())) && problems.push(`console: ${m.text().slice(0, 200)}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 160)}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
  if (stripAck) {
    await page.route('**/api/v1/me', async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      delete body.data.privacyAckVersion
      delete body.data.privacyAckAt
      await route.fulfill({ response: res, json: body })
    })
  }
  return { context, page, problems }
}

for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    session = await login()
    const shoot = async (ctx, name, extra = {}) => {
      const { page, problems } = ctx
      await page.waitForTimeout(450)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), fullPage: false })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`),
        axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))),
        problems: [...problems], text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
      problems.length = 0
    }
    const visit = async (path, name, opts = {}, after) => {
      const ctx = await newPage(w, h, theme, opts)
      await ctx.page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
      if (after) {
        await after(ctx.page)
      }
      await shoot(ctx, name, opts.stripAck ? { fixture: 'privacyAckVersion kaldırıldı (page.route)' } : {})
      await ctx.context.close()
    }

    await visit('/privacy', 'privacy', { auth: false })
    await visit('/register', 'register', { auth: false }, async (page) => {
      await page.getByRole('checkbox', { name: 'Aydınlatma metnini okudum.' }).waitFor()
    })
    await visit('/about', 'about', { auth: false })
    await visit('/', 'banner', { stripAck: true }, async (page) => {
      await page.getByRole('region', { name: 'Aydınlatma metni' }).waitFor()
    })
    await visit('/profile', 'profile', {}, async (page) => {
      await page.getByRole('region', { name: 'Hesabı sil' }).waitFor()
    })
    await visit('/profile', 'profile-delete', {}, async (page) => {
      await page.getByRole('button', { name: 'Hesabımı sil' }).click()
      const dialog = page.getByRole('dialog', { name: 'Hesabımı sil' })
      await dialog.waitFor()
      await dialog.getByLabel('Onay için e-postanı yaz').fill('yanlis@example.test')
    })
  }
}
await browser.close()

const failures = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0))
writeFileSync(file('gates.json'), JSON.stringify({ freeBeta: config.freeBeta, headerCheck, total: report.length, failures: failures.length, report }, null, 2))
console.log(`freeBeta=${config.freeBeta} ekran=${report.length} sorunlu=${failures.length}`)
for (const f of failures) {
  console.log(f.shot, JSON.stringify({ overflow: f.overflow, axe: f.axeNodes, problems: f.problems, text: f.text }).slice(0, 600))
}
console.log(JSON.stringify(headerCheck['/']).slice(0, 400))
