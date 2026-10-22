// V3-05a ekran kapıları: UT kart veritabanı (ızgara, kaydırılmış ızgara, filtreli, tablo, mobil sheet, boş durum) 375/768/1280 × koyu/açık; axe + taşma + konsol/ağ.
// V3-05b-b ölçümleri: ızgara kartlarında en küçük yazı / OVR / soyad (Q18); 1.200px kaydırılmış ızgarada yapışkan filtre çubuğu örtmesi (Q5, ≥820px).
// Kullanım: node scripts/card-db-shots.mjs [--base http://localhost:8081]   (oturum gerekmez: /players herkese açık)
// Çıktı: docs/review/v2/screens/V3-05a/*.png ve gates-report.json
// Hız sınırı backend belleğinde (OPS-02, Redis yok): koşu 429 alırsa backend'i yeniden başlat (docker compose restart backend).
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { cardMinFont, pageMinFont, stickyBand, stickyCover } from './lib/readability.mjs'

// V3-05b-c: sayfa geneli en küçük görünür yazı (≥ 11px) her çekimde; kaydırılmış ızgara/tabloda yapışkan üst başlık + filtre çubuğu
// (+ ≥820px tablo başlığı) bandında içerik görünmez (elementFromPoint).
const MIN_FONT = 11
const BAND = ['header', 'section[aria-label="Süzgeçler"]', 'thead']

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const out = new URL('../docs/review/v2/screens/V3-05a/', import.meta.url)
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []

async function record(page, problems, name, extra = {}) {
  await page.waitForTimeout(500)
  await page.screenshot({ path: file(name) })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  const axe = await new AxeBuilder({ page }).analyze()
  const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
  report.push({ shot: name, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`), problems: [...problems], text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
  problems.length = 0
}

for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    await context.addInitScript((t) => { localStorage.setItem('fc.theme', t); localStorage.setItem('fc.mode', 'ut') }, theme)
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    const open = async (path, ready) => {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
      await ready(page)
    }
    await open('/players?ui=v3', (p) => p.getByRole('status').filter({ hasText: 'kart' }).first().waitFor())
    await record(page, problems, `izgara-${theme}-${w}.png`, { card: await page.evaluate(cardMinFont, 'main') })
    // Kaydırılmış ızgara: kartlar yapışkan filtre çubuğunun (≥820px) altından geçer.
    await page.evaluate(() => window.scrollTo(0, 1200))
    await page.waitForTimeout(400)
    await record(page, problems, `izgara-kaydirilmis-${theme}-${w}.png`, { card: await page.evaluate(cardMinFont, 'main'), sticky: await page.evaluate(stickyCover, 'section[aria-label="Süzgeçler"]'), band: await page.evaluate(stickyBand, BAND), bottomNav: w < 820 ? await page.evaluate(stickyCover, 'nav[aria-label="Mobil menü"]') : undefined, grid: await page.evaluate(() => ({ cols: getComputedStyle(document.querySelector('main ul.grid')).gridTemplateColumns.split(' ').length, cardWidth: Math.round(document.querySelector('main ul.grid [role="img"]').getBoundingClientRect().width) })) })
    await open('/players?mevki=ST&ovrmin=88&ui=v3', (p) => p.getByRole('status').filter({ hasText: 'kart' }).first().waitFor())
    await record(page, problems, `izgara-filtreli-${theme}-${w}.png`)
    await open('/players?gorunum=table&ui=v3', (p) => p.getByRole('table').waitFor())
    await record(page, problems, `tablo-${theme}-${w}.png`)
    await page.evaluate(() => window.scrollTo(0, 1200))
    await page.waitForTimeout(400)
    await record(page, problems, `tablo-kaydirilmis-${theme}-${w}.png`, { band: await page.evaluate(stickyBand, BAND) })
    await open('/players?ara=zzzzqqq&ui=v3', (p) => p.getByText('Bu süzgeçlere uyan kart yok.').waitFor())
    await record(page, problems, `bos-${theme}-${w}.png`)
    if (w < 820) {
      await open('/players?ui=v3', (p) => p.getByRole('button', { name: /Filtreler/ }).waitFor())
      await page.getByRole('button', { name: /Filtreler/ }).click()
      await page.getByRole('dialog', { name: 'Filtreler' }).waitFor()
      await record(page, problems, `mobil-sheet-${theme}-${w}.png`)
    } else {
      await open('/players?ui=v3', (p) => p.getByText('Daha fazla filtre').waitFor())
      await page.getByText('Daha fazla filtre').click()
      await record(page, problems, `gelismis-${theme}-${w}.png`)
    }
    // karşılaştırma tepsisi: boşken yok; bir kart eklenince çıkar; masaüstünde içeriği kapatmaz, mobilde küçük düğme
    await open('/players?ui=v3', (p) => p.getByRole('status').filter({ hasText: 'kart' }).first().waitFor())
    const trayBefore = await page.locator('[aria-label="Karşılaştırma"], [data-compare-spacer]').count() + await page.getByRole('button', { name: /^Karşılaştır [(]/ }).count()
    await page.getByRole('button', { name: 'Karşılaştırmaya ekle' }).first().click()
    await page.waitForTimeout(300)
    if (w >= 820) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await page.waitForTimeout(300)
      const geo = await page.evaluate(() => {
        const tray = document.querySelector('section[aria-label="Karşılaştırma"]').getBoundingClientRect()
        const footer = document.querySelector('footer').getBoundingClientRect()
        return { trayTop: tray.top, footerBottom: footer.bottom }
      })
      report.push({ shot: `tepsi-geometri-${theme}-${w}`, trayBeforeCount: trayBefore, overlap: geo.footerBottom > geo.trayTop + 0.5, geo, overflow: false, axeSeriousCritical: 0, problems: [] })
    } else {
      const geo = await page.evaluate(() => {
        const fab = [...document.querySelectorAll('button')].find((b) => /^Karşılaştır [(]/.test(b.textContent.trim())).getBoundingClientRect()
        return { width: fab.width, height: fab.height, left: fab.left, viewport: window.innerWidth }
      })
      report.push({ shot: `tepsi-geometri-${theme}-${w}`, trayBeforeCount: trayBefore, fabSmall: geo.width < geo.viewport * 0.6, geo, overflow: false, axeSeriousCritical: 0, problems: [] })
    }
    await record(page, problems, `tepsi-${theme}-${w}.png`)
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(report, null, 2))
// Q5 yalnız yüzey gerçekten yapışkanken (≥820px) ve yapışık konumdayken; mobilde filtre çubuğu akışta kalır.
const stuck = (s) => s && s.found && s.position === 'sticky' && s.top <= 80
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || r.overlap || r.fabSmall === false || r.trayBeforeCount > 0
  || (r.card && r.card.cards > 0 && (r.card.minFontPx < 11 || r.card.ovrMinPx < 14 || r.card.surnamesVisible < r.card.cards))
  || (stuck(r.sticky) && !r.sticky.ok) || (r.band && !r.band.ok) || (r.text && r.text.belowCount > 0) || (r.bottomNav && !r.bottomNav.ok))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r)))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(` · sayfa minFont: en küçük ${Math.min(...mins)}px; hariç tutulan: ${JSON.stringify([...new Set(report.flatMap((r) => r.text?.excluded ?? []))])}`)
report.filter((r) => /-dark-/.test(r.shot) && (r.grid || r.band)).forEach((r) => console.log(' ·', r.shot, JSON.stringify({ grid: r.grid, card: r.card, bottomNav: r.bottomNav && { position: r.bottomNav.position, alpha: r.bottomNav.alpha, contentUnderneath: r.bottomNav.contentUnderneath }, band: r.band && { bandBottom: r.band.bandBottom, leakCount: r.band.leakCount, surfaces: r.band.surfaces } })))
