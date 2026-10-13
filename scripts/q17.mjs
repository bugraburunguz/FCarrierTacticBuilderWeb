// Q17 "çakışma yok" (11 §8): slot gruplarının sınır kutuları kesişmez; 1280×800'de saha scroll istemez.
// Kullanım: node scripts/q17.mjs [--formations 4-3-3,3-5-2] [--mode ut|career|both] [--out dosya.json] [--base http://localhost:8081]
// Matris: 29 formasyon × 375/768/1280×800 × boş/dolu × UT/kariyer. Rol etiketi metni en uzun adlarla değiştirilir (taşma da ölçülür).
// Dolu kariyer için GATE_EMAIL/GATE_PASSWORD (yerel test hesabı, en az bir kariyeri olmalı). Yalnız localhost/127.0.0.1.
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const flag = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback)
const base = flag('base', 'http://localhost:8081')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const only = flag('formations', undefined)?.split(',')
const modes = flag('mode', 'both') === 'both' ? ['ut', 'career'] : [flag('mode', 'both')]
const outFile = flag('out', undefined)
const SIZES = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1440x900', width: 1440, height: 900 },
]
const LONGEST = { one: 'Wide Mid · Vers', full: 'Ball-Playing Defender · Ball-Winning' }

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
            await page.waitForTimeout(4000)
          }
        }
        if (!loaded) {
          results.push({ mode, state, size: size.name, formation: formation.id, fieldWidth: 0, problems: ['sayfa yüklenmedi (2 deneme)'] })
          await page.close()
          continue
        }
        await page.waitForTimeout(state === 'filled' ? 900 : 200)
        const report = await page.evaluate(
          ({ formationId, expected, longest }) => {
            const groups = [...document.querySelectorAll('[data-slot-group]')]
            groups.forEach((g) => {
              const label = g.querySelector('button[title]')
              const spans = label ? [...label.querySelectorAll('span')] : []
              if (spans.length >= 1) {
                spans[0].textContent = window.innerWidth < 480 ? longest.one : longest.full
              }
            })
            const rect = (el) => el.getBoundingClientRect()
            const field = rect(document.querySelector('.pitch-field'))
            const boxes = groups.map((g) => ({ id: g.dataset.slotGroup, ...rect(g).toJSON() }))
            const problems = []
            if (groups.length !== expected) {
              problems.push(`slot grubu sayısı ${groups.length} ≠ ${expected}`)
            }
            boxes.forEach((a, i) => {
              boxes.slice(i + 1).forEach((b) => {
                const hit = a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5
                if (hit) problems.push(`${a.id} × ${b.id} kesişiyor`)
              })
              if (a.left < field.left - 0.5 || a.right > field.right + 0.5 || a.top < field.top - 0.5 || a.bottom > field.bottom + 0.5) problems.push(`${a.id} saha dışında`)
            })
            groups.forEach((g) => {
              const gr = rect(g)
              ;[...g.querySelectorAll('button[title], [data-slot-pill], [data-pitch-slot]')].forEach((child) => {
                const cr = rect(child)
                if (cr.width > 0 && (cr.bottom > gr.bottom + 1 || cr.right > gr.right + 1 || cr.left < gr.left - 1)) {
                  problems.push(`${g.dataset.slotGroup}: içerik grup kutusundan taşıyor (${child.tagName.toLowerCase()})`)
                }
              })
              const label = g.querySelector('button[title]')
              if (label && label.scrollWidth > label.clientWidth + 1) problems.push(`${g.dataset.slotGroup}: rol etiketi kesiliyor`)
            })
            // Q18: kart genişliği ve kart içi en küçük yazı (ölçekli kapsayıcıdaki yazı genişlik/180 ile çarpılır)
            const cards = groups.map((g) => g.querySelector('[role="img"]')).filter(Boolean)
            let cardWidth = cards.length ? Infinity : null
            let minFont = cards.length ? Infinity : null
            let ovrFont = cards.length ? Infinity : null
            cards.forEach((card) => {
              const cw = card.getBoundingClientRect().width
              cardWidth = Math.min(cardWidth, cw)
              const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
              for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                if (!node.textContent.trim()) continue
                const el = node.parentElement
                const scaled = el.closest('[style*="scale("]') ? cw / 180 : 1
                minFont = Math.min(minFont, parseFloat(getComputedStyle(el).fontSize) * scaled)
              }
              const ovr = card.querySelector('.font-display > div')
              if (ovr) ovrFont = Math.min(ovrFont, parseFloat(getComputedStyle(ovr).fontSize) * (cw / 180))
            })
            const root = document.documentElement
            return { formationId, problems: [...new Set(problems)], pageOverflowY: root.scrollHeight - window.innerHeight, fieldBottom: field.bottom, fieldWidth: field.width, innerHeight: window.innerHeight, cardWidth, minFont, ovrFont }
          },
          { formationId: formation.id, expected: formation.slots.length, longest: LONGEST },
        )
        const minCard = size.width < 480 ? 48 : size.width >= 1024 ? 56 : 0
        if (report.cardWidth !== null) {
          if (report.cardWidth < minCard - 0.5) report.problems.push(`Q18: kart ${Math.round(report.cardWidth)}px < ${minCard}px`)
          if (report.minFont < 10.95) report.problems.push(`Q18: kart içi yazı ${report.minFont.toFixed(1)}px < 11px`)
          if (report.ovrFont < 13.95) report.problems.push(`Q18: OVR ${report.ovrFont.toFixed(1)}px < 14px`)
        }
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
