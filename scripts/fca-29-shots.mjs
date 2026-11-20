// FCA-29 kapıları: Maç Merkezi kanat eşleşmesi kartı ve "Senin 11'in" başlığı (küçük değişiklik: 375 + 1280, koyu).
// Yalnız plan, rapor ve rakip listesi uçları tarayıcıda örnek veriyle yanıtlanır (page.route); hesap, kariyer ve kadro yerel backend'den.
// Ölçüm: taşma, axe serious/critical, konsol hatası, ağ 4xx-5xx.
// Kullanım: node scripts/fca-29-shots.mjs [--base http://localhost:4173]. Yalnız localhost; test hesabı koşu sonunda silinir.
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
const outDir = screensDir('FCA-29')
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
const career = await api('POST', '/careers', { clubId: club.id, name: 'FCA-29 kapı', budgetEur: 5_000_000 })
const squad = await api('GET', `/careers/${career.id}/squad`)
const f442 = (await (await fetch(`${base}/api/v1/formations`)).json()).data.find((f) => f.id === '4-4-2')

const MOCKED = /\/careers\/\d+\/match\/opponents(\/\d+\/(report|plan))?(\?|$)/
const RIVAL = 9001
const names = ['Ada', 'Bora', 'Cem', 'Deniz', 'Ege', 'Ferit', 'Gökhan', 'Hakan', 'İlker', 'Kaan', 'Levent']
const opponents = [{ teamId: RIVAL, name: 'Kuzey Liman SK', leagueName: 'EFL League Two', overall: 66, sameLeague: true, competitionIds: [1512] }]
const likelyEleven = f442.slots.map((s, i) => ({ slotId: s.slotId, position: s.position, playerId: 70000 + i, name: `${names[i]} Rakipoğlu`, overall: 60 + (i % 8), averageRating: 6.8 }))
const report = {
  teamId: RIVAL, name: 'Kuzey Liman SK', leagueName: 'EFL League Two',
  formation: { name: '4-4-2', matchedFormationId: '4-4-2', defaultFormation: true, slots: f442.slots.map((s, i) => ({ index: i, positionCode: i, position: s.position, roleCode: 10 + i })) },
  lines: { ours: { overall: 63, attack: 64, midfield: 62, defence: 63 }, opponent: { overall: 66, attack: 68, midfield: 65, defence: 64 } },
  buildUpPlay: 'Balanced', defensiveDepth: 55, likelyEleven,
  dangerousPlayers: [{ playerId: 70009, name: likelyEleven[9].name, overall: 67, appearances: 24, goals: 11, assists: 6, averageRating: 7.4 }],
  setPieces: {}, cardRisk: [], missing: [],
}
const ours = f442.slots.map((s, i) => ({ slot: s, player: squad[i]?.player })).filter((x) => x.player)
const bySlot = (pos) => ours.find((o) => o.slot.position === pos) ?? ours[0]
const theirBy = (pos) => likelyEleven.find((p) => p.position === pos) ?? likelyEleven[0]
const fp = (o, role, lean, pace) => ({ playerId: o.player.id, name: o.player.name, position: o.slot.position, roleId: 'r', role, focus: 'Attack', attackLean: lean, pace })
const tp = (p, role, lean, pace) => ({ playerId: p.playerId, name: p.name, position: p.position, roleId: 'r', role, focus: 'Balanced', attackLean: lean, pace })
const flanks = {
  left: {
    side: 'LEFT', verdict: 'EXPOSED', counter: false,
    ours: { players: [fp(bySlot('LB'), 'Fullback (Balanced)', 22, 76), fp(bySlot('LM'), 'Winger (Attack)', 61, 84)], attackLean: 42, defensiveCover: 29 },
    theirs: { players: [tp(theirBy('RB'), 'Fullback (Balanced)', 37, 80), tp(theirBy('RM'), 'Winger (Balanced)', 73, 86)], threat: 88, attackLean: 55, keyThreat: { playerId: theirBy('RM').playerId, name: theirBy('RM').name, threat: 88, pace: 86, goalsAssists: 9 } },
  },
  right: {
    side: 'RIGHT', verdict: 'OPPORTUNITY', counter: true,
    ours: { players: [fp(bySlot('RB'), 'Fullback (Defend)', 11, 74), fp(bySlot('RM'), 'Winger (Attack)', 61, 88)], attackLean: 36, defensiveCover: 44 },
    theirs: { players: [tp(theirBy('LB'), 'Attacking Wingback (Attack)', 74, 82), tp(theirBy('LM'), 'Winger (Balanced)', 50, 70)], threat: 70, attackLean: 62, keyThreat: { playerId: theirBy('LB').playerId, name: theirBy('LB').name, threat: 70, pace: 82, goalsAssists: 0 } },
  },
}
const plan = {
  opponentTeamId: RIVAL, ourFormation: { id: '4-4-2', source: 'MAIN_TACTIC' }, lineupSource: 'USER_LINEUP',
  ourEleven: ours.map(({ slot, player }) => ({ slotId: slot.slotId, position: slot.position, playerId: player.id, name: player.name, overall: player.overall, combined: 60, lastRatings: [7, 8, 6], recentAverage: 7.0, restSuggested: false })),
  restCandidates: [],
  tacticalNotes: [
    { code: 'KEY_THREAT', text: `${likelyEleven[9].name} sezonda 11 gol ve 6 asist yaptı: yakın markaj uygula, pas yollarını kapat.` },
    { code: 'FLANK_EXPOSED', text: `Sol kanadımız açık: rakibin sağ kanadında ${theirBy('RM').name} tehlikeli (tehdit 88, hız 86, 9 gol+asist) ve o taraf hücuma çıkıyor. Bizim ${bySlot('LM').player.name} Winger (Attack) rolüyle öne çıkıyor, kanadın savunma desteği 29: Balanced ya da Defend odağını seç veya ${bySlot('LB').player.name} savunmada kalsın.` },
    { code: 'FLANK_COUNTER', text: `Sağ kanatta fırsat: rakip bek ${theirBy('LB').name} hücuma çıkıyor (eğilim 74), arkası boş kalıyor. Hızlı ${bySlot('RM').player.name} (hız 88) ile kontra ve savunma arkasına koşu dene.` },
  ],
  setPieces: { ourAerialThreats: [], theirAerialThreats: [] }, flanks, missing: [],
}

function payload(url) {
  if (/\/report/.test(url)) return report
  if (/\/plan/.test(url)) return plan
  return opponents
}

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
const RESOURCE_LINE = /^Failed to load resource:/
for (const w of [375, 1280]) {
  const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 812 : 900 }, hasTouch: w < 768 })
  const page = await context.newPage()
  await page.route(MOCKED, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: payload(route.request().url()) }) }))
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !RESOURCE_LINE.test(m.text()) && errors.push(m.text()))
  page.on('response', (r) => r.url().includes('/api/') && r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`))
  await page.goto(`${base}/`)
  await page.evaluate(({ c, s }) => {
    localStorage.setItem('fc.theme', 'dark')
    localStorage.setItem('fc.mode', 'career')
    localStorage.setItem('fc.career', String(c))
    localStorage.setItem('fc.access', s.accessToken)
    localStorage.setItem('fc.refresh', s.refreshToken)
  }, { c: career.id, s: session })
  await page.goto(`${base}/career/match?rakip=${RIVAL}`, { waitUntil: 'networkidle' })
  const card = page.getByRole('group', { name: 'Kanat eşleşmesi' })
  await card.waitFor({ timeout: 10000 })
  await card.scrollIntoViewIfNeeded()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const axe = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)
  await page.screenshot({ path: file(`kanat-dark-${w}.png`) })
  await card.screenshot({ path: file(`kanat-kart-dark-${w}.png`) })
  await page.screenshot({ path: file(`mac-merkezi-dark-${w}-tam.png`), fullPage: true })
  results.push({ w, overflow, axe, errors })
  await context.close()
}
await browser.close()

writeFileSync(file('gates.json'), JSON.stringify(results, null, 2))
for (const r of results) {
  console.log(`kanat dark ${r.w}: taşma ${r.overflow}px · axe ${r.axe.join(',') || 'temiz'} · hata ${r.errors.length}${r.errors.length ? ` (${r.errors.slice(0, 2).join(' | ')})` : ''}`)
}
process.exit(results.some((r) => r.overflow > 0 || r.axe.length > 0 || r.errors.length > 0) ? 1 : 0)
