// ACADEMY-b ekran kapıları: Altyapı (liste, panel, iki boş durum), Gelişim, oyuncu sayfası Gelişim sekmesi × 375/768/1280 × koyu/açık.
// Dolu: Port Vale kariyeri, backend test fixture'ı (le-export/academy-portvale.log) API ile iki kez içe aktarılır (Gelişim farkı için iki kayıt).
// Boş durumlar: içe aktarmasız Crewe kariyeri ("altyapı bulunamadı"); "oyuncu yok" durumu oyunda kurulamadığı için yalnız bu tarayıcıda
// /academy yanıtı fikstürle değiştirilir (takım var, oyuncu yok).
// Kullanım: backend'i BILLING_STUB_ENABLED=true ile aç (içe aktarma PREMIUM ister; stub sağlayıcı, gerçek ödeme yok), sonra
// node scripts/academy-shots.mjs [--base http://localhost:8081] [--fixture <log yolu>]. Yalnız localhost/127.0.0.1; test hesabı koşu sonunda silinir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const base = arg('--base', 'http://localhost:8081')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const fixture = arg('--fixture', fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/src/test/resources/le-export/academy-portvale.log', import.meta.url)))
const outDir = screensDir('ACADEMY-b')
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  if (res.status >= 300) {
    throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 200)}`)
  }
  return text ? JSON.parse(text).data : undefined
}
const importLog = async (careerId) => {
  const form = new FormData()
  form.append('log', new Blob([readFileSync(fixture)], { type: 'text/plain' }), 'academy.log')
  const res = await fetch(`${base}/api/v1/careers/${careerId}/import`, { method: 'POST', headers: { authorization: `Bearer ${session.accessToken}` }, body: form })
  if (res.status >= 300) {
    throw new Error(`import → ${res.status} ${(await res.text()).slice(0, 200)}`)
  }
}
const clubId = async (q) => (await (await fetch(`${base}/api/v1/clubs?q=${encodeURIComponent(q)}&limit=1&gender=0`)).json()).data[0].id

await api('POST', '/billing/subscribe')
const full = await api('POST', '/careers', { clubId: await clubId('Port Vale'), name: 'Kapı ACADEMY-b', budgetEur: 5_000_000 })
await importLog(full.id)
await importLog(full.id)
const empty = await api('POST', '/careers', { clubId: await clubId('Crewe'), name: 'Kapı ACADEMY-b boş', budgetEur: 5_000_000 })
const academy = await api('GET', `/careers/${full.id}/academy`)
const youth = await api('GET', `/careers/${full.id}/youth`)
const pick = academy.players.find((p) => p.promote) ?? academy.players[0]
const squadPlayer = youth[0]?.playerId ?? (await api('GET', `/careers/${full.id}/squad`))[0].player.id
console.log(JSON.stringify({ academy: academy.players.map((p) => `${p.name}:${p.status}:${p.plan?.label ?? '-'}`), youth: youth.map((p) => p.name), pick: pick.name }))

const SHOTS = [
  { name: 'altyapi', career: full.id, path: '/career/academy', wait: { role: 'list', name: 'Oyuncular' } },
  { name: 'altyapi-panel', career: full.id, path: `/career/academy?oyuncu=${pick.playerId}`, mobilePath: `/career/academy/${pick.playerId}`, wait: { role: 'heading', name: 'Takımdaki yeri' } },
  { name: 'altyapi-bulunamadi', career: empty.id, path: '/career/academy', wait: { text: "Bu export'ta altyapı görünmüyor" } },
  { name: 'altyapi-bos', career: empty.id, path: '/career/academy', wait: { text: 'Altyapıda oyuncu yok.' },
    fixture: { found: false, teamId: 1, name: 'Crewe Alexandra Youth Academy', message: "Altyapıda oyuncu yok ya da export'ta görünmüyor", players: [] } },
  { name: 'gelisim', career: full.id, path: '/career/growth', wait: { role: 'region', name: 'Son içe aktarmadan beri' } },
  { name: 'oyuncu-gelisim', career: full.id, path: `/players/${squadPlayer}?sekme=gelisim`, wait: { role: 'heading', name: 'OVR geçmişi' } },
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const w of [375, 768, 1280]) {
  for (const theme of ['dark', 'light']) {
    session = await login()
    const context = await browser.newContext({ viewport: { width: w, height: w === 375 ? 812 : 900 } })
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    for (const s of SHOTS) {
      await page.unrouteAll({ behavior: 'ignoreErrors' })
      if (s.fixture) {
        await page.route(`**/api/v1/careers/${s.career}/academy`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: s.fixture }) }))
      }
      await page.goto(`${base}/`)
      await page.evaluate(({ t, c, th }) => {
        localStorage.setItem('fc.theme', th)
        localStorage.setItem('fc.mode', 'career')
        localStorage.setItem('fc.career', String(c))
        localStorage.setItem('fc.access', t.accessToken)
        localStorage.setItem('fc.refresh', t.refreshToken)
      }, { t: session, c: s.career, th: theme })
      // useIsMobile ≤ 819px: panel yerine oyuncu sayfası.
      const path = w < 820 && s.mobilePath ? s.mobilePath : s.path
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
      await (s.wait.text ? page.getByText(s.wait.text) : page.getByRole(s.wait.role, { name: s.wait.name })).first().waitFor({ timeout: 30000 })
      await page.waitForTimeout(800)
      await page.screenshot({ path: file(`${s.name}-${theme}-${w}.png`), fullPage: true })
      const hidden = await page.evaluate(() => ['±', 'Tier', 'swing', 'levelFit', 'currentFit'].filter((t) => document.querySelector('main')?.innerText.includes(t)))
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${s.name}-${theme}-${w}`, path, hiddenLeak: hidden, overflow, axe: serious.map((v) => `${v.id}:${v.nodes.length}`), problems: [...problems] })
      problems.length = 0
    }
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ career: full.id, empty: empty.id, report }, null, 2))
report.forEach((r) => console.log(JSON.stringify(r)))
