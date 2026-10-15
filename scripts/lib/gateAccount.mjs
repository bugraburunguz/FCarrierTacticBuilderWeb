// Gate/Q17 betikleri için geçici test hesabı: koşu sonunda yerel docker DB'den teardown SQL'iyle silinir.
// Yalnız localhost/127.0.0.1. createGateAccount'un teardown'ı yalnız bu koşunun açtığı tek hesabı (tam e-posta, ^…$) siler (V3-05c);
// önek deseni (`gate-` / `q17-`) yalnız açıkça çağrılan toplu temizlik içindir.
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const BACKEND = fileURLToPath(new URL('../../../FCarrierTacticBuilderBackend/docker-compose.yml', import.meta.url))
const SQL = readFileSync(new URL('../teardown-gate-accounts.sql', import.meta.url), 'utf8')
export const GATE_PATTERN = '^(gate-|q17-)'

function assertLocal(base) {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
    throw new Error('Test hesabı yalnız localhost/127.0.0.1 için açılır ve silinir.')
  }
}

/** Tek hesabın tam eşleşme deseni: e-posta yalnız harf, rakam, '-', '@', '.' içerir (createGateAccount üretir); '.' kaçışlanır. */
export function exactEmailPattern(email) {
  if (!/^[a-z0-9-]+@[a-z0-9.-]+$/.test(email)) {
    throw new Error('Beklenmeyen test e-postası biçimi.')
  }
  return `^${email.replace(/\./g, '\\.')}$`
}

export function teardownGateAccounts(base, pattern = GATE_PATTERN) {
  assertLocal(base)
  const run = spawnSync('docker', ['compose', '-f', BACKEND, 'exec', '-T', 'postgres', 'sh', '-c', `psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v pattern='${pattern}' -f -`], { input: SQL, encoding: 'utf8' })
  if (run.status !== 0) {
    console.error('Test hesabı teardown başarısız:', run.stderr.trim().split('\n').slice(-2).join(' '))
    return false
  }
  console.log(`teardown: ${run.stdout.split('\n').find((l) => /^\s*\d+\s*\|\s*\d+/.test(l))?.trim() ?? 'tamam'} (silinen hesap | kariyer)`)
  return true
}

/**
 * Hesap + kariyer kurar ve GATE_EMAIL/GATE_PASSWORD ortam değişkenlerine yazar (yazdırılmaz). Süreç bitince (hata dahil) teardown çalışır.
 */
export async function createGateAccount(base, prefix) {
  assertLocal(base)
  const email = `${prefix}${Date.now()}@example.test`
  const password = `Gate-${randomBytes(18).toString('base64url')}!1a`
  const post = async (path, body, token) => {
    const res = await fetch(`${base}/api/v1${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
    return { status: res.status, body: await res.json().catch(() => ({})) }
  }
  const own = exactEmailPattern(email)
  process.on('exit', () => teardownGateAccounts(base, own))
  const reg = await post('/auth/register', { email, password })
  if (reg.status >= 300) throw new Error(`register ${reg.status}`)
  const token = (await post('/auth/login', { email, password })).body.data.accessToken
  const clubs = (await (await fetch(`${base}/api/v1/clubs?q=a&limit=20&gender=0`)).json()).data
  for (const club of clubs) {
    if ((await post('/careers', { clubId: club.id, name: 'gate' }, token)).status < 300) break
  }
  process.env.GATE_EMAIL = email
  process.env.GATE_PASSWORD = password
}
