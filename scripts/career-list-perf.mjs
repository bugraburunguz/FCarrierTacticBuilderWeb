// V3-06a performans: kariyer oyuncu listesinde rol sıralaması (FitEngineV3, tüm süzülmüş havuz) ve kova süzgecinin yanıt süresi (p50/p95).
// Geçici test hesabıyla (yalnız localhost; koşu sonunda yalnız bu hesap silinir) Crewe Alexandra ve Port Vale kulüplerinde kariyer açar
// (havuz ≈ 22 bin oyuncu, kullanıcının kendi kayıtlarıyla aynı büyüklük). Her rol ilk kez istenir (önbellek ısınmamış), sonra 2. sayfa (önbellekten).
// Kullanım: node scripts/career-list-perf.mjs [--base http://localhost:8081]   Çıktı: Claude outputs/screens/V3-06a/perf-role-sort.json (repo dışı)
// Hız sınırı backend belleğinde (OPS-02, Redis yok): koşu 429 alırsa backend'i yeniden başlat (docker compose restart backend).
import { mkdirSync, writeFileSync } from 'node:fs'
import { createGateAccount } from './lib/gateAccount.mjs'
import { screensDir } from './lib/screensDir.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1 kullanılabilir.')
  process.exit(2)
}
const out = screensDir('V3-06a')
mkdirSync(out, { recursive: true })

await createGateAccount(base, 'gate-')
const login = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })
const token = (await login.json()).data.accessToken
const auth = { authorization: `Bearer ${token}` }
async function get(path) {
  const started = performance.now()
  const res = await fetch(`${base}/api/v1${path}`, { headers: auth })
  const body = await res.json()
  const ms = performance.now() - started
  if (res.status !== 200) throw new Error(`${path} → ${res.status}`)
  return { ms, data: body.data }
}
async function careerFor(clubName) {
  const club = (await (await fetch(`${base}/api/v1/clubs?q=${encodeURIComponent(clubName)}&limit=1&gender=0`)).json()).data[0]
  const res = await fetch(`${base}/api/v1/careers`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ clubId: club.id, name: `perf ${clubName}`, budgetEur: 5_000_000 }) })
  return { club: club.name, id: (await res.json()).data.id }
}
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b)
  return Math.round(s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)])
}
const stats = (xs) => ({ n: xs.length, p50: pct(xs, 50), p95: pct(xs, 95), max: Math.round(Math.max(...xs)) })

const roles = (await (await fetch(`${base}/api/v1/roles`)).json()).data
const report = { base, measuredAt: new Date().toISOString(), roles: roles.length, careers: [] }
for (const clubName of ['Crewe Alexandra', 'Port Vale']) {
  const career = await careerFor(clubName)
  const seed = await get(`/players?career=${career.id}&size=1`)
  const pool = seed.data.totalItems
  const firstPage = []
  const cachedPage = []
  for (const role of roles) {
    firstPage.push((await get(`/players?career=${career.id}&sort=role&role=${role.id}&size=48`)).ms)
    cachedPage.push((await get(`/players?career=${career.id}&sort=role&role=${role.id}&size=48&page=1`)).ms)
  }
  const bucket = []
  for (const b of ['ALINABILIR', 'ZOR', 'HAYAL', 'ALINABILIR&bucket=ZOR']) {
    bucket.push((await get(`/players?career=${career.id}&bucket=${b}&size=48`)).ms)
  }
  const combo = []
  for (const role of roles.slice(0, 12)) {
    combo.push((await get(`/players?career=${career.id}&sort=role&role=${role.id}&bucket=ALINABILIR&value_min=500000&age_max=25&size=48`)).ms)
  }
  const plain = []
  for (let page = 0; page < 10; page++) {
    plain.push((await get(`/players?career=${career.id}&size=48&page=${page}`)).ms)
  }
  report.careers.push({ club: career.club, pool, roleSortUncached: stats(firstPage), roleSortCachedPage2: stats(cachedPage), bucketFilter: stats(bucket), roleBucketValueAge: stats(combo), plainPageWithBucketColumn: stats(plain) })
  console.log(`${career.club} (havuz ${pool}): rol sıralaması önbelleksiz p95 ${stats(firstPage).p95} ms, önbellekli p95 ${stats(cachedPage).p95} ms, kova p95 ${stats(bucket).p95} ms, rol+kova+değer+yaş p95 ${stats(combo).p95} ms`)
}
writeFileSync(new URL('perf-role-sort.json', out), `${JSON.stringify(report, null, 2)}\n`)
const worst = Math.max(...report.careers.map((c) => c.roleSortUncached.p95))
console.log(worst <= 2000 ? `KAPI: rol sıralaması p95 ${worst} ms ≤ 2000 ms` : `KAPI KIRMIZI: rol sıralaması p95 ${worst} ms > 2000 ms`)
process.exitCode = worst <= 2000 ? 0 : 1
