// V3-05b-c: 6 stat ve ülke/kulüp/lig çiplerinin ≥ 11px ile sığdığı en küçük PlayerCard genişliğini gerçek tarayıcıda ölçer.
// Önce Vite dev sunucusunu açın (npm run dev); ölçüm sayfası /scripts/card-probe/ (build'e girmez).
// Kullanım: node scripts/card-width-probe.mjs [--base http://localhost:5173]
// Ölçüt (her genişlik, saha + kaleci kartı): yazı computed font-size × ölçek ≥ 11; metin kendi hücresine/çipine sığar (scrollWidth ≤ clientWidth);
// stat bloğu çerçeve içinde (alt kenar ≤ taban 212px); çipler stat bloğunun üstünde biter. Sonuç: eşiği geçen ve üstündeki her genişlikte geçen en küçük değer.
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:5173'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const MIN = 11
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto(`${base}/scripts/card-probe/`, { waitUntil: 'networkidle' })
await page.locator('[data-probe-width]').first().waitFor()
await page.evaluate(() => document.fonts.ready)

const rows = await page.evaluate((min) => {
  const px = (el, scale) => parseFloat(getComputedStyle(el).fontSize) * scale
  return [...document.querySelectorAll('[data-probe-width]')].map((box) => {
    const card = box.querySelector('[role="img"]')
    const layer = card.querySelector('[style*="scale("]')
    const scale = layer.getBoundingClientRect().width / layer.offsetWidth
    const top = card.getBoundingClientRect().top
    const stats = card.querySelector('[data-card-stats]')
    const chips = card.querySelector('[data-card-chips]')
    const statTexts = [...stats.querySelectorAll(':scope > div > div')]
    const statsMinPx = Math.min(...statTexts.map((t) => px(t, scale)))
    const statsFit = statTexts.every((t) => t.scrollWidth <= t.parentElement.clientWidth + 0.5)
    const statsBottomBase = (stats.getBoundingClientRect().bottom - top) / scale
    const chipSpans = [...chips.querySelectorAll('span')]
    const chipsMinPx = Math.min(...chipSpans.map((c) => px(c, scale)))
    const chipsFit = chipSpans.every((c) => c.scrollWidth <= c.clientWidth + 0.5)
    const chipsClear = chips.getBoundingClientRect().bottom <= stats.getBoundingClientRect().top + 0.5
    return {
      width: Number(box.dataset.probeWidth), kind: box.dataset.probeKind,
      stats: statsMinPx >= min - 0.01 && statsFit && statsBottomBase <= 212, statsMinPx: Math.round(statsMinPx * 10) / 10, statsFit, statsBottomBase: Math.round(statsBottomBase),
      chips: chipsMinPx >= min - 0.01 && chipsFit && chipsClear, chipsFit, chipsClear,
    }
  })
}, MIN)
await browser.close()

/** Bu genişlik ve üstündeki her genişlikte (her iki kart türünde) geçen en küçük genişlik. */
function threshold(key) {
  const widths = [...new Set(rows.map((r) => r.width))].sort((a, b) => a - b)
  const passes = (w) => rows.filter((r) => r.width === w).every((r) => r[key])
  let result = null
  for (let i = widths.length - 1; i >= 0 && passes(widths[i]); i--) {
    result = widths[i]
  }
  return result
}
const stats = threshold('stats')
const chips = threshold('chips')
console.log(JSON.stringify({ statsMinWidth: stats, chipsMinWidth: chips }))
for (const w of [100, 120, 130, 140, 150, 160, 180, 200, 220, 240]) {
  console.log(w, JSON.stringify(rows.filter((r) => r.width === w).map(({ kind, stats: s, statsMinPx, statsFit, statsBottomBase, chips: c, chipsFit, chipsClear }) => ({ kind, s, statsMinPx, statsFit, statsBottomBase, c, chipsFit, chipsClear }))))
}
