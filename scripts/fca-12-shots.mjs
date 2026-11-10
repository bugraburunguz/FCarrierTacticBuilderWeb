// FCA-12 kapıları: kariyer mobil görünümü (375 ve 320 px, yalnız koyu) + 1280 gerileme. Üretim derlemesi (vite preview, /api yerel yığına vekil).
// Ölçüm: yatay taşma, axe serious/critical, konsol hatası, ağ 4xx-5xx, 44 px altındaki dokunma hedefleri (yalnız mobil).
// Kullanım: node scripts/fca-12-shots.mjs [--base http://localhost:4173] [--tag once]. Yalnız localhost; test hesabı koşu sonunda silinir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d)
const base = arg('--base', 'http://localhost:4173')
const tag = arg('--tag', 'sonra')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = screensDir('FCA-12')
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))

await createGateAccount(base, 'gate-')
const session = (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  if (res.status >= 300) {
    throw new Error(`${method} ${path} → ${res.status}`)
  }
  return text ? JSON.parse(text).data : undefined
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'FCA-12 kapı', budgetEur: 5_000_000 })
await api('PATCH', `/careers/${career.id}`, { gameDate: '2027-09-19' })
const firstPlayer = (await api('GET', `/careers/${career.id}/squad`))[0]?.player.id

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
// Yerel backend imajı canlıdan eskiyse bu uçlar 404 döner (ortam, bu değişiklik değil); ayrı sayılır, kapıyı düşürmez.
const STALE_LOCAL = /\/me\/manager-profile|\/careers\/\d+\/(training|growth-recent)|\/recommendations\/reachable-leagues/
const RESOURCE_LINE = /^Failed to load resource:/
async function shot(name, path, w, act = undefined) {
  const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 812 : 900 }, hasTouch: w < 768 })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !RESOURCE_LINE.test(m.text()) && errors.push(m.text()))
  page.on('response', (r) => r.url().includes('/api/') && r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`))
  await page.goto(`${base}/`)
  await page.evaluate(({ c, s }) => {
    localStorage.setItem('fc.theme', 'dark')
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.career', String(c))
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
  }, { c: career.id, s: session })
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  if (act) {
    await act(page)
    await page.waitForTimeout(600)
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  // Görünür, etkileşimli öğelerden 44 px'ten küçük olanlar (yalnız mobil). Satır içi metin bağlantıları sayılmaz.
  const smallTargets = w < 768 ? await page.evaluate(() => {
    const els = [...document.querySelectorAll('a[href], button, [role="tab"], select, input:not([type="hidden"]), summary')]
    return els.filter((el) => {
      const r = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      if (r.width === 0 || r.height === 0 || style.visibility === 'hidden' || el.closest('[aria-hidden="true"]')) return false
      if (el.tagName === 'A' && style.display === 'inline' && el.closest('p, li')) return false
      return Math.min(r.width, r.height) < 44 - 0.5 && !(el.tagName === 'INPUT' && ['checkbox', 'radio'].includes(el.type) && el.closest('label'))
    }).map((el) => `${el.closest('header:not(main header), nav[aria-label="Mobil menü"], main > footer, [role="dialog"]') ? 'kabuk ' : ''}${el.tagName.toLowerCase()}${el.tagName === 'INPUT' ? `[${el.type} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}${el.closest('main') ? '' : ' main dışı'}]` : ''}:${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24)}`)
  }) : []
  const axe = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)
  await page.screenshot({ path: file(`${tag}-${name}-${w}-ekran.png`) })
  await page.screenshot({ path: file(`${tag}-${name}-${w}.png`), fullPage: true })
  results.push({ name, w, overflow, axe, smallTargets, errors: errors.filter((e) => !STALE_LOCAL.test(e)), staleLocal: errors.filter((e) => STALE_LOCAL.test(e)).length })
  await context.close()
}

const PAGES = [
  ['masa', '/career/dashboard'],
  ['kadro', '/career/squad'],
  ['kadro-liste', '/career/squad?sekme=liste'],
  ['taktik', '/career/tactics-lab'],
  ['transfer', '/career/transfer'],
  ['altyapi', '/career/academy'],
  ['gelisim', '/career/growth'],
  ['takimlar', '/teams'],
  ['oyuncular', '/players'],
  ['oyuncu-profili', `/players/${firstPlayer}?sekme=statlar`],
  ['menajer', '/career/manager'],
  ['yeni-kariyer', '/career/new'],
  ['kayit-yukle', '/career/import'],
]
for (const [name, path] of PAGES) {
  await shot(name, path, 375)
}
await shot('menu', '/career/dashboard', 375, async (page) => {
  await page.getByRole('navigation', { name: 'Mobil menü' }).getByRole('button').last().click()
  await page.getByRole('dialog').waitFor({ timeout: 5000 })
})
await shot('taktik-sifirdan', '/career/tactics-lab', 375, async (page) => {
  await page.getByRole('button', { name: /Sıfırdan kur/ }).click()
  await page.locator('[data-empty-slot]').first().waitFor({ timeout: 15000 })
})
await shot('masa', '/career/dashboard', 320)
await shot('kadro', '/career/squad', 320)
// Masaüstü gerileme: mobil değişiklik geniş ekrana sızmasın.
for (const [name, path] of [['masa', '/career/dashboard'], ['kadro', '/career/squad'], ['transfer', '/career/transfer']]) {
  await shot(name, path, 1280)
}
await browser.close()

writeFileSync(file(`${tag}-gates.json`), JSON.stringify(results, null, 2))
for (const r of results) {
  console.log(`${r.name} ${r.w}: taşma ${r.overflow}px · axe ${r.axe.join(',') || 'temiz'} · küçük hedef ${r.smallTargets.length}${r.smallTargets.length ? ` (${r.smallTargets.slice(0, 4).join(' | ')})` : ''} · hata ${r.errors.length} · eski yerel imaj 404 ${r.staleLocal}`)
}
// Parça 1 kapısı kabuktaki (üst çubuk, alt çubuk, sheet, alt bilgi) küçük hedefler; sayfa içi hedefler sonraki parçalarda sıfırlanır, şimdilik sayılır.
const shellSmall = (r) => r.smallTargets.filter((t) => t.startsWith('kabuk ')).length
const failed = results.some((r) => r.overflow > 0 || r.axe.length > 0 || r.errors.length > 0 || shellSmall(r) > 0)
process.exit(failed ? 1 : 0)
