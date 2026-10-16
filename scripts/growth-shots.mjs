// V3-06e ekran kapıları: Gelişim (/career/growth, v3) — çok kayıtlı oyuncu, platodaki oyuncu, tek kayıt (boş durum), tablo görünümü açık, kaydırılmış;
// 375/768/1280 × koyu/açık. Veri: geçici test hesabı (yalnız localhost; koşu sonunda yalnız bu hesap silinir). Yerel kayıtlarda çoklu LE içe aktarması yok:
// çoklu kayıt uygulamanın kendi uçlarıyla gerçek üretilir — oyun tarihi + sezon PATCH ve OVR/POT elle güncellemesi (PUT /players/ratings → MANUAL snapshot);
// fikstür yok. Ölçüm: taşma, axe serious/critical, konsol/ağ 4xx-5xx, sayfa minFont (≥ 11px; svg yazıları dahil), yapışkan bant sızıntısı + alfa 1.
// Kullanım: node scripts/growth-shots.mjs [--base http://localhost:8081] [--out V3-06e/growth]
import { AxeBuilder } from '@axe-core/playwright'
import { spawnSync } from 'node:child_process'
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
const out = new URL(`../docs/review/v2/screens/${args.includes('--out') ? args[args.indexOf('--out') + 1] : 'V3-06e/growth'}/`, import.meta.url)
mkdirSync(out, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, out))
const MIN_FONT = 11
const BAND = ['header']
const COMPOSE = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
const resetRateLimits = () => spawnSync('docker', ['compose', '-f', COMPOSE, 'exec', '-T', 'redis', 'sh', '-c', 'for k in $(redis-cli --scan --pattern "fc:ratelimit:*"); do redis-cli del $k >/dev/null; done'], { encoding: 'utf8' })

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status}`)
  return text ? JSON.parse(text).data : undefined
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const multi = await api('POST', '/careers', { clubId: club.id, name: 'kapı gelişim', budgetEur: 5_000_000 })
const single = await api('POST', '/careers', { clubId: club.id, name: 'kapı tek kayıt' })
const squad = await api('GET', `/careers/${multi.id}/squad`)
const young = squad.filter((c) => (c.player.age ?? 99) <= 21 && c.player.potential > c.player.overall).sort((a, b) => b.player.potential - b.player.overall - (a.player.potential - a.player.overall))
const grower = young[0].player
const plateau = (young[1] ?? young[0]).player
const others = squad.filter((c) => c.player.id !== grower.id && c.player.id !== plateau.id).slice(0, 8).map((c) => c.player)
// 4 kayıt, 2 sezon: oyun tarihi ve sezon her kayıttan önce yazılır (snapshot.game_date kayıt anındaki oyun tarihi).
const steps = [['2026-08-01', 1, 0], ['2027-01-15', 1, 2], ['2027-08-01', 2, 4], ['2028-01-15', 2, 6]]
for (const [gameDate, season, step] of steps) {
  await api('PATCH', `/careers/${multi.id}`, { gameDate, season })
  const updates = [
    { playerId: grower.id, overall: Math.min(grower.potential, grower.overall + step), potential: grower.potential },
    { playerId: plateau.id, overall: step === 6 ? plateau.potential : plateau.overall + step / 2, potential: plateau.potential },
    ...others.map((p, i) => ({ playerId: p.id, overall: Math.max(40, Math.min(99, p.overall + (i % 2 === 0 ? step / 2 : -step / 2))), potential: Math.max(p.potential ?? p.overall, p.overall + step) })),
  ]
  await api('PUT', `/careers/${multi.id}/players/ratings`, { updates, note: `kapı ${gameDate}` })
}
const singleSquad = await api('GET', `/careers/${single.id}/squad`)
await api('PUT', `/careers/${single.id}/players/ratings`, { updates: [{ playerId: singleSquad[0].player.id, overall: singleSquad[0].player.overall }] })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  const mobile = w < 820
  for (const theme of ['dark', 'light']) {
    resetRateLimits()
    session = await login()
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await context.newPage()
    const problems = []
    page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
    const prime = async (careerId) => {
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
      // svg yazıları (eksen, bar adları): görünen en küçük font.
      const svgFont = await page.evaluate(() => Math.min(...[...document.querySelectorAll('main svg text')].map((t) => t.getBoundingClientRect().height > 0 ? parseFloat(getComputedStyle(t).fontSize) * (t.ownerSVGElement.getBoundingClientRect().width / (t.ownerSVGElement.viewBox.baseVal.width || t.ownerSVGElement.getBoundingClientRect().width)) : 99), 99))
      // Grafik eksen etiketleri üst üste binmesin (aynı satırdaki svg yazılarının kutuları kesişmez).
      const labelOverlaps = await page.evaluate(() => [...document.querySelectorAll('main svg')].flatMap((svg) => {
        const boxes = [...svg.querySelectorAll('text')].map((t) => ({ text: t.textContent, r: t.getBoundingClientRect() })).filter((b) => b.r.width > 0)
        return boxes.flatMap((a, i) => boxes.slice(i + 1).filter((b) => Math.abs(a.r.top - b.r.top) < 2 && a.r.left < b.r.right - 1 && b.r.left < a.r.right - 1).map((b) => `${a.text} × ${b.text}`))
      }))
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, labelOverlaps, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`),
        axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))), problems: [...problems], text: await page.evaluate(pageMinFont, MIN_FONT), svgFont, ...extra })
      problems.length = 0
    }
    const open = async (query) => {
      await page.goto(`${base}/career/growth?${query}${query ? '&' : ''}ui=v3`, { waitUntil: 'networkidle' })
      await page.getByRole('heading', { name: 'Gelişim', exact: true }).waitFor({ timeout: 20000 })
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
    }
    const chartLabel = () => page.getByRole('region', { name: 'OVR geçmişi' }).getByRole('img').first().getAttribute('aria-label').catch(() => null)

    await prime(multi.id)
    await open(`oyuncu=${grower.id}`)
    await shoot('cok-kayit', { chart: await chartLabel(), risers: await page.getByRole('region', { name: 'En çok yükselenler' }).getByRole('img').getAttribute('aria-label').catch(() => null) })
    await page.getByRole('region', { name: 'Düşenler' }).scrollIntoViewIfNeeded()
    await shoot('cok-kayit-kaydirilmis', { band: await page.evaluate(stickyBand, BAND) }, false)
    await open(`oyuncu=${plateau.id}`)
    await shoot('plato', { plateau: await page.getByRole('status', { name: 'Plato' }).count() })
    await open(`oyuncu=${grower.id}`)
    await page.getByRole('region', { name: 'OVR geçmişi' }).getByRole('button', { name: 'Tablo olarak göster' }).click()
    await page.getByRole('region', { name: 'En çok yükselenler' }).getByRole('button', { name: 'Tablo olarak göster' }).click()
    await shoot('tablo', { tableRows: await page.getByRole('region', { name: 'OVR geçmişi' }).locator('tbody tr').count() })
    await page.getByRole('radio', { name: 'Sezon başı → şimdi' }).click()
    await page.waitForLoadState('networkidle')
    await shoot('sezon-basi', { seasonRange: true })
    await prime(single.id)
    await open('')
    await shoot('tek-kayit', { emptyState: await page.getByText('en az iki içe aktarma gerekir', { exact: false }).count() })
    await context.close()
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ careers: { multi: multi.id, single: single.id }, players: { grower: grower.id, plateau: plateau.id }, report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0) || r.svgFont < MIN_FONT || r.labelOverlaps.length > 0
  || (r.band && (!r.band.ok || r.band.surfaces.some((s) => s.alpha < 1))) || r.plateau === 0 || r.tableRows === 0 || r.emptyState === 0 || r.chart === null)
console.log(`çekim ${report.length}; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r).slice(0, 700)))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(` · sayfa minFont: en küçük ${Math.min(...mins)}px; svg en küçük ${Math.min(...report.map((r) => r.svgFont))}px`)
report.filter((r) => r.shot.endsWith('dark-1280')).forEach((r) => console.log(' ·', r.shot, JSON.stringify({ chart: r.chart, risers: r.risers, plateau: r.plateau, tableRows: r.tableRows, emptyState: r.emptyState })))
process.exitCode = bad.length ? 1 : 0
