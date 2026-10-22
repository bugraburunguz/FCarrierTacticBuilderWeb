// V3-06c ekran kapıları: Transfer Merkezi (/career/transfer, kariyer modu, v3) — ihtiyaç seçili + adaylar, Tüm kadro, uzak ihtimaller açık, kısa liste dolu,
// satış planı (kaydırılmış), bütçe yok, boş aday durumu × 375/768/1280 × koyu/açık.
// Öneri ucu ücretli (kredi): her farklı istek (mevki, rol, uzak ihtimaller) gerçek uca BİR kez gider, sonraki çekimlerde yalnız bu tarayıcıda o gerçek yanıt
// yeniden oynatılır; kısa liste için koşu başında bir gerçek CB isteği; boş aday durumu fikstürdür (items: []). Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, sayfa minFont (≥ 11px), yapışkan bant sızıntısı + alfa 1.
// Veri: geçici test hesabı (yalnız localhost) + Crewe Alexandra kariyeri (bütçeli) ve bütçesiz ikinci kariyer; koşu sonunda yalnız bu hesap silinir.
// Kullanım: node scripts/transfer-shots.mjs [--base http://localhost:8081] [--out V3-06c/transfer]
// Hız sınırı backend belleğinde (OPS-02, Redis yok): koşu 429 alırsa backend'i yeniden başlat (docker compose restart backend).
import { AxeBuilder } from '@axe-core/playwright'
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
const out = new URL(`../docs/review/v2/screens/${args.includes('--out') ? args[args.indexOf('--out') + 1] : 'V3-06c/transfer'}/`, import.meta.url)
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))
const MIN_FONT = 11
const BAND = ['header']

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const headers = () => ({ authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' })
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : undefined }
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = (await api('POST', '/careers', { clubId: club.id, name: 'kapı Crewe', budgetEur: 5_000_000 })).body.data
const noBudget = (await api('POST', '/careers', { clubId: club.id, name: 'kapı bütçesiz' })).body.data
await api('GET', `/players?career=${career.id}&size=1`)
// Gerçek öneri yanıtı (tek ücretli istek): kadronun ilk mevkisi için, uzak ihtimaller dahil.
const squad = (await api('GET', `/careers/${career.id}/squad`)).body.data
const probePosition = 'CB'
const real = await api('POST', `/careers/${career.id}/recommendations`, { position: probePosition, limit: 10, includeLongShots: true, profile: 'BALANCED' })
if (real.status !== 200) {
  console.error('Öneri isteği başarısız', real.status)
  process.exit(1)
}
const recommendation = real.body
const items = recommendation.data.result.items
// Kısa liste dolu: iki gerçek aday, biri pazarlık tavanlı.
await api('PUT', `/careers/${career.id}/shortlist/${items[0].player.id}`, { note: 'CB · kapı', maxFeeEur: Math.round((items[0].player.valueEur ?? 1_000_000) * 0.9) })
await api('PUT', `/careers/${career.id}/shortlist/${items[1].player.id}`, { note: 'CB · kapı' })
const realResponses = new Map()
const emptyRecommendation = { ...recommendation, data: { ...recommendation.data, result: { ...recommendation.data.result, items: [], longShots: [] } } }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  const mobile = w < 820
  for (const theme of ['dark', 'light']) {
    session = await login()
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    let replay = recommendation
    // Seçili ihtiyacın gerçek yanıtı: (mevki, rol, uzak ihtimaller) başına gerçek uca BİR kez, sonra önbellekten (kredi: koşu başına birkaç istek).
    await page.route('**/api/v1/careers/*/recommendations', async (route) => {
      if (replay === emptyRecommendation) {
        return route.fulfill({ json: replay })
      }
      const body = route.request().postDataJSON()
      const key = `${body.position}|${body.roleId}|${body.includeLongShots}`
      if (!realResponses.has(key)) {
        const res = await route.fetch()
        realResponses.set(key, await res.json())
      }
      return route.fulfill({ json: realResponses.get(key) })
    })
    const prime = async (careerId) => {
      await context.clearCookies()
      await page.goto(`${base}/?ui=v3`)
      await page.evaluate(({ t, s, c }) => {
        localStorage.setItem('fc.theme', t)
        localStorage.setItem('fc.mode', 'career')
        localStorage.setItem('fc.career', String(c))
        localStorage.setItem('fc.access', s.accessToken)
        localStorage.setItem('fc.refresh', s.refreshToken)
      }, { t: theme, s: session, c: careerId })
    }
    const shoot = async (name, extra = {}, fullPage = mobile) => {
      await page.waitForTimeout(400)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), fullPage })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`),
        axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))), problems: [...problems], text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
      problems.length = 0
    }
    const open = async (query) => {
      await page.goto(`${base}/career/transfer?${query}${query ? '&' : ''}ui=v3`, { waitUntil: 'networkidle' })
      await page.getByRole('heading', { name: 'Transfer Merkezi' }).waitFor({ timeout: 20000 })
      await page.getByRole('region', { name: 'İhtiyaçlar' }).locator('button[aria-pressed], p, [role="status"]').first().waitFor({ timeout: 20000 })
      await page.waitForLoadState('networkidle')
    }
    const candidates = async () => {
      await page.getByRole('button', { name: /Önerileri getir/ }).click({ timeout: 20000 }).catch(async (e) => {
        await page.screenshot({ path: file(`HATA-${theme}-${w}.png`), fullPage: true })
        throw e
      })
      const confirm = page.getByRole('button', { name: /^Onayla/ })
      if (await confirm.isVisible().catch(() => false)) await confirm.click()
      await page.getByRole('region', { name: 'Öneriler' }).or(page.getByText('uygun oyuncu bulunamadı', { exact: false })).first().waitFor({ timeout: 20000 })
    }
    const needCount = () => page.getByRole('region', { name: 'İhtiyaçlar' }).locator('button[aria-pressed]').count()

    await prime(career.id)
    // Taze Crewe kadrosunda zayıf halka/derinlik açığı olmayabilir: varsayılan görünüm (boş ihtiyaç → "Tüm kadroyu göster") ayrıca çekilir.
    await open('')
    await shoot('varsayilan', { defaultNeeds: await needCount() })
    await open('kadro=tum')
    await candidates()
    await shoot('ihtiyac-secili-tum-kadro', { needs: await needCount(), candidates: await page.getByRole('region', { name: 'Öneriler' }).locator('li').count() })
    await open('kadro=tum&uzak=1')
    await candidates()
    await shoot('uzak-ihtimaller', { longShots: await page.getByRole('region', { name: 'Hayal transferler' }).count() })
    await open('')
    await page.getByRole('region', { name: /Kısa liste/ }).scrollIntoViewIfNeeded()
    await shoot('kisa-liste', { shortlist: await page.getByRole('region', { name: /Kısa liste/ }).locator('li').count() }, false)
    await page.getByRole('region', { name: 'Satış planı' }).scrollIntoViewIfNeeded()
    await page.getByText(/^Tut olarak kalanlar/).click()
    await shoot('satis-plani-kaydirilmis', { band: await page.evaluate(stickyBand, BAND), sellRows: await page.getByRole('region', { name: 'Satış planı' }).locator('tbody tr, li').count() }, false)
    replay = emptyRecommendation
    await open('kadro=tum')
    await candidates()
    await shoot('bos-aday', { fixture: 'aday listesi boş (yanıt yalnız bu tarayıcıda değiştirildi)' })
    replay = recommendation
    await prime(noBudget.id)
    await open('')
    await shoot('butce-yok', { budgetUnknown: await page.getByText('Bütçe girilmemiş', { exact: false }).count() })
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ careers: { budget: career.id, noBudget: noBudget.id }, squad: squad.length, probePosition, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0)
  || (r.band && (!r.band.ok || r.band.surfaces.some((s) => s.alpha < 1))) || r.needs === 0 || r.candidates === 0 || r.longShots === 0 || r.shortlist === 0 || r.sellRows === 0 || r.budgetUnknown === 0)
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r).slice(0, 600)))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(` · sayfa minFont: en küçük ${Math.min(...mins)}px`)
report.filter((r) => r.shot.endsWith('dark-1280')).forEach((r) => console.log(' ·', r.shot, JSON.stringify({ needs: r.needs, candidates: r.candidates, longShots: r.longShots, shortlist: r.shortlist, sellRows: r.sellRows, budgetUnknown: r.budgetUnknown })))
process.exitCode = bad.length ? 1 : 0
