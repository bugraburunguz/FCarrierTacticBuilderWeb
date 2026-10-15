// Q17 "çakışma yok" (11 §8): slot gruplarının sınır kutuları kesişmez; 1280×800'de saha scroll istemez.
// Kullanım: node scripts/q17.mjs [--auto-account] [--formations 4-3-3,3-5-2] [--mode ut|career|both] [--out dosya.json] [--base http://localhost:8081]
// Matris: 29 formasyon × 375/768/1280×800 × boş/dolu × UT/kariyer. Rol etiketi metni en uzun adlarla değiştirilir (taşma da ölçülür).
// Dolu kariyer için GATE_EMAIL/GATE_PASSWORD (yerel test hesabı, en az bir kariyeri olmalı). Yalnız localhost/127.0.0.1.
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createGateAccount } from './lib/gateAccount.mjs'
import { LONGEST, measurePitch, q18Problems } from './lib/pitchGate.mjs'

// Dolu kariyerde oturumlu istekler önbelleğe alınmaz; yerel hız sınırı sayaçları (Redis, geçici) her boyutta ve yeniden denemede sıfırlanır
// (V3-05c: 348 kombinasyonda 389 "Rate limit exceeded" → "sayfa yüklenmedi"). Diğer kapı betikleriyle aynı yöntem.
const COMPOSE = fileURLToPath(new URL('../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
const resetRateLimits = () => spawnSync('docker', ['compose', '-f', COMPOSE, 'exec', '-T', 'redis', 'sh', '-c', 'for k in $(redis-cli --scan --pattern "fc:ratelimit:*"); do redis-cli del $k >/dev/null; done'], { encoding: 'utf8' })

const args = process.argv.slice(2)
const flag = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback)
const base = flag('base', 'http://localhost:8081')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
if (args.includes('--auto-account')) {
  await createGateAccount(base, 'q17-') // koşu sonunda yerel DB'den silinir (scripts/teardown-gate-accounts.sql)
}
const only = flag('formations', undefined)?.split(',')
const modes = flag('mode', 'both') === 'both' ? ['ut', 'career'] : [flag('mode', 'both')]
const outFile = flag('out', undefined)
const SIZES = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1536x864', width: 1536, height: 864 },
  { name: '1440x900', width: 1440, height: 900 },
]

const cache = new Map()
async function api(path) {
  const res = await fetch(`${base}/api/v1${path}`)
  return (await res.json()).data
}

const formations = await api('/formations')
const targets = formations.filter((f) => !only || only.includes(f.id))
const samples = new Map()
async function sampleFor(position) {
  if (!samples.has(position)) {
    await new Promise((r) => setTimeout(r, 400))
    const list = await api(`/players?pos=${position}&sort=overall&order=desc&size=14&gender=0`)
    samples.set(position, list.items)
  }
  return samples.get(position)
}
async function squadSample(formation) {
  const used = new Set()
  const picked = {}
  for (const slot of formation.slots) {
    const p = (await sampleFor(slot.position)).find((i) => !used.has(i.id))
    used.add(p.id)
    picked[slot.slotId] = { key: `p:${p.id}`, source: 'catalog', name: p.name, rating: p.overall, positions: p.positions, club: p.club, league: p.league, nationality: p.nationality, playerId: p.id, faceStats: p.faceStats, faceLabels: p.faceLabels, faceStatsSource: p.faceStatsSource, faceStatsApproximate: p.faceStatsApproximate }
  }
  return picked
}

let session
const browser = await chromium.launch({ channel: 'chrome', headless: true })
if (modes.includes('career') && process.env.GATE_EMAIL) {
  const probe = await browser.newContext()
  session = (await (await probe.request.post(`${base}/api/v1/auth/login`, { data: { email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD } })).json()).data
  await probe.close()
}

const results = []
for (const mode of modes) {
  for (const state of ['empty', 'filled']) {
    if (mode === 'career' && state === 'filled' && !session) {
      continue
    }
    for (const size of SIZES) {
      resetRateLimits()
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height } })
      // Anonim GET'ler bir kez alınır (hız sınırına takılmamak için); oturumlu istekler her seferinde gerçek.
      await context.route('**/api/v1/**', async (route) => {
        const req = route.request()
        const key = req.url()
        const authed = Boolean(req.headers().authorization)
        if (req.method() !== 'GET' || authed) {
          return route.continue()
        }
        if (!cache.has(key)) {
          const res = await route.fetch()
          if (res.status() >= 400) {
            return route.fulfill({ response: res })
          }
          cache.set(key, { status: res.status(), headers: res.headers(), body: await res.body() })
        }
        const hit = cache.get(key)
        return route.fulfill({ status: hit.status, headers: hit.headers, body: hit.body })
      })
      for (const formation of targets) {
        const page = await context.newPage()
        const picked = mode === 'ut' && state === 'filled' ? await squadSample(formation) : {}
        await page.addInitScript(
          ({ mode, formation, picked, session, careerFilled }) => {
            localStorage.setItem('fc.theme', 'dark')
            localStorage.setItem('fc.mode', mode)
            if (mode === 'ut') {
              localStorage.setItem('fc.utSquad', JSON.stringify({ formationId: formation, setup: { buildUp: 'Balanced', depth: 55 }, picked, roleOverride: {}, origin: 'manual' }))
            } else {
              localStorage.setItem('fc.tactic', JSON.stringify({ formation, slots: {} }))
              if (careerFilled && session) {
                localStorage.setItem('fc.access', session.accessToken)
                localStorage.setItem('fc.refresh', session.refreshToken)
              }
            }
          },
          { mode, formation: formation.id, picked, session, careerFilled: mode === 'career' && state === 'filled' },
        )
        let loaded = false
        for (let attempt = 0; attempt < 2 && !loaded; attempt += 1) {
          try {
            await page.goto(`${base}${mode === 'ut' ? '/ut/squad' : '/squad/builder'}?ui=v3`, { waitUntil: 'networkidle' })
            await page.waitForSelector('[data-slot-group]', { timeout: 15000 })
            loaded = true
          } catch {
            resetRateLimits()
            await page.waitForTimeout(4000)
          }
        }
        if (!loaded) {
          results.push({ mode, state, size: size.name, formation: formation.id, fieldWidth: 0, problems: ['sayfa yüklenmedi (2 deneme)'] })
          await page.close()
          continue
        }
        await page.waitForTimeout(state === 'filled' ? 900 : 200)
        // Ölçüm scripts/lib/pitchGate.mjs'te (SBC çözüm sahası kapısıyla ortak).
        const report = q18Problems(await page.evaluate(measurePitch, { formationId: formation.id, expected: formation.slots.length, longest: LONGEST }), size.width)
        // Scroll'suz sığma artık kapı değil, hedef: yalnız raporlanır.
        results.push({ mode, state, size: size.name, formation: formation.id, fieldWidth: Math.round(report.fieldWidth), cardWidth: report.cardWidth && Math.round(report.cardWidth), minFont: report.minFont && Number(report.minFont.toFixed(1)), ovrFont: report.ovrFont && Number(report.ovrFont.toFixed(1)), fitsViewport: report.fieldBottom <= report.innerHeight + 1, problems: report.problems })
        await page.close()
      }
      await context.close()
    }
  }
}
await browser.close()

const bad = results.filter((r) => r.problems.length > 0)
for (const size of SIZES.filter((z) => z.width >= 1024)) {
  const rows = results.filter((r) => r.size === size.name)
  console.log(`${size.name}: scroll'suz sığan ${rows.filter((r) => r.fitsViewport).length}/${rows.length}`)
}
console.log(`${results.length} kombinasyon; sorunlu: ${bad.length}`)
bad.slice(0, 40).forEach((r) => console.log(`${r.mode}/${r.state}/${r.size}/${r.formation}: ${r.problems.join('; ')}`))
if (outFile) {
  writeFileSync(outFile, JSON.stringify({ total: results.length, failed: bad.length, results }, null, 1) + '\n')
}
process.exit(bad.length > 0 ? 1 : 0)
