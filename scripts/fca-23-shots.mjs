// FCA-23 kapıları: Maç Merkezi (yeni sayfa, tam matris 375/768/1280 × koyu/açık), Masa kartı ve FCA-22 not çubukları.
// Yerel backend Maç Merkezi uçlarını taşımıyorsa (404) "gercek" koşu boş/eksik durumu ölçer; "ornek" koşularında yalnız Maç Merkezi ve maç notu uçları
// tarayıcıda örnek veriyle yanıtlanır (page.route), başka istek değişmez. Kariyer yalnız koyu: açık tema seçiliyken de koyu çizilir (FCA-3 kararı).
// Ölçüm: taşma, axe serious/critical, konsol hatası, ağ 4xx-5xx (taklit edilen uçların 404'ü ayrı sayılır).
// Kullanım: node scripts/fca-23-shots.mjs [--base http://localhost:4173]. Yalnız localhost; test hesabı koşu sonunda silinir.
import { AxeBuilder } from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:4173'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const outDir = screensDir('FCA-23')
mkdirSync(outDir, { recursive: true })
const file = (n) => fileURLToPath(new URL(n, outDir))

await createGateAccount(base, 'gate-')
const session = (await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()).data
const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  if (res.status >= 300) {
    throw new Error(`${method} ${path} → ${res.status}`)
  }
  return text ? JSON.parse(text).data : undefined
}
const club = (await (await fetch(`${base}/api/v1/clubs?q=Crewe&limit=1&gender=0`)).json()).data[0]
const career = await api('POST', '/careers', { clubId: club.id, name: 'FCA-23 kapı', budgetEur: 5_000_000 })
await api('PATCH', `/careers/${career.id}`, { gameDate: '2027-03-10' })
const squad = await api('GET', `/careers/${career.id}/squad`)
const f442 = (await (await fetch(`${base}/api/v1/formations`)).json()).data.find((f) => f.id === '4-4-2')

const MOCKED = /\/careers\/\d+\/(match\/opponents(\/\d+\/(report|plan))?|players\/\d+\/matches)(\?|$)/
const RIVAL = 9001
const names = ['Ada', 'Bora', 'Cem', 'Deniz', 'Ege', 'Ferit', 'Gökhan', 'Hakan', 'İlker', 'Kaan', 'Levent']
const opponents = [
  { teamId: RIVAL, name: 'Kuzey Liman SK', leagueName: 'EFL League Two', overall: 66, sameLeague: true, competitionIds: [1512] },
  { teamId: 9002, name: 'Güney Kartalları', leagueName: 'EFL League Two', overall: 64, sameLeague: true, competitionIds: [1512] },
  { teamId: 9003, name: 'Doğu Rüzgârı', leagueName: 'EFL League One', overall: 70, sameLeague: false, competitionIds: [1513] },
]
const likelyEleven = f442.slots.map((s, i) => ({ slotId: s.slotId, position: s.position, playerId: 70000 + i, name: `${names[i]} Rakipoğlu`, overall: 60 + (i % 8), averageRating: i % 3 === 0 ? null : 6.4 + (i % 5) / 5 }))
const report = {
  teamId: RIVAL, name: 'Kuzey Liman SK', leagueName: 'EFL League Two',
  formation: { name: '4-4-2', matchedFormationId: '4-4-2', defaultFormation: true, slots: f442.slots.map((s, i) => ({ index: i, positionCode: i, position: s.position, roleCode: 10 + i })) },
  lines: { ours: { overall: 63, attack: 64, midfield: 62, defence: 63, matchdayOverall: 64 }, opponent: { overall: 66, attack: 68, midfield: 65, defence: 64, matchdayOverall: 66 } },
  buildUpPlay: 'Balanced', defensiveDepth: 55, likelyEleven,
  dangerousPlayers: likelyEleven.slice(8, 11).map((p, i) => ({ playerId: p.playerId, name: p.name, overall: p.overall, appearances: 24, goals: 11 - i * 3, assists: 3 + i, averageRating: 7.4 - i / 5 })),
  setPieces: { captain: { playerId: 70002, name: likelyEleven[2].name }, penaltyTaker: { playerId: 70009, name: likelyEleven[9].name }, freeKickTaker: { playerId: 70006, name: likelyEleven[6].name }, leftCornerTaker: { playerId: 70005, name: likelyEleven[5].name } },
  cardRisk: likelyEleven.slice(2, 5).map((p, i) => ({ playerId: p.playerId, name: p.name, appearances: 24, yellowCards: 8 - i, redCards: i === 0 ? 1 : 0 })),
  missing: [],
}
const ours = f442.slots.map((s, i) => ({ slot: s, player: squad[i]?.player })).filter((x) => x.player)
const plan = {
  opponentTeamId: RIVAL, ourFormation: { id: '4-4-2', source: 'TEAM_DEFAULT' },
  ourEleven: ours.map(({ slot, player }, i) => ({ slotId: slot.slotId, position: slot.position, playerId: player.id, name: player.name, overall: player.overall, combined: 60, lastRatings: i % 4 === 3 ? [] : [7, 8, 6, 7, 9].slice(0, 5 - (i % 3)), recentAverage: 7.1, restSuggested: i === 2 || i === 7 })),
  restCandidates: [2, 7].filter((i) => ours[i]).map((i) => ({ playerId: ours[i].player.id, name: ours[i].player.name, minutes: 270, matches: 3 })),
  tacticalNotes: [
    { code: 'KEY_THREAT', text: `${likelyEleven[8].name} sezonda 11 gol attı: ceza sahasında yakın markaj.` },
    { code: 'OPP_ATTACK_STRONG', text: 'Rakip hücum hattı bizim savunmadan 5 puan güçlü: blok derinliğini 45 altına indir.' },
    { code: 'ROTATE', text: 'İki oyuncu son 10 günde 3 maç oynadı: rotasyonu düşün.' },
  ],
  setPieces: { ourAerialThreats: ours.slice(2, 4).map(({ player }, i) => ({ playerId: player.id, name: player.name, score: 78 - i * 4 })), theirAerialThreats: likelyEleven.slice(2, 4).map((p, i) => ({ playerId: p.playerId, name: p.name, score: 80 - i * 3 })), ourCornerTaker: ours[5] && { playerId: ours[5].player.id, name: ours[5].player.name }, theirCornerTaker: { playerId: 70005, name: likelyEleven[5].name } },
  missing: [],
}
const partial = { ...report, dangerousPlayers: [], cardRisk: [], setPieces: null, missing: ['SEASON_STATS', 'SET_PIECES'] }
const playerMatches = { ratings: Array.from({ length: 12 }, (_, i) => ({ date: new Date(Date.UTC(2027, 2, 6 - i * 7)).toISOString().slice(0, 10), minutes: 90, position: 25, rating: [8, 7, 6, 9, 7, 5, 8, 7, 7, 6, 8, 9][i] })), seasons: [] }

function payload(url, variant) {
  if (/\/players\/\d+\/matches/.test(url)) return playerMatches
  if (/\/report/.test(url)) return variant === 'eksik' ? partial : report
  if (/\/plan/.test(url)) return variant === 'eksik' ? { ...plan, missing: ['MATCH_RATINGS'] } : plan
  return opponents
}

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
const RESOURCE_LINE = /^Failed to load resource:/
async function shot(name, path, w, theme, variant, act = undefined) {
  const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 812 : 900 }, hasTouch: w < 768 })
  const page = await context.newPage()
  if (variant) {
    await page.route(MOCKED, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: payload(route.request().url(), variant) }) }))
  }
  const errors = []
  let missing = 0
  page.on('console', (m) => m.type() === 'error' && !RESOURCE_LINE.test(m.text()) && errors.push(m.text()))
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 400) {
      if (MOCKED.test(new URL(r.url()).pathname) && r.status() === 404) missing += 1
      else errors.push(`${r.status()} ${r.url()}`)
    }
  })
  await page.goto(`${base}/`)
  await page.evaluate(({ c, s, t }) => {
    localStorage.setItem('fc.theme', t)
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.career', String(c))
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
  }, { c: career.id, s: session, t: theme })
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  if (act) {
    await act(page)
    await page.waitForTimeout(400)
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const axe = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)
  await page.screenshot({ path: file(`${name}-${theme}-${w}.png`) })
  await page.screenshot({ path: file(`${name}-${theme}-${w}-tam.png`), fullPage: true })
  results.push({ name, w, theme, overflow, axe, errors, mocked404: missing })
  await context.close()
}

const ready = (page) => page.getByRole('region', { name: 'Maç planı' }).getByRole('list', { name: 'Önerilen ilk 11' }).waitFor({ timeout: 10000 })
for (const theme of ['dark', 'light']) {
  for (const w of [375, 768, 1280]) {
    await shot('mac-merkezi-baslangic', '/career/match', w, theme, 'ornek')
    await shot('mac-merkezi-rakip', `/career/match?rakip=${RIVAL}`, w, theme, 'ornek', ready)
    await shot('masa', '/career/dashboard', w, theme, 'ornek')
  }
}
for (const w of [375, 1280]) {
  await shot('mac-merkezi-gercek', '/career/match', w, 'dark', undefined)
  await shot('mac-merkezi-eksik', `/career/match?rakip=${RIVAL}`, w, 'dark', 'eksik', ready)
  await shot('oyuncu-maclar', `/players/${squad[0].player.id}?sekme=maclar`, w, 'dark', 'ornek', (page) => page.locator('[data-rating-bar]').first().waitFor({ timeout: 10000 }))
}
await browser.close()

writeFileSync(file('gates.json'), JSON.stringify(results, null, 2))
for (const r of results) {
  console.log(`${r.name} ${r.theme} ${r.w}: taşma ${r.overflow}px · axe ${r.axe.join(',') || 'temiz'} · hata ${r.errors.length}${r.errors.length ? ` (${r.errors.slice(0, 2).join(' | ')})` : ''} · taklit uç 404 ${r.mocked404}`)
}
process.exit(results.some((r) => r.overflow > 0 || r.axe.length > 0 || r.errors.length > 0) ? 1 : 0)
