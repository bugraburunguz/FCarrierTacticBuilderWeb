// V3-05c ekran kapıları: SBC listesi (/ut/sbc, v3) — ızgara, kaydırılmış ızgara, Bitiyor sekmesi, boş, bilgi tabanı boş, mobil sheet;
// 375/768/1280 × koyu/açık. Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, sayfa geneli minFont (≥ 11px), ödül kartı içi minFont,
// kaydırılmışta yapışkan üst başlık + filtre çubuğu bandında içerik görünmez (elementFromPoint) ve alfa 1.
// Veri: tests/fixtures/sbcFixture.ts (yerel DB'ye yazılmaz); API yanıtları yalnız bu test tarayıcısında Playwright route ile değiştirilir.
// Oy yüzdesi oturum ister: oturum yalnız tarayıcıda taklit edilir (sahte token + /me ve /ut/sbc/votes yanıtı); gerçek hesap açılmaz.
// Kullanım: node scripts/sbc-shots.mjs [--base http://localhost:8081]   Çıktı: Claude outputs/screens/V3-05c/ (repo dışı)
// Hız sınırı backend belleğinde (OPS-02, Redis yok): koşu 429 alırsa backend'i yeniden başlat (docker compose restart backend).
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { EA_REWARD, EA_REWARD_NAME, sbcAssetNamesFixture, sbcFixture, sbcRewardItemsFixture, sbcVotesFixture } from '../tests/fixtures/sbcFixture.ts'
import { cardMinFont, pageMinFont, stickyBand } from './lib/readability.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const out = screensDir('V3-05c')
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))
const MIN_FONT = 11
const BAND = ['header', 'section[aria-label="Süzgeçler"]']
const ME = { id: 990_000, email: 'kapi@example.test', subscriptionType: 'FREE', creditBalance: 0, dailyCreditLimit: 0, showAds: false, role: 'USER', emailVerified: true }
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    await context.addInitScript((t) => { localStorage.setItem('fc.theme', t); localStorage.setItem('fc.mode', 'ut'); localStorage.setItem('fc.access', 'kapi-sahte-token') }, theme)
    let empty = false
    await context.route(/\/api\/v1\/me(\?|$)/, (r) => r.fulfill(ok(ME)))
    // Taklit oturumun kabuğu kariyer listesini de ister (UT modunda boş liste yeterli).
    await context.route(/\/api\/v1\/careers(\?|$)/, (r) => r.fulfill(ok([])))
    await context.route(/\/api\/v1\/ut\/sbc\/votes(\?|$)/, (r) => r.fulfill(ok(sbcVotesFixture())))
    await context.route(/\/api\/v1\/ut\/kb\/sbc(\?|$)/, (r) => r.fulfill(ok(empty ? [] : sbcFixture(Date.now()))))
    await context.route(/\/api\/v1\/ut\/kb\/items\?/, (r) => r.fulfill(ok(sbcRewardItemsFixture(new URL(r.request().url()).searchParams.getAll('resource').map(Number)))))
    // V3-05c-c: EA verisinden çizilen ödül kartının adı (assetId → katalog)
    await context.route(/\/api\/v1\/players\/assets\?/, (r) => r.fulfill(ok(sbcAssetNamesFixture(new URL(r.request().url()).searchParams.getAll('id').map(Number)))))
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    const record = async (name, extra = {}, fullPage = false) => {
      await page.waitForTimeout(400)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), fullPage })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`), problems: [...problems], text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
      problems.length = 0
    }
    const open = async (query, ready) => {
      await page.goto(`${base}/ut/sbc?${query}${query ? '&' : ''}ui=v3`, { waitUntil: 'networkidle' })
      await ready()
    }
    const gridReady = () => page.getByRole('list', { name: 'SBC setleri' }).waitFor()

    await open('', gridReady)
    // Ödül kartı içi yazı: kart görünür alana kaydırılıp ölçülür, çekim sayfanın başından alınır.
    await page.getByRole('img', { name: /^Erling Haaland, 93/ }).scrollIntoViewIfNeeded()
    const card = await page.evaluate(cardMinFont, 'ul[aria-label="SBC setleri"]')
    await page.evaluate(() => window.scrollTo(0, 0))
    // V3-05c-b: aynı satırdaki kartların İÇERİK yüksekliği farkı (ızgara kartı satır boyunca uzatır; içerik = çocukların yüksekliği + aralıklar).
    const rows = await page.evaluate(() => {
      const byRow = new Map()
      for (const a of document.querySelectorAll('a[data-sbc-card]')) {
        const top = Math.round(a.getBoundingClientRect().top + window.scrollY)
        const kids = [...a.children]
        const gap = parseFloat(getComputedStyle(a).rowGap) || 0
        const content = kids.reduce((n, k) => n + k.getBoundingClientRect().height, 0) + gap * (kids.length - 1)
        byRow.set(top, [...(byRow.get(top) ?? []), content])
      }
      return [...byRow.values()].map((hs) => Math.round(Math.max(...hs) - Math.min(...hs)))
    })
    const eaCard = await page.getByRole('img', { name: new RegExp(`^${EA_REWARD_NAME}, ${EA_REWARD.rating}, ${EA_REWARD.preferredPosition}`) }).count()
    await record('izgara', { eaRewardCard: eaCard, rowContentDiffMax: Math.max(0, ...rows), cards: await page.evaluate(() => document.querySelectorAll('ul[aria-label="SBC setleri"] > li').length), card, votesShown: await page.getByText(/^%\d+$/).count() })
    await page.evaluate(() => window.scrollTo(0, 1200))
    await record('izgara-kaydirilmis', { band: await page.evaluate(stickyBand, BAND) })
    await open('sekme=bitiyor', gridReady)
    await record('bitiyor', { cards: await page.evaluate(() => document.querySelectorAll('ul[aria-label="SBC setleri"] > li').length) })
    await open('kategori=Foundations&ara=zzz', () => page.getByText('Bu kategoride aktif SBC yok.').waitFor())
    await record('bos')
    empty = true
    await open('', () => page.getByText(/Uzantı açıkken Web App'te SBC sekmesini aç/).waitFor())
    await record('kb-bos')
    empty = false
    if (w < 820) {
      await open('', gridReady)
      await page.getByRole('button', { name: /Filtreler/ }).click()
      await page.getByRole('dialog', { name: 'Filtreler' }).waitFor()
      await record('mobil-sheet')
    }
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(report, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0) || r.eaRewardCard === 0
  || (r.card && r.card.cards > 0 && (r.card.minFontPx < 11 || r.card.ovrMinPx < 14)) || (r.band && (!r.band.ok || r.band.surfaces.some((s) => s.alpha < 1)))
  || (r.shot.endsWith('-1280') && r.rowContentDiffMax > 24))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r)))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(` · sayfa minFont: en küçük ${Math.min(...mins)}px; hariç tutulan: ${JSON.stringify([...new Set(report.flatMap((r) => r.text?.excluded ?? []))])}`)
report.filter((r) => /^(izgara|izgara-kaydirilmis|bitiyor)-dark/.test(r.shot)).forEach((r) => console.log(' ·', r.shot, JSON.stringify({ cards: r.cards, votesShown: r.votesShown, rowContentDiffMax: r.rowContentDiffMax, card: r.card, band: r.band && { bandBottom: r.band.bandBottom, leakCount: r.band.leakCount, surfaces: r.band.surfaces } })))
