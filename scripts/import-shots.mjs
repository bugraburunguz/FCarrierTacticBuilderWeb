// HAR-01 ekran kapıları: /ut/import HAR içe aktarma — boş, özet (sentetik HAR, Web Worker'da ayrıştırılır), hata (bozuk dosya);
// 375/768/1280 × koyu/açık. Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, sayfa geneli minFont (≥ 11px).
// Sayfa oturum ister: oturum yalnız bu test tarayıcısında taklit edilir (sahte token + /me, /careers yanıtı); gerçek hesap açılmaz.
// Hiçbir şey gönderilmez (Gönder'e basılmaz); kurallar gerçek GET /ut/capture/rules ucundan.
// Kullanım: node scripts/import-shots.mjs [--base http://localhost:8081]   Çıktı: Claude outputs/screens/HAR-01/ (repo dışı)
// Hız sınırı backend belleğinde (OPS-02, Redis yok): koşu 429 alırsa backend'i yeniden başlat (docker compose restart backend).
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { pageMinFont } from './lib/readability.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
// V3-05c-b: yakalama bayrağı (VITE_CAPTURE_IMPORT) build'de kapalıysa sayfa yalnız durum notunu gösterir; betik bunu algılar,
// notu ve DevTools/HAR talimatının görünmediğini ölçer, çekimleri screens/V3-05c-b/import/ altına yazar.
// V3-05c-c: --source capture → uzantının "Dışa aktar" dosyası aynı akışta (varsayılan build'de; HAR bayrağı gerekmez), çekimler screens/V3-05c-c/import/.
const SOURCE = args.includes('--source') ? args[args.indexOf('--source') + 1] : 'har'
const SRC = SOURCE === 'capture'
  ? { heading: 'Yakalama dosyasından içe aktar', input: 'Yakalama dosyası', fixture: '../tests/fixtures/captures/sample-captures.json', broken: 'bozuk.json', error: 'geçerli bir JSON değil', out: ['V3-05c-c', 'import'] }
  : { heading: 'HAR dosyasından içe aktar', input: 'HAR dosyası', fixture: '../tests/fixtures/har/sample.har', broken: 'bozuk.har', error: 'geçerli bir HAR', out: ['HAR-01'] }
const OUT_ON = screensDir(...SRC.out)
const OUT_OFF = screensDir('V3-05c-b', 'import')
let out = OUT_ON
const file = (n) => {
  mkdirSync(out, { recursive: true })
  return fileURLToPath(new URL(n, out))
}
const BLOCKED = "EA, FC 27 Web App'te uzantıları ve geliştirici araçlarını engelliyor; kulüp ve SBC yakalama şu an kullanılamıyor."
const FIXTURE = fileURLToPath(new URL(SRC.fixture, import.meta.url))
const MIN_FONT = 11
const ME = { id: 990_000, email: 'kapi@example.test', subscriptionType: 'FREE', creditBalance: 0, dailyCreditLimit: 0, showAds: false, role: 'USER', emailVerified: true }
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    await context.addInitScript((t) => { localStorage.setItem('fc.theme', t); localStorage.setItem('fc.mode', 'ut'); localStorage.setItem('fc.access', 'kapi-sahte-token') }, theme)
    await context.route(/\/api\/v1\/me(\?|$)/, (r) => r.fulfill(ok(ME)))
    await context.route(/\/api\/v1\/careers(\?|$)/, (r) => r.fulfill(ok([])))
    // Gönderim olmamalı: yakalama uçlarına istek gelirse sorun olarak kaydedilir.
    const sent = []
    await context.route(/\/api\/v1\/ut\/(capture|contrib\/capture)$/, (r) => { sent.push(r.request().url()); return r.abort() })
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    const record = async (name, extra = {}) => {
      await page.waitForTimeout(300)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), fullPage: w < 820 })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`), problems: [...problems], sent: [...sent], text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
      problems.length = 0
    }
    await page.goto(`${base}/ut/import?ui=v3`, { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: new RegExp(`${SRC.heading}|Kulüp içe aktar`) }).first().waitFor()
    if (await page.getByText(BLOCKED).count() > 0) {
      out = OUT_OFF
      const leaked = await page.evaluate(() => /DevTools|Preserve log|Export HAR|Uzantı kimliği|HAR dosyası/.test(document.body.innerText))
      await record('kapali', { note: true, methodTextVisible: leaked })
      await context.close()
      continue
    }
    out = OUT_ON
    await record('bos')
    const section = page.locator('section', { has: page.getByRole('heading', { name: SRC.heading }) })
    const input = `input[aria-label="${SRC.input}"]`
    await page.setInputFiles(input, FIXTURE)
    const summary = section.getByRole('region', { name: 'Gönderilmeden önce özet' })
    const countsOf = () => summary.locator('dl > div').evaluateAll((rows) => Object.fromEntries(rows.map((r) => [r.querySelector('dt').textContent, Number(r.querySelector('dd').textContent)])))
    await summary.waitFor()
    await summary.scrollIntoViewIfNeeded()
    const counts = await countsOf()
    await page.evaluate(() => window.scrollTo(0, 0))
    await record('ozet', { counts })
    if (SOURCE === 'capture') {
      // Katkı hedefi: kişisel uçlar (kulüp) düşer, satıcı alanları silinir; özet yeniden hesaplanır.
      await section.getByRole('radio', { name: 'Bilgi tabanına katkı' }).click()
      await summary.waitFor()
      await summary.scrollIntoViewIfNeeded()
      await record('katki', { counts: await countsOf() })
    }
    await page.setInputFiles(input, { name: SRC.broken, mimeType: 'application/json', buffer: Buffer.from('{bozuk') })
    await section.getByRole('alert').filter({ hasText: SRC.error }).waitFor()
    await record('hata')
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(report, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || r.sent.length || (r.text && r.text.belowCount > 0) || r.methodTextVisible)
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r)))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(` · sayfa minFont: en küçük ${Math.min(...mins)}px; hariç tutulan: ${JSON.stringify([...new Set(report.flatMap((r) => r.text?.excluded ?? []))])}`)
console.log(' · özet sayıları:', JSON.stringify(report.find((r) => r.counts)?.counts))
const contrib = report.find((r) => r.shot.startsWith('katki'))
if (contrib) console.log(' · katkı özeti:', JSON.stringify(contrib.counts))
