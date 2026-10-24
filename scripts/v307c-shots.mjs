// V3-07c ekran kapıları: kalan 8 sayfa (v3) × 375/768/1280 × koyu/açık — boş / dolu / hata + kaydırılmış; ayrıca 0a regresyonu (kadro sahası,
// kurucu, Masa, Transfer, oyuncu sayfası). Fikstürler yalnız bu tarayıcıda (page.route) ve raporda "fixture" olarak işaretli; hata durumlarının
// beklenen 4xx/5xx'i ayrı tutulur. Ölçüm: yatay taşma, axe serious/critical, konsol/ağ 4xx-5xx, sayfa minFont ≥ 11, kaydırılmışta yapışkan bant.
// Kullanım: node scripts/v307c-shots.mjs [--base http://localhost:8081] [--only ut-club,teams]   (yerel test hesabı kurar, sonunda yalnız kendisini siler)
// Hız sınırı backend belleğinde (OPS-02, Redis yok): koşu 429 alırsa backend'i yeniden başlat (docker compose restart backend).
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { pageMinFont, stickyBand } from './lib/readability.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : undefined
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
// --out: başka görevin regresyon koşusu V3-07c kanıtını ezmesin (örn. --out PROD-PREP/kulubum).
const outDir = new URL(`../docs/review/v2/screens/${args.includes('--out') ? args[args.indexOf('--out') + 1] : 'V3-07c'}/`, import.meta.url)
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))
const SAMPLE_CAPTURES = fileURLToPath(new URL('../tests/fixtures/captures/sample-captures.json', import.meta.url))
const MIN_FONT = 11
const want = (group) => !only || only.includes(group)

await createGateAccount(base, 'gate-')
const login = async () => (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
let session = await login()
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  return text ? JSON.parse(text).data : undefined
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'kapı Crewe', budgetEur: 5_000_000 })
const player = (await api('GET', `/players?career=${career.id}&size=1&sort=overall`)).items[0]

// Katalogdan kulüp kartı tohumu (yalnız bu tarayıcının IndexedDB'si): kopya, storage, takas edilemez ve özel karışık.
const POS = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST', 'CB', 'CM', 'ST', 'LM', 'RM', 'CB', 'CAM']
const seen = new Set()
const seedCards = []
for (const [i, pos] of POS.entries()) {
  await new Promise((r) => setTimeout(r, 300))
  const items = (await (await fetch(`${base}/api/v1/players?pos=${pos}&sort=overall&order=desc&size=12&gender=0`)).json()).data.items
  const p = items.find((x) => !seen.has(x.id))
  if (!p) continue
  seen.add(p.id)
  seedCards.push({ key: `c:${p.id}`, source: 'club', name: p.name, rating: p.overall - (i % 4) * 6, positions: p.positions, club: p.club, league: p.league, nationality: p.nationality, playerId: p.id, assetId: p.faceAssetId,
    faceStats: p.faceStats, faceLabels: p.faceLabels, untradeable: i % 3 === 0, duplicate: i % 5 === 1, pile: i % 6 === 2 ? 'storage' : 'club', rarity: i % 7 === 0 ? 'TOTW' : 'Gold Rare', rarityId: i % 7 === 0 ? 3 : 1, price: i % 2 ? 500 + i * 300 : undefined, instanceId: 100 + i })
}
const compareList = seedCards.slice(11, 14).map((c) => ({ id: c.playerId, name: c.name, overall: c.rating, position: c.positions[0] }))
const OBJECTIVES = [1, 2, 3].map((i) => ({ id: `g1-${i}`, name: `Alt görev ${i}`, group: 'Weekly', requirements: [{ kind: 'GOALS', count: i + 1 }], rewardValue: 500 * i, sp: 0, webAppDoable: i === 1,
  parentId: 'g1', parentName: 'Haftalık ustalık', parentReward: 5000, subIndex: i, subTotal: 3, subDone: 1, expiresAt: '2026-10-30' }))
  .concat([{ id: 's1', name: 'Elle görev', group: 'Seasonal', requirements: [{ kind: 'XI_LEAGUE', value: 'Premier League', count: 1 }], rewardValue: 2000, sp: 10, webAppDoable: false }])
const TEAMS = [['Crewe Alexandra', 'EFL League Two', 62], ['Port Vale', 'EFL League Two', 64], ['Leeds United', 'Premier League', 76], ['Wrexham', 'EFL League One', 66], ['Bradford City', 'EFL League Two', 61]]
  .map(([name, league, overall], i) => ({ teamId: 100 + i, name, league, overall, attack: overall + 1, midfield: overall, defence: overall - 2, playerCount: 26 }))
const TEAM_PROFILE = { team: TEAMS[1], averageAge: 25.4, rivalTeamName: 'Crewe Alexandra', strengths: ['Hücum ortalamanın üstünde'], weaknesses: ['Savunma derinliği az'], culture: ['Genç oyuncuya şans verir'],
  topPlayers: [{ id: player.id, name: player.name, overall: player.overall, positions: player.positions, age: player.age, valuationEstimated: false }] }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []

async function newPage(w, h, theme, { auth = true, mode = 'career', local = {}, idb } = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h } })
  await context.addInitScript(({ t, s, c, m, local }) => {
    localStorage.setItem('fc.theme', t)
    localStorage.setItem('fc.mode', m)
    Object.entries(local).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)))
    if (s) {
      localStorage.setItem('fc.career', String(c))
      localStorage.setItem('fc.access', s.accessToken)
      localStorage.setItem('fc.refresh', s.refreshToken)
    }
  }, { t: theme, s: auth ? session : null, c: career.id, m: mode, local })
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && !/classList/.test(m.text()) && problems.push(`console: ${m.text().slice(0, 160)}`))
  page.on('pageerror', (e) => !e.message.includes("reading 'classList'") && problems.push(`pageerror: ${e.message.slice(0, 160)}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`))
  if (idb) {
    await page.goto(`${base}/?ui=v3`, { waitUntil: 'networkidle' })
    await page.evaluate(async (value) => {
      await new Promise((resolve, reject) => {
        const open = indexedDB.open('fcareer')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction('kv', 'readwrite')
          tx.objectStore('kv').put({ key: 'utCards', schemaVersion: 1, value })
          tx.oncomplete = () => resolve(undefined)
          tx.onerror = () => reject(tx.error)
        }
      })
    }, idb)
    problems.length = 0
  }
  return { context, page, problems }
}

for (const { w, h } of [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }]) {
  const mobile = w < 820
  for (const theme of ['dark', 'light']) {
    session = await login()
    const shoot = async (ctx, name, extra = {}, expectProblems = false) => {
      const { page, problems } = ctx
      await page.waitForTimeout(450)
      await page.screenshot({ path: file(`${name}-${theme}-${w}.png`), fullPage: false })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const axe = await new AxeBuilder({ page }).analyze()
      const serious = axe.violations.filter((a) => a.impact === 'serious' || a.impact === 'critical')
      report.push({ shot: `${name}-${theme}-${w}`, overflow, axeSeriousCritical: serious.length, axeAll: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`),
        axeNodes: serious.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} ${n.any[0]?.message ?? ''}`.slice(0, 220))),
        problems: expectProblems ? [] : [...problems], expectedProblems: expectProblems ? [...problems] : undefined, text: await page.evaluate(pageMinFont, MIN_FONT), ...extra })
      problems.length = 0
    }
    const scrolled = async (ctx, name, y = 700) => {
      await ctx.page.evaluate((top) => window.scrollTo(0, top), y)
      await shoot(ctx, `${name}-kaydirilmis`, { band: await ctx.page.evaluate(stickyBand, ['header']) })
      await ctx.page.evaluate(() => window.scrollTo(0, 0))
    }
    const go = async (ctx, path, ready) => {
      await ctx.page.goto(`${base}${path}${path.includes('?') ? '&' : '?'}ui=v3`, { waitUntil: 'networkidle' })
      await ctx.page.locator('main h1').first().waitFor({ timeout: 20000 })
      if (ready) {
        await ready(ctx.page)
      }
      await ctx.page.waitForLoadState('networkidle')
    }
    const fail = (page, pattern, status = 500) => page.route(pattern, (route) => route.request().method() === 'GET' ? route.fulfill({ status, json: { success: false, error: { code: 'fc.exception.0001', message: 'Kapı fikstürü: sunucu hatası' } } }) : route.continue())
    const fixture = (page, pattern, data) => page.route(pattern, (route) => route.request().method() === 'GET' ? route.fulfill({ json: { success: true, data } }) : route.continue())

    if (want('ut-meta')) {
      const c = await newPage(w, h, theme, { mode: 'ut' })
      await go(c, '/ut/meta', (p) => p.getByRole('table', { name: 'Meta tier listesi' }).waitFor({ timeout: 20000 }))
      await shoot(c, 'ut-meta-dolu')
      await scrolled(c, 'ut-meta-dolu')
      await fixture(c.page, '**/api/v1/ut/meta/tier**', [])
      await go(c, '/ut/meta?mevki=LWB', (p) => p.getByText(/Bu mevkide meta kartı yok/).waitFor())
      await shoot(c, 'ut-meta-bos', { fixture: 'tier = []' })
      await c.page.unroute('**/api/v1/ut/meta/tier**')
      await fail(c.page, '**/api/v1/ut/meta/**')
      await go(c, '/ut/meta', (p) => p.getByText('Tier listesi yüklenemedi.').waitFor({ timeout: 20000 }))
      await shoot(c, 'ut-meta-hata', { fixture: 'meta uçları 500' }, true)
      await c.context.close()
    }

    if (want('ut-club')) {
      const empty = await newPage(w, h, theme, { mode: 'ut' })
      await go(empty, '/ut/club')
      await shoot(empty, 'ut-club-bos')
      await empty.context.close()
      const c = await newPage(w, h, theme, { mode: 'ut', idb: { cards: seedCards, importedAt: new Date().toISOString() } })
      await go(c, '/ut/club', (p) => p.getByText(/kart · değer/).waitFor())
      await shoot(c, 'ut-club-dolu')
      await scrolled(c, 'ut-club-dolu')
      await go(c, '/ut/club?gorunum=table&sirala=fodder')
      await shoot(c, 'ut-club-tablo-yem')
      await go(c, '/ut/club?mevki=ST&min=80', (p) => p.getByText(/kart · değer/).waitFor())
      await shoot(c, 'ut-club-suzgecli')
      await go(c, '/ut/club', (p) => p.getByText(/kart · değer/).waitFor())
      const boxes = c.page.getByRole('checkbox', { name: /^Seç: / })
      await boxes.nth(0).check()
      await boxes.nth(1).check()
      await shoot(c, 'ut-club-secim')
      await c.page.getByRole('button', { name: "Şu SBC'de kullan" }).click()
      await c.page.getByRole('dialog', { name: "Şu SBC'de kullan" }).waitFor()
      await c.page.waitForLoadState('networkidle')
      const firstSet = c.page.getByRole('dialog').getByRole('button', { expanded: false }).first()
      if (await firstSet.count()) {
        await firstSet.click()
        await c.page.waitForLoadState('networkidle')
      }
      await shoot(c, 'ut-club-sbc-sec')
      await c.page.keyboard.press('Escape')
      if (mobile) {
        await c.page.getByRole('button', { name: /^Filtreler/ }).click()
        await c.page.getByRole('dialog', { name: 'Filtreler' }).waitFor()
        await shoot(c, 'ut-club-filtre-sheet')
      }
      await c.context.close()
    }

    if (want('ut-evo')) {
      const c = await newPage(w, h, theme, { mode: 'ut' })
      await go(c, '/ut/evo', (p) => p.getByRole('article').first().waitFor({ timeout: 20000 }))
      await shoot(c, 'ut-evo-dolu')
      await scrolled(c, 'ut-evo-dolu')
      await fixture(c.page, '**/api/v1/ut/kb/evolutions', [])
      await go(c, '/ut/evo', (p) => p.getByRole('link', { name: 'Kulübümü senkronla' }).waitFor())
      await shoot(c, 'ut-evo-bos', { fixture: 'evolutions = []' })
      await c.page.unroute('**/api/v1/ut/kb/evolutions')
      await fail(c.page, '**/api/v1/ut/kb/evolutions')
      await go(c, '/ut/evo', (p) => p.getByText("Evolution'lar yüklenemedi.").waitFor({ timeout: 20000 }))
      await shoot(c, 'ut-evo-hata', { fixture: 'evolutions 500' }, true)
      await c.context.close()
    }

    if (want('ut-objectives')) {
      const empty = await newPage(w, h, theme, { mode: 'ut' })
      await go(empty, '/ut/objectives', (p) => p.getByRole('link', { name: 'Kulübümü senkronla' }).waitFor({ timeout: 20000 }))
      await shoot(empty, 'ut-objectives-bos')
      await fail(empty.page, '**/api/v1/ut/kb/objectives')
      await go(empty, '/ut/objectives', (p) => p.getByText('Güncel objective grupları yüklenemedi.').waitFor({ timeout: 20000 }))
      await shoot(empty, 'ut-objectives-hata', { fixture: 'objectives 500' }, true)
      await empty.context.close()
      const c = await newPage(w, h, theme, { mode: 'ut', local: { 'fc.objectives': OBJECTIVES } })
      await fixture(c.page, '**/api/v1/ut/kb/objectives', [{ id: 5, name: 'Founders Path', status: 'CONFIRMED', endsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), objectives: [
        { id: 51, name: 'Score 3 goals', total: 3, lockedBy: [], rewards: [] }, { id: 52, name: 'Win 2 matches', total: 2, lockedBy: [51], rewards: [] }] }])
      await go(c, '/ut/objectives', (p) => p.getByRole('article', { name: 'Haftalık ustalık' }).waitFor({ timeout: 20000 }))
      await shoot(c, 'ut-objectives-dolu', { fixture: 'KB grubu + yerel planlayıcı' })
      await scrolled(c, 'ut-objectives-dolu')
      await c.context.close()
    }

    if (want('ut-import')) {
      const anon = await newPage(w, h, theme, { mode: 'ut', auth: false })
      await go(anon, '/ut/import')
      await shoot(anon, 'ut-import-anonim')
      await anon.context.close()
      const c = await newPage(w, h, theme, { mode: 'ut' })
      await go(c, '/ut/import')
      await shoot(c, 'ut-import-bos')
      await c.page.locator('input[type=file][aria-label="Yakalama dosyası"]').setInputFiles(SAMPLE_CAPTURES)
      await c.page.getByRole('region', { name: 'Gönderilmeden önce özet' }).waitFor({ timeout: 20000 })
      await shoot(c, 'ut-import-ozet')
      await c.page.getByRole('button', { name: 'Gönder', exact: true }).click()
      await c.page.getByRole('region', { name: 'Özet' }).waitFor({ timeout: 30000 })
      await c.page.waitForLoadState('networkidle')
      await shoot(c, 'ut-import-dolu', { fixture: 'tests/fixtures/captures/sample-captures.json (gerçek işleme)' })
      await scrolled(c, 'ut-import-dolu')
      await c.page.route('**/api/v1/ut/capture', (route) => route.fulfill({ status: 422, json: { success: false, error: { code: 'fc.exception.0011', message: 'Yakalama işlenemedi: tanınan yanıt yok.' } } }))
      await go(c, '/ut/import')
      await c.page.locator('input[type=file][aria-label="Yakalama dosyası"]').setInputFiles(SAMPLE_CAPTURES)
      await c.page.getByRole('region', { name: 'Gönderilmeden önce özet' }).waitFor({ timeout: 20000 })
      await c.page.getByRole('button', { name: 'Gönder', exact: true }).click()
      await c.page.getByRole('alert').first().waitFor({ timeout: 20000 })
      await shoot(c, 'ut-import-hata', { fixture: '422 /ut/capture' }, true)
      await c.context.close()
    }

    if (want('teams')) {
      const c = await newPage(w, h, theme)
      await go(c, '/teams', (p) => p.getByRole('link', { name: 'Kariyer verisini içe aktar' }).waitFor({ timeout: 20000 }))
      await shoot(c, 'takimlar-bos')
      await fixture(c.page, `**/api/v1/careers/${career.id}/teams?**`, TEAMS)
      await fixture(c.page, `**/api/v1/careers/${career.id}/teams/*`, TEAM_PROFILE)
      await go(c, '/teams', (p) => p.getByRole('table', { name: 'Takımlar' }).waitFor({ timeout: 20000 }))
      await shoot(c, 'takimlar-dolu', { fixture: 'içe aktarılmış takımlar' })
      await go(c, '/teams?takim=101', (p) => p.getByText('Hücum ortalamanın üstünde').waitFor({ timeout: 20000 }))
      await shoot(c, `takimlar-profil-${mobile ? 'sheet' : 'panel'}`, { fixture: 'takım profili' })
      await c.page.unroute(`**/api/v1/careers/${career.id}/teams?**`)
      await fail(c.page, `**/api/v1/careers/${career.id}/teams?**`)
      await go(c, '/teams', (p) => p.getByText('Takımlar yüklenemedi.').waitFor({ timeout: 20000 }))
      await shoot(c, 'takimlar-hata', { fixture: 'teams 500' }, true)
      await c.context.close()
    }

    if (want('wonderkids')) {
      const c = await newPage(w, h, theme)
      await go(c, '/wonderkids', (p) => p.getByRole('table', { name: 'Genç yetenekler' }).waitFor({ timeout: 30000 }))
      await shoot(c, 'wonderkids-dolu')
      await scrolled(c, 'wonderkids-dolu')
      await go(c, '/wonderkids?mevki=ST&rol=poacher_attack&sirala=role', (p) => p.getByRole('table', { name: 'Genç yetenekler' }).waitFor({ timeout: 30000 }))
      await shoot(c, 'wonderkids-rol')
      await fixture(c.page, '**/api/v1/wonderkids**', [])
      await go(c, '/wonderkids', (p) => p.getByText(/Bu ölçütlerde genç yetenek yok/).waitFor())
      await shoot(c, 'wonderkids-bos', { fixture: 'wonderkids = []' })
      await c.page.unroute('**/api/v1/wonderkids**')
      await fail(c.page, '**/api/v1/wonderkids**')
      await go(c, '/wonderkids', (p) => p.getByText('Genç yetenekler yüklenemedi.').waitFor({ timeout: 20000 }))
      await shoot(c, 'wonderkids-hata', { fixture: 'wonderkids 500' }, true)
      await c.context.close()
    }

    if (want('compare')) {
      const empty = await newPage(w, h, theme)
      await go(empty, '/compare')
      await shoot(empty, 'karsilastir-bos')
      await empty.context.close()
      const c = await newPage(w, h, theme, { local: { 'fc.compare': compareList } })
      await go(c, '/compare', (p) => (mobile ? p.getByRole('region', { name: compareList[0].name }) : p.getByRole('table', { name: 'Yan yana karşılaştırma' })).waitFor({ timeout: 20000 }))
      await shoot(c, 'karsilastir-dolu')
      await scrolled(c, 'karsilastir-dolu', 900)
      await c.page.getByRole('button', { name: 'Uyumu hesapla' }).click()
      await c.page.getByRole('list', { name: 'Role göre uyum' }).waitFor({ timeout: 20000 })
      await c.page.getByRole('list', { name: 'Role göre uyum' }).scrollIntoViewIfNeeded()
      await shoot(c, 'karsilastir-rol-uyumu')
      await fail(c.page, '**/api/v1/players/*?**')
      await go(c, '/compare', (p) => p.getByText('Oyuncu verisi yüklenemedi.').waitFor({ timeout: 20000 }))
      await shoot(c, 'karsilastir-hata', { fixture: 'oyuncu detayı 500' }, true)
      await c.context.close()
    }

    if (want('regression')) {
      const c = await newPage(w, h, theme)
      await go(c, '/squad', (p) => p.locator('[data-pitch-slot][aria-label*=", "]').first().waitFor({ timeout: 30000 }))
      await shoot(c, 'regresyon-kadro-saha')
      await go(c, '/squad/builder', (p) => p.locator('[data-pitch-slot][aria-label*=", "]').first().waitFor({ timeout: 30000 }))
      await shoot(c, 'regresyon-kurucu')
      await go(c, '/career/desk')
      await shoot(c, 'regresyon-masa')
      await go(c, '/career/transfer')
      await shoot(c, 'regresyon-transfer')
      await go(c, `/players/${player.id}?sekme=roller`)
      await shoot(c, 'regresyon-oyuncu-roller')
      await c.context.close()
    }
  }
}
await browser.close()
writeFileSync(file('gates-report.json'), JSON.stringify({ report }, null, 2))
const bad = report.filter((r) => r.overflow || r.axeSeriousCritical || r.problems.length || (r.text && r.text.belowCount > 0) || (r.band && (!r.band.ok || r.band.surfaces.some((s) => s.alpha < 1))))
console.log(`${report.length} çekim; sorunlu ${bad.length}`)
bad.forEach((r) => console.log(' -', JSON.stringify(r).slice(0, 600)))
const mins = report.map((r) => r.text?.minFontPx).filter((v) => v !== null && v !== undefined)
console.log(` · sayfa minFont: en küçük ${Math.min(...mins)}px`)
process.exitCode = bad.length ? 1 : 0
