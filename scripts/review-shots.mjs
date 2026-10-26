// REVIEW görsel kanıtı: hata durumları (Y4/Y5) ve satış diyaloğu para girişi (O2). 375/1280 × koyu.
// Hata durumları gerçek backend'i bozmadan, yalnız bu sayfanın isteği yakalanıp 500 döndürülerek üretilir.
// Kullanım: node scripts/review-shots.mjs --base http://localhost:5175 --set errors|money [--out <klasör>]   Varsayılan çıktı: Claude outputs/screens/REVIEW/ (repo dışı)
// Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir.
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d)
const base = arg('--base', 'http://localhost:8081')
const set = arg('--set', 'errors')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = arg('--out') ? resolve(arg('--out')) : fileURLToPath(screensDir('REVIEW'))
mkdirSync(outDir, { recursive: true })

await createGateAccount(base, 'gate-')
const session = (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
const careers = (await (await fetch(`${base}/api/v1/careers`, { headers: { authorization: `Bearer ${session.accessToken}` } })).json()).data
const careerId = careers[0].id

const fail = (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, error: [{ code: 'fc.exception.9999', message: 'test' }] }) })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 1280, h: 900 }]) {
  const context = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await context.newPage()
  await page.goto(`${base}/`)
  await page.evaluate(({ s, c }) => {
    localStorage.setItem('fc.theme', 'dark')
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.career', String(c))
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
  }, { s: session, c: careerId })
  const shoot = async (name, expectText) => {
    await page.getByText(expectText).first().waitFor({ timeout: 20000 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${outDir}/${name}-dark-${w}.png`, fullPage: true })
    report.push({ shot: `${name}-dark-${w}`, overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1) })
  }
  if (set === 'errors') {
    await page.route(/\/api\/v1\/careers\/\d+\/squad$/, fail)
    await page.goto(`${base}/career/dashboard`)
    await shoot('masa-kadro-hatasi', 'Kadro yüklenemedi.')
    await page.unroute(/\/api\/v1\/careers\/\d+\/squad$/)
    await page.route(/\/api\/v1\/careers(\?.*)?$/, fail)
    await page.goto(`${base}/career/dashboard`)
    await shoot('masa-kariyer-hatasi', 'Kariyerler yüklenemedi.')
    await page.unroute(/\/api\/v1\/careers(\?.*)?$/)
    await page.route(/\/api\/v1\/careers\/\d+\/shortlist$/, fail)
    await page.goto(`${base}/career/transfer`)
    await shoot('transfer-kisa-liste-hatasi', 'Kısa liste yüklenemedi.')
  } else {
    await page.goto(`${base}/career/squad?sekme=liste`)
    await page.getByRole('radio', { name: 'Kartlar' }).click()
    await page.getByRole('button', { name: 'Sat' }).first().waitFor()
    // Diyalog açılmadan önceki taşma: diyalogdan mı, sayfadan mı geldiğini ayırır.
    report.push({ shot: `kartlar-diyalogsuz-${w}`, overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), widest: await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).slice(-3).map((e) => `${e.tagName}.${String(e.className).slice(0, 60)} ${Math.round(e.getBoundingClientRect().right)}`)) })
    await page.getByRole('button', { name: 'Sat' }).first().click()
    const dialog = page.getByRole('dialog', { name: /Satış/ })
    await dialog.getByRole('textbox', { name: 'Gelen bedel' }).fill('2,5')
    await shoot('satis-bedel-gecerli', 'Satışı onayla')
    await dialog.getByRole('textbox', { name: 'Gelen bedel' }).fill('abc')
    await shoot('satis-bedel-gecersiz', 'Satışı onayla')
    report.push({ shot: `satis-onay-pasif-${w}`, disabled: await dialog.getByRole('button', { name: 'Satışı onayla' }).isDisabled() })
  }
  await context.close()
}
await browser.close()
writeFileSync(`${outDir}/report-${set}.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report))
