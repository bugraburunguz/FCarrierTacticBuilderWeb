// DEPLOY-01 0b: nginx şablonu gerçek nginx:1.27-alpine içinde. Erişim logunda IP maskeli (IPv4 son oktet, IPv6 son 80 bit),
// sorgu dizesi (ör. doğrulama token'ı) yok; PORT ve backend adresi env'den. Docker gerekir.
// Çalıştır: node --test scripts/deploy/nginx.test.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, test } from 'node:test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const docker = (...args) => spawnSync('docker', args, { encoding: 'utf8' })
const html = mkdtempSync(join(tmpdir(), 'fc-nginx-'))
writeFileSync(join(html, 'index.html'), '<!doctype html><title>t</title>')
let id
let port

before(async () => {
  // Dosya yoksa docker bind mount boş dizin yaratır; önce dosya varlığını doğrula.
  for (const f of ['nginx.conf.template', 'nginx-security-headers.conf']) {
    assert.ok(statSync(join(root, f), { throwIfNoEntry: false })?.isFile(), `${f} yok`)
  }
  const run = docker('run', '-d', '--rm', '-p', '127.0.0.1::8080',
    '-e', 'PORT=8080', '-e', 'BACKEND_URL=http://127.0.0.1:9', '-e', 'NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1', '-e', 'TRUST_EDGE_REAL_IP=1',
    '-v', `${join(root, 'nginx.conf.template')}:/etc/nginx/templates/default.conf.template:ro`,
    '-v', `${join(root, 'nginx-security-headers.conf')}:/etc/nginx/snippets/security-headers.conf:ro`,
    '-v', `${html}:/usr/share/nginx/html:ro`, 'nginx:1.27-alpine')
  assert.equal(run.status, 0, run.stderr)
  id = run.stdout.trim()
  port = docker('port', id, '8080/tcp').stdout.trim().split(':').pop()
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/`)
      return
    } catch {
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  throw new Error(docker('logs', id).stderr)
})

after(() => id && docker('rm', '-f', id))

const hit = (path, realIp) => fetch(`http://127.0.0.1:${port}${path}`, { headers: realIp ? { 'X-Real-IP': realIp } : {} })
const logs = () => docker('logs', id).stdout

test('PORT env ile dinler, sayfa ve güvenlik başlıkları gelir', async () => {
  const res = await hit('/')
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/)
})

test('erişim logunda IP maskeli, sorgu dizesi yok', async () => {
  const cases = [
    ['203.0.113.57', '203.0.113.0', '203.0.113.57'],
    ['2001:db8:abcd:12:34:56:78:9a', '2001:db8:abcd::', '2001:db8:abcd:12'],
    ['2001:db8::1', '2001:db8::', '2001:db8::1 '],
    ['::ffff:198.51.100.23', '::ffff:198.51.100.0', '198.51.100.23'],
  ]
  for (const [ip] of cases) {
    await hit('/verify-email?token=gizli-token-123', ip)
  }
  await new Promise((r) => setTimeout(r, 300))
  const out = logs()
  for (const [ip, masked, raw] of cases) {
    assert.ok(out.includes(`${masked} `), `${ip} → ${masked} bekleniyordu:\n${out}`)
    assert.ok(!out.includes(raw), `${raw} logda görünmemeli`)
  }
  assert.ok(!out.includes('gizli-token-123'), 'sorgu dizesi logda olmamalı')
  assert.ok(out.includes('"GET /verify-email"'), 'istenen yol sorgusuz loglanır')
})

test('başlıksız istekte bağlantı adresi de maskelenir', async () => {
  await hit('/x-baslik-yok')
  await new Promise((r) => setTimeout(r, 300))
  const line = logs().split('\n').find((l) => l.includes('/x-baslik-yok'))
  assert.match(line, /^\d+\.\d+\.\d+\.0 /)
})
