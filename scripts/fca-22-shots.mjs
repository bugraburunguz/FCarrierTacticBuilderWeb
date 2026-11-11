// FCA-22 kapıları: kariyer oyuncu sayfası "Maçlar" sekmesi ve Kadro listesi form sütunları; 375 + 1280, yalnız koyu.
// Yerel backend maç uçlarını taşımıyorsa (404) gerçek koşu boş durumu gösterir; "ornek" koşularında yalnız bu iki uç tarayıcıda örnek veriyle
// yanıtlanır (page.route), başka istek değişmez. Ölçüm: taşma, axe serious/critical, konsol hatası, ağ 4xx-5xx (maç uçlarının 404'ü ayrı sayılır).
// Kullanım: node scripts/fca-22-shots.mjs [--base http://localhost:4173]. Yalnız localhost; test hesabı koşu sonunda silinir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:4173'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = screensDir('FCA-22')
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
const career = await api('POST', '/careers', { clubId: club.id, name: 'FCA-22 kapı', budgetEur: 5_000_000 })
await api('PATCH', `/careers/${career.id}`, { gameDate: '2027-03-10' })
const squad = await api('GET', `/careers/${career.id}/squad`)
const firstPlayer = squad[0]?.player.id

const MATCH_ENDPOINTS = /\/careers\/\d+\/(players\/\d+\/matches|squad\/form)(\?|$)/
const sampleMatches = {
  ratings: Array.from({ length: 14 }, (_, i) => ({ date: new Date(Date.UTC(2027, 2, 6 - i * 7)).toISOString().slice(0, 10), minutes: i % 4 === 3 ? 64 : 90, position: i % 5 === 2 ? 28 : 25, rating: [8, 7, 6, 9, 7, 5, 8, 7, 7, 6, 8, 9, 6, 7][i] })),
  seasons: [
    { teamId: 1, teamName: club.name, competitionId: 1512, appearances: 24, goals: 9, assists: 4, averageRating: 7.21, yellowCards: 3, redCards: 0, cleanSheets: 0 },
    { teamId: 1, teamName: club.name, competitionId: 1610, appearances: 3, goals: 1, assists: 1, averageRating: 6.67, yellowCards: 0, redCards: 0, cleanSheets: 0 },
    { teamId: 99, teamName: 'Kiralık kulüp', competitionId: 1513, appearances: 5, goals: 0, assists: 1, averageRating: null, yellowCards: 1, redCards: 1, cleanSheets: 2 },
  ],
}
const sampleForm = squad.map((s, i) => ({ playerId: s.player.id, playerName: s.player.name, lastRatings: i % 6 === 5 ? [] : [7, 8, 6, 9, 5].slice(0, 5 - (i % 3)), appearances: i % 6 === 5 ? 0 : 10 + i, goals: i % 4, assists: i % 3, averageRating: i % 6 === 5 ? null : 6.5 + (i % 5) / 4 }))

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
const RESOURCE_LINE = /^Failed to load resource:/
async function shot(name, path, w, sample, act = undefined) {
  const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 812 : 900 }, hasTouch: w < 768 })
  const page = await context.newPage()
  if (sample) {
    await page.route(MATCH_ENDPOINTS, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: /squad\/form/.test(route.request().url()) ? sampleForm : sampleMatches }) }))
  }
  const errors = []
  let missing = 0
  page.on('console', (m) => m.type() === 'error' && !RESOURCE_LINE.test(m.text()) && errors.push(m.text()))
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 400) {
      if (MATCH_ENDPOINTS.test(new URL(r.url()).pathname) && r.status() === 404) missing += 1
      else errors.push(`${r.status()} ${r.url()}`)
    }
  })
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
    await page.waitForTimeout(400)
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (overflow > 0) {
    // Tanı: ekranın sağından taşan en dıştaki öğeler (taşan alt ağacın kökü).
    const wide = await page.evaluate(() => [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !(el.parentElement && el.parentElement.getBoundingClientRect().right > window.innerWidth + 1))
      .slice(0, 4).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} w=${Math.round(el.getBoundingClientRect().width)}`))
    console.log(`taşan (${name} ${w}):`, wide.join(' || '))
  }
  const axe = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)
  await page.screenshot({ path: file(`${name}-${w}.png`), fullPage: false })
  await page.screenshot({ path: file(`${name}-${w}-tam.png`), fullPage: true })
  results.push({ name, w, overflow, axe, errors, missingEndpoint404: missing })
  await context.close()
}

for (const w of [375, 1280]) {
  await shot('oyuncu-maclar-gercek', `/players/${firstPlayer}?sekme=maclar`, w, false)
  await shot('oyuncu-maclar-ornek', `/players/${firstPlayer}?sekme=maclar`, w, true, async (page) => page.getByRole('table', { name: 'Sezon istatistiği' }).waitFor({ timeout: 10000 }))
  await shot('kadro-liste-gercek', '/career/squad?sekme=liste', w, false)
  await shot('kadro-liste-ornek', '/career/squad?sekme=liste', w, true, async (page) => page.locator('[data-col="form"] li:visible, [data-form-compact] li:visible').first().waitFor({ timeout: 10000 }))
}
await browser.close()

writeFileSync(file('gates.json'), JSON.stringify(results, null, 2))
for (const r of results) {
  console.log(`${r.name} ${r.w}: taşma ${r.overflow}px · axe ${r.axe.join(',') || 'temiz'} · hata ${r.errors.length}${r.errors.length ? ` (${r.errors.slice(0, 2).join(' | ')})` : ''} · maç ucu yok (404) ${r.missingEndpoint404}`)
}
process.exit(results.some((r) => r.overflow > 0 || r.axe.length > 0 || r.errors.length > 0) ? 1 : 0)
