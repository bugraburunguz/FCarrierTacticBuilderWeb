// İki ekran görüntüsü klasörünü piksel piksel karşılaştırır (UT regresyonu: önce/sonra). Araç kurulumu gerekmez; tarayıcı canvas'ı kullanılır.
// Kullanım: node scripts/png-diff.mjs <önce-klasörü> <sonra-klasörü>. Çıktı: dosya başına boyut ve farklı piksel sayısı; fark varsa çıkış 1.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const [before, after] = process.argv.slice(2)
if (!before || !after) {
  console.error('Kullanım: node scripts/png-diff.mjs <önce> <sonra>')
  process.exit(2)
}
const names = readdirSync(before).filter((n) => n.endsWith('.png'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
let changed = 0
for (const name of names) {
  const a = `data:image/png;base64,${readFileSync(join(before, name)).toString('base64')}`
  let b
  try {
    b = `data:image/png;base64,${readFileSync(join(after, name)).toString('base64')}`
  } catch {
    console.log(`${name}: sonra yok`)
    changed += 1
    continue
  }
  const result = await page.evaluate(async ({ a, b }) => {
    const load = (src) => new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.src = src })
    const [ia, ib] = await Promise.all([load(a), load(b)])
    if (ia.width !== ib.width || ia.height !== ib.height) return { size: `${ia.width}x${ia.height} ≠ ${ib.width}x${ib.height}`, diff: -1 }
    const pixels = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height).data }
    const pa = pixels(ia)
    const pb = pixels(ib)
    let diff = 0
    const box = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 }
    for (let i = 0; i < pa.length; i += 4) {
      if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2] || pa[i + 3] !== pb[i + 3]) {
        diff += 1
        const x = (i / 4) % ia.width
        const y = Math.floor(i / 4 / ia.width)
        box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y); box.x1 = Math.max(box.x1, x); box.y1 = Math.max(box.y1, y)
      }
    }
    return { size: `${ia.width}x${ia.height}`, diff, box: diff ? `${box.x0},${box.y0}–${box.x1},${box.y1}` : '' }
  }, { a, b })
  if (result.diff !== 0) changed += 1
  console.log(`${name}: ${result.size} · farklı piksel ${result.diff}${result.box ? ` · bölge ${result.box}` : ''}`)
}
await browser.close()
console.log(`${names.length} dosya; farklı ${changed}`)
process.exit(changed > 0 ? 1 : 0)
