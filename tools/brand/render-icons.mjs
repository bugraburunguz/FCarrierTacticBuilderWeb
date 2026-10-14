// FC Assist marka çıktıları: favicon.svg, favicon.ico (16/32/48), apple-touch-icon, PWA ikonları, og-image.
// Kaynak: docs/brand/source/mark-dark.svg / mark-light.svg (Claude'un vektör işaretleri). Yeni paket yok: mevcut playwright-core (kurulu Chrome) ve düz Node.
// Kullanım: node tools/brand/render-icons.mjs   → public/ ve docs/brand/out/ altına yazar.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url))
const pub = (p) => root(`public/${p}`)
mkdirSync(pub('icons'), { recursive: true })
mkdirSync(root('docs/brand/out'), { recursive: true })

const BG = '#070a12' // --bg-base (koyu)
const BRAND = ['#38bdf8', '#818cf8', '#c084fc'] // koyu tema marka durakları (tokens.css)
const dark = readFileSync(root('docs/brand/source/mark-dark.svg'), 'utf8')
const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

// --- favicon.svg: tek dosyada koyu/açık (prefers-color-scheme) ---
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="FC Assist">
  <style>
    :root { --f1: #1e293b; --f2: #312e81; --ink: #ffffff; }
    @media (prefers-color-scheme: light) { :root { --f1: #e0f2fe; --f2: #ede9fe; --ink: #312e81; } }
    .fill1 { stop-color: var(--f1); } .fill2 { stop-color: var(--f2); }
    .ink { stroke: var(--ink); } .inkfill { fill: var(--ink); stroke: var(--ink); }
  </style>
  <defs>
    <linearGradient id="g" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#38bdf8"/><stop offset=".55" stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/>
    </linearGradient>
    <linearGradient id="f" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
      <stop class="fill1" offset="0"/><stop class="fill2" offset="1"/>
    </linearGradient>
  </defs>
  <path d="M32 4 55.5 17.5v29L32 60 8.5 46.5v-29Z" fill="url(#f)" stroke="url(#g)" stroke-width="3.5" stroke-linejoin="round"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round" class="ink">
    <path d="M19 19.5l6 6m0-6-6 6" stroke-width="3"/>
    <circle cx="22" cy="43" r="4.3" stroke-width="3"/>
    <path d="M26.5 39.5C33 37 39 32 42 25" stroke-width="3" stroke-dasharray="4.2 3.6"/>
  </g>
  <path d="M45.5 17.5 46 29.2 37.6 25.4Z" stroke-width="1.6" stroke-linejoin="round" class="inkfill"/>
</svg>
`
writeFileSync(pub('favicon.svg'), faviconSvg)

const markSvg = (px) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 64 64">${inner(dark)}</svg>`

const fonts = (file) => pathToFileURL(root(`node_modules/${file}`)).href
const FONT_CSS = `
@font-face { font-family: 'BC'; font-weight: 700; src: url('${fonts('@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2')}'); unicode-range: U+0000-00FF; }
@font-face { font-family: 'BC'; font-weight: 700; src: url('${fonts('@fontsource/barlow-condensed/files/barlow-condensed-latin-ext-700-normal.woff2')}'); unicode-range: U+0100-02AF, U+1E00-1EFF; }
@font-face { font-family: 'BC'; font-weight: 600; src: url('${fonts('@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2')}'); unicode-range: U+0000-00FF; }
@font-face { font-family: 'BC'; font-weight: 600; src: url('${fonts('@fontsource/barlow-condensed/files/barlow-condensed-latin-ext-600-normal.woff2')}'); unicode-range: U+0100-02AF, U+1E00-1EFF; }
`

const browser = await chromium.launch({ channel: 'chrome', headless: true })

async function shot(html, width, height, out, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  const tmp = root('tools/brand/.render.html')
  writeFileSync(tmp, `<!doctype html><meta charset="utf-8"><style>${FONT_CSS} html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;${transparent ? '' : `background:${BG};`}}</style>${html}`)
  await page.goto(pathToFileURL(tmp).href)
  await page.evaluate(() => document.fonts.ready)
  const buffer = await page.screenshot({ type: 'png', omitBackground: transparent })
  await page.close()
  if (out) writeFileSync(out, buffer)
  return buffer
}

// işaret, tuvalin `scale` oranında ortalanır; round: yuvarlatılmış kare zemin (yarıçap oranı)
const iconHtml = (size, scale, radius) => `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 30% 20%, #1b2442 0%, ${BG} 70%);border-radius:${radius}px">${markSvg(Math.round(size * scale))}</div>`

await shot(iconHtml(180, 0.72, 0), 180, 180, pub('apple-touch-icon.png'))
await shot(iconHtml(192, 0.8, 42), 192, 192, pub('icons/icon-192.png'), { transparent: true })
await shot(iconHtml(512, 0.8, 112), 512, 512, pub('icons/icon-512.png'), { transparent: true })
// maskable: tam zemin, işaret güvenli bölgede (%80 daire): altıgen tuvalin %56'sı
await shot(iconHtml(512, 0.56, 0), 512, 512, pub('icons/maskable-512.png'))

// favicon.ico: 16/32/48 PNG yüklü ICO; koyu işaret, saydam zemin (ICO tema bilmez)
const frames = []
for (const px of [16, 32, 48]) {
  const png = await shot(`<div style="width:${px}px;height:${px}px">${markSvg(px)}</div>`, px, px, root(`docs/brand/out/favicon-${px}.png`), { transparent: true })
  frames.push({ px, png })
}
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(frames.length, 4)
let offset = 6 + 16 * frames.length
const dir = Buffer.concat(
  frames.map(({ px, png }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(px, 0)
    entry.writeUInt8(px, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  }),
)
writeFileSync(pub('favicon.ico'), Buffer.concat([header, dir, ...frames.map((f) => f.png)]))

// açık tema sekme ikonu (16/32) rapor için
const light = readFileSync(root('docs/brand/source/mark-light.svg'), 'utf8')
for (const px of [16, 32]) {
  await shot(`<div style="width:${px}px;height:${px}px;background:#ffffff">${`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 64 64">${inner(light)}</svg>`}</div>`, px, px, root(`docs/brand/out/favicon-light-${px}.png`))
}

// og-image 1200×630
const og = `<div style="position:relative;width:1200px;height:630px;background:radial-gradient(ellipse at 20% 15%, rgba(56,189,248,.22), transparent 55%), radial-gradient(ellipse at 85% 90%, rgba(168,85,247,.24), transparent 55%), ${BG};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;font-family:'BC',sans-serif">
  ${markSvg(230)}
  <div style="font-size:150px;font-weight:700;line-height:1;letter-spacing:-0.01em;color:#f2f5fb">FC <span style="background:linear-gradient(90deg, ${BRAND[0]}, ${BRAND[1]} 55%, ${BRAND[2]});-webkit-background-clip:text;background-clip:text;color:transparent">Assist</span></div>
  <div style="font-size:38px;font-weight:600;letter-spacing:.14em;color:#c4cbd8;text-transform:none">Kariyerinde yanında · UT'de daima önde</div>
</div>`
await shot(og, 1200, 630, pub('og-image.png'))

// manifest: renkler tokens.css'ten
const tokens = readFileSync(root('src/design/tokens.css'), 'utf8')
const token = (name) => new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)?.[1]
writeFileSync(
  pub('site.webmanifest'),
  JSON.stringify(
    {
      name: 'FC Assist',
      short_name: 'FC Assist',
      description: 'Kariyerinde yanında · UT\'de daima önde',
      lang: 'tr',
      start_url: './',
      display: 'standalone',
      theme_color: token('--bg-base') ?? '#070a12',
      background_color: token('--bg-base') ?? '#070a12',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ) + '\n',
)

await browser.close()
rmSync(root('tools/brand/.render.html'), { force: true })
console.log('marka çıktıları yazıldı: public/{favicon.svg,favicon.ico,apple-touch-icon.png,icons/*,og-image.png,site.webmanifest}, docs/brand/out/*')
