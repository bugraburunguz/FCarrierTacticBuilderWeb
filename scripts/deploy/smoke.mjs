// DEPLOY-01 8: duman testi. Kayıt / e-posta yapmaz (gerçek gönderim olur); yalnız okuma istekleri ve var olmayan hesapla giriş denemeleri.
// Kullanım:
//   node scripts/deploy/smoke.mjs https://<servis>.up.railway.app [--backend-public https://<backend>.up.railway.app] [--beta true|false]
//   node scripts/deploy/smoke.mjs http://localhost:8081 --beta false     (yerel compose)
// Hız sınırı denemesi giriş kovasını (dakikada 10) bu IP için ~1 dk doldurur.
const args = process.argv.slice(2)
const base = (args.find((a) => !a.startsWith('--') && /^https?:\/\//.test(a)) ?? '').replace(/\/+$/, '')
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const expectBeta = opt('--beta', 'true') === 'true'
const backendPublic = opt('--backend-public', undefined)
const AUTH_LIMIT = 10
if (!base) {
  console.error('Kullanım: node scripts/deploy/smoke.mjs <url> [--backend-public <url>] [--beta true|false]')
  process.exit(2)
}

const results = []
const check = async (name, fn) => {
  try {
    const detail = await fn()
    results.push({ name, ok: true, detail })
  } catch (e) {
    results.push({ name, ok: false, detail: e.message })
  }
}
const must = (cond, message) => {
  if (!cond) throw new Error(message)
}

await check('ana sayfa 200 + güvenlik başlıkları', async () => {
  const res = await fetch(`${base}/`)
  must(res.status === 200, `durum ${res.status}`)
  const h = (n) => res.headers.get(n) ?? ''
  const csp = h('content-security-policy')
  for (const part of ["default-src 'self'", "script-src 'self'", "frame-ancestors 'none'", "object-src 'none'"]) {
    must(csp.includes(part), `CSP'de yok: ${part}`)
  }
  must(h('x-content-type-options') === 'nosniff', 'nosniff yok')
  must(h('referrer-policy') !== '', 'Referrer-Policy yok')
  must(h('permissions-policy') !== '', 'Permissions-Policy yok')
  must(h('strict-transport-security').includes('max-age='), 'HSTS yok')
  must(!/nginx\/\d/.test(h('server')), 'Server başlığı sürüm sızdırıyor')
  return 'CSP, nosniff, Referrer, Permissions, HSTS'
})

await check('/privacy ve /about açılır', async () => {
  for (const path of ['/privacy', '/about']) {
    const res = await fetch(`${base}${path}`)
    must(res.status === 200, `${path} ${res.status}`)
  }
  return '200'
})

await check(`/api/v1/config/app freeBeta=${expectBeta}`, async () => {
  const body = await (await fetch(`${base}/api/v1/config/app`)).json()
  must(body?.data?.freeBeta === expectBeta, `freeBeta=${body?.data?.freeBeta}`)
  return JSON.stringify(body.data)
})

await check('oturumsuz /api/v1/me 401', async () => {
  const res = await fetch(`${base}/api/v1/me`)
  must(res.status === 401, `durum ${res.status}`)
  return '401'
})

await check('actuator dışarıdan görünmez / ayrıntısız', async () => {
  for (const path of ['/actuator/health', '/actuator/env', '/actuator/info', '/api/actuator/health']) {
    const res = await fetch(`${base}${path}`)
    const text = await res.text()
    must(!/"components"|"details"|"propertySources"|"activeProfiles"/.test(text), `${path} ayrıntı sızdırıyor`)
  }
  return 'web adresinde actuator JSON yok'
})

if (backendPublic) {
  await check('backend herkese açık değil', async () => {
    let status
    try {
      const res = await fetch(`${backendPublic.replace(/\/+$/, '')}/api/v1/config/app`, { signal: AbortSignal.timeout(8000) })
      status = res.status
      const text = await res.text()
      must(!text.includes('"freeBeta"'), `backend dışarıdan yanıt veriyor (${status})`)
    } catch (e) {
      if (e.message.startsWith('backend dışarıdan')) throw e
      return `bağlantı yok (${e.cause?.code ?? e.name})`
    }
    return `uygulama yanıtı yok (HTTP ${status})`
  })
}

await check('sahte X-Real-IP ile giriş hız sınırı aşılamaz', async () => {
  const statuses = []
  for (let i = 1; i <= AUTH_LIMIT + 3; i++) {
    const res = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Real-IP': `198.51.100.${i}`, 'X-Forwarded-For': `203.0.113.${i}` },
      body: JSON.stringify({ email: `smoke-yok-${i}@example.invalid`, password: 'yanlis-sifre-123' }),
    })
    statuses.push(res.status)
    if (res.status === 429) break
  }
  must(statuses.includes(429), `429 gelmedi (${statuses.join(',')}): edge istemcinin X-Real-IP'sini ezmiyor olabilir`)
  must(statuses.every((s) => s === 401 || s === 429), `beklenmeyen durum ${statuses.join(',')}`)
  return `${statuses.indexOf(429) + 1}. denemede 429`
})

for (const r of results) {
  console.log(`${r.ok ? 'GEÇTİ ' : 'KALDI '} ${r.name} — ${r.detail}`)
}
const failed = results.filter((r) => !r.ok).length
console.log(failed ? `${failed} kontrol kaldı` : `tümü geçti (${results.length})`)
process.exit(failed ? 1 : 0)
