// Tek geçici test hesabı altında birden çok gate komutu koşturur; hesap en sonda yerel DB'den silinir.
// Kullanım: node scripts/gate-session.mjs "ui-gates.mjs V3-04 squad/builder --auth ..." "q17.mjs ..." (her argüman ayrı bir scripts/ komutu)
import { spawnSync } from 'node:child_process'
import { createGateAccount } from './lib/gateAccount.mjs'

const base = 'http://localhost:8081'
await createGateAccount(base, 'gate-')
let failed = 0
for (const command of process.argv.slice(2)) {
  const parts = command.match(/(?:[^\s"']+|'[^']*'|"[^"]*")+/g).map((p) => p.replace(/^(['"])(.*)\1$/, '$2'))
  const run = spawnSync('node', [new URL(`./${parts[0]}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), ...parts.slice(1)], { stdio: 'inherit', env: process.env })
  failed += run.status === 0 ? 0 : 1
}
process.exit(failed > 0 ? 1 : 0)
