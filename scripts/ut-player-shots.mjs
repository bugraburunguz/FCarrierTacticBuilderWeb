// V3-05b ekran kapıları: UT oyuncu sayfası (4 sekme + kaydırılmış Statlar) 375/768/1280 × koyu/açık; axe + taşma + konsol/ağ. Oturum gerekmez.
// V3-05b-b ölçümleri: yapışkan versiyon şeridi örtmesi (Q5), sekme çubuğu üst kenarı (375×812 ≤ 640), kart genişliği ve kart içi en küçük yazı (Q18),
// stat etiketi kesilmesi. Mobil (<820) çekimler tam sayfa.
// Kullanım: node scripts/ut-player-shots.mjs [--base http://localhost:8081] [--asset 231747]   Çıktı: docs/review/v2/screens/V3-05b/
import { AxeBuilder } from '@axe-core/playwright'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { cardMinFont, labelClipping, stickyCover } from './lib/readability.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
const asset = args.includes('--asset') ? args[args.indexOf('--asset') + 1] : '231747'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const out = new URL('../docs/review/v2/screens/V3-05b/', import.meta.url)
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))
const COMPOSE = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
const resetRateLimits = () => spawnSync('docker', ['compose', '-f', COMPOSE, 'exec', '-T', 'redis', 'sh', '-c', 'for k in $(redis-cli --scan --pattern "fc:ratelimit:*"); do redis-cli del $k >/dev/null; done'], { encoding: 'utf8' })
const STRIP = 'section[aria-label="Kart"] > .glass-sticky'
const TAB_TOP_MAX = 640
const MOBILE_CARD_MAX = 200

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  const mobile = w < 820
  for (const theme of ['dark', 'light']) {
    resetRateLimits()
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    await context.addInitScript((t) => { localStorage.setItem('fc.theme', t); localStorage.setItem('fc.mode', 'ut') }, theme)
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    const shoot = async (name, extra = {}, fullPage = mobile) => {
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), fullPage })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`), problems: [...problems], ...extra })
      problems.length = 0
    }
    for (const [name, query, ready] of [
      ['statlar', '', 'Finishing'],
      ['roller', '?sekme=roller', 'Neden?'],
      ['fiyat', '?sekme=fiyat', 'Bu kart için fiyat kaydı yok'],
      ['alinis', '?sekme=alinis', 'nasıl alınacağına dair kayıt yok'],
    ]) {
      await page.goto(`${base}/ut/players/${asset}${query}${query ? '&' : '?'}ui=v3`, { waitUntil: 'networkidle' })
      await page.getByRole('heading', { level: 1 }).waitFor()
      if (name === 'statlar') await page.getByRole('tabpanel').getByText('Finishing', { exact: false }).first().or(page.getByRole('tabpanel').getByText('Bitiricilik').first()).waitFor()
      else await page.getByText(ready, { exact: false }).first().waitFor({ timeout: 20000 })
      await page.waitForTimeout(400)
      const layout = await page.evaluate(() => ({
        tabTop: Math.round(document.querySelector('[role="tablist"]').getBoundingClientRect().top),
        cardWidth: Math.round(document.querySelector('section[aria-label="Kart"] [role="img"]').getBoundingClientRect().width),
      }))
      const extra = { ...layout, card: await page.evaluate(cardMinFont, 'section[aria-label="Kart"]') }
      if (w === 375) extra.tabTopOk = layout.tabTop <= TAB_TOP_MAX
      if (mobile) extra.cardWidthOk = layout.cardWidth <= MOBILE_CARD_MAX
      if (name === 'statlar') extra.labels = await page.evaluate(labelClipping, '[role="tabpanel"]')
      await shoot(name, extra)
      if (name === 'statlar') {
        // Kaydırılmış durum: şerit yapışık konumuna (top-14) gelene kadar + 40px; mobilde kartın altı şeridin arkasına girer.
        // Masaüstünde kart sütunu bütünüyle yapışkan: Statlar içeriği 600px kaydırılır.
        await page.evaluate(({ sel, mobile }) => {
          const strip = document.querySelector(sel).getBoundingClientRect()
          window.scrollTo(0, mobile ? Math.round(window.scrollY + strip.top - 56 + 40) : 600)
        }, { sel: STRIP, mobile })
        await page.waitForTimeout(300)
        await shoot('statlar-kaydirilmis', { sticky: await page.evaluate(stickyCover, STRIP) }, false)
      }
    }
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify(report, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || r.tabTopOk === false || r.cardWidthOk === false
  || (r.card && r.card.cards > 0 && (r.card.minFontPx < 11 || r.card.ovrMinPx < 14 || r.card.surnamesVisible === 0))
  || (r.labels && r.labels.clipped.length > 0) || (r.sticky && r.sticky.position === 'sticky' && !r.sticky.ok))
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r)))
report.filter((r) => r.shot.startsWith('statlar-dark') || r.shot.startsWith('statlar-kaydirilmis-dark')).forEach((r) => console.log(' ·', r.shot, JSON.stringify({ tabTop: r.tabTop, cardWidth: r.cardWidth, card: r.card, labels: r.labels, sticky: r.sticky })))
