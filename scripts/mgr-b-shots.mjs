// MGR-b: menajer profili, kulüp önerisi ekranı ve boş durumlar × 375/768/1280 × koyu/açık; axe, taşma, konsol ve 4xx/5xx kapıları.
// Öneri ucu 5/dk kovasında ve ilk hesap ~13 sn: gerçek yanıt bir kez alınır, tarayıcıda o yanıtla doldurulur. Boş durumlar (profil yok,
// katalog güncel değil, aday yok, hata, yükleniyor) yanıt değiştirilerek çekilir.
// Kullanım: node scripts/mgr-b-shots.mjs [--base http://localhost:8081]. Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = screensDir('MGR-b')
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const raw = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  if (res.status >= 300) {
    throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 200)}`)
  }
  return text
}
const PROFILE = { name: 'Buğra', licence: 'NATIONAL_A', background: 'PRO_REGIONAL', style: 'COUNTER', priorities: ['YOUTH', 'QUICK_SUCCESS'], difficulty: 'MEDIUM' }
await raw('PUT', '/me/manager-profile', PROFILE)
const t0 = Date.now()
const recsBody = await raw('POST', '/manager/club-recommendations', {})
const recs = JSON.parse(recsBody)
console.log(`öneri: ${recs.data.cards.length} kart, ${Date.now() - t0} ms`)
const variant = (patch) => JSON.stringify({ ...recs, data: { ...recs.data, ...patch } })

// Durum → öneri/profil ucunun yanıtı. null: gerçek uç (profil); 'hang': hiç yanıtlanmaz (yükleniyor).
const STATES = [
  { name: 'profil', path: '/career/manager', wait: 'Uluslararası Pro Lisans' },
  { name: 'oneri', path: '/career/new', recs: recsBody, wait: 'Bu kulüple başla' },
  { name: 'bos-profil-yok', path: '/career/new', noProfile: true, wait: 'Menajer profilini oluştur' },
  { name: 'bos-katalog', path: '/career/new', recs: variant({ catalogReady: false, cards: [], missing: [] }), wait: 'Kulüp verisi henüz yok' },
  { name: 'bos-aday-yok', path: '/career/new', recs: variant({ cards: [], missing: recs.data.missing.length ? recs.data.missing : [{ category: 'DREAM', reason: 'İtibar aralığında hayal adayı yok.' }] }), wait: 'uyan kulüp bulunamadı' },
  { name: 'yukleniyor', path: '/career/new', recs: 'hang', wait: 'hesaplanıyor', widths: [375, 1280] },
  { name: 'hata', path: '/career/new', recs: 'error', wait: 'Kulüp önerileri alınamadı', widths: [375, 1280] },
  { name: 'masa', path: '/career/dashboard', wait: 'Menajer:', widths: [375, 1280] },
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const theme of ['dark', 'light']) {
  for (const w of [375, 768, 1280]) {
    session = await login()
    const context = await browser.newContext({ viewport: { width: w, height: w === 375 ? 812 : 900 }, colorScheme: theme })
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && !r.url().includes('/manager/') && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    await page.goto(`${base}/`)
    await page.evaluate(({ t, th }) => {
      localStorage.setItem('fc.theme', th)
      localStorage.setItem('fc.mode', 'career')
      localStorage.setItem('fc.access', t.accessToken)
      localStorage.setItem('fc.refresh', t.refreshToken)
    }, { t: session, th: theme })
    for (const s of STATES) {
      if (s.widths && !s.widths.includes(w)) {
        continue
      }
      await page.unrouteAll({ behavior: 'ignoreErrors' })
      if (s.recs) {
        await page.route('**/api/v1/manager/club-recommendations', (route) => (s.recs === 'hang' ? undefined
          : s.recs === 'error' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, errors: [{ code: 'server', message: 'Geçici hata' }] }) })
            : route.fulfill({ status: 200, contentType: 'application/json', body: s.recs })))
      }
      if (s.noProfile) {
        // Profil yok: sunucu 200 + data null döner (hata değil); konsolda hata beklenmez.
        await page.route('**/api/v1/me/manager-profile', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: null }) }))
      }
      await page.goto(`${base}${s.path}`, { waitUntil: s.recs === 'hang' ? 'domcontentloaded' : 'networkidle' })
      await page.getByText(s.wait).first().waitFor({ timeout: 30000 })
      await page.waitForTimeout(600)
      const name = `${s.name}-${theme}-${w}`
      await page.screenshot({ path: file(`${name}.png`), fullPage: true })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      // Kasıtlı 503 (hata durumu) tarayıcı konsoluna "Failed to load resource" yazar; yalnız orada beklenen.
      const expected = s.recs === 'error'
      report.push({ shot: name, overflow, axe: serious.map((v) => `${v.id}:${v.nodes.length}`), problems: problems.filter((p) => !(expected && p.includes('Failed to load resource'))) })
      problems.length = 0
    }
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ report }, null, 2))
report.forEach((r) => console.log(JSON.stringify(r)))
const failed = report.filter((r) => r.overflow || r.axe.length || r.problems.length)
console.log(`${report.length} görüntü, kapıdan kalan: ${failed.length}`)
